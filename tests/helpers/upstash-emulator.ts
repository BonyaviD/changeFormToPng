import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Just enough of Upstash's Redis REST API for the archive: hashes, DEL, and
 * the single-command and `/multi-exec` endpoints, with bearer-token auth.
 */
export interface UpstashEmulator {
  url: string;
  token: string;
  hashes: Map<string, Map<string, string>>;
  requests: number;
  close(): Promise<void>;
}

type Reply = { result: unknown } | { error: string };

export async function startUpstashEmulator(): Promise<UpstashEmulator> {
  const token = "emulator-token";
  const hashes = new Map<string, Map<string, string>>();
  const hash = (key: string) => {
    if (!hashes.has(key)) hashes.set(key, new Map());
    return hashes.get(key)!;
  };

  function run([name, ...args]: string[]): Reply {
    switch (String(name).toUpperCase()) {
      case "HSET": {
        const [key, ...pairs] = args;
        if (pairs.length === 0 || pairs.length % 2) return { error: "ERR wrong number of arguments for 'hset' command" };
        let added = 0;
        for (let i = 0; i < pairs.length; i += 2) {
          if (!hash(key).has(pairs[i])) added += 1;
          hash(key).set(pairs[i], pairs[i + 1]);
        }
        return { result: added };
      }
      case "HGET":
        return { result: hashes.get(args[0])?.get(args[1]) ?? null };
      case "HMGET":
        return { result: args.slice(1).map((field) => hashes.get(args[0])?.get(field) ?? null) };
      case "HDEL": {
        let removed = 0;
        for (const field of args.slice(1)) if (hashes.get(args[0])?.delete(field)) removed += 1;
        return { result: removed };
      }
      case "HLEN":
        return { result: hashes.get(args[0])?.size ?? 0 };
      case "HSCAN": {
        const [key, cursor, , count] = args;
        const entries = [...(hashes.get(key)?.entries() ?? [])];
        const start = Number(cursor);
        const end = Math.min(entries.length, start + Number(count ?? 10));
        return { result: [end >= entries.length ? "0" : String(end), entries.slice(start, end).flat()] };
      }
      case "DEL": {
        let removed = 0;
        for (const key of args) if (hashes.delete(key)) removed += 1;
        return { result: removed };
      }
      default:
        return { error: `ERR unknown command '${name}'` };
    }
  }

  const emulator: UpstashEmulator = { url: "", token, hashes, requests: 0, close: async () => {} };

  const server: Server = createServer(async (request, response) => {
    emulator.requests += 1;
    const send = (status: number, body: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (request.method !== "POST") return send(405, { error: "method not allowed" });
    if (request.headers.authorization !== `Bearer ${token}`) return send(401, { error: "Unauthorized" });
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw) as unknown;
    if (request.url === "/multi-exec" || request.url === "/pipeline") {
      return send(200, (body as string[][]).map(run));
    }
    const reply = run(body as string[]);
    return send("error" in reply ? 400 : 200, reply);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  emulator.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  emulator.close = () => new Promise((resolve) => server.close(() => resolve()));
  return emulator;
}

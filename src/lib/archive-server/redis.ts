/**
 * A minimal client for Upstash's Redis REST API — the store Vercel offers as
 * "Upstash for Redis". It is plain HTTPS, so no driver or connection pool is
 * needed in a serverless function, and no dependency is added.
 *
 * Wire format: POST a command as a JSON array (`["HGET", "key", "field"]`) and
 * get `{ result }` back, or `{ error }` with a non-2xx status. `/multi-exec`
 * takes an array of commands, runs them as one transaction and answers with an
 * array of `{ result, error }`.
 */

export interface RedisConfig {
  url: string;
  token: string;
}

/**
 * Vercel's Upstash integration sets the `KV_REST_API_*` pair; a database
 * created on upstash.com directly shows the `UPSTASH_REDIS_REST_*` pair.
 */
export function getRedisConfig(env: NodeJS.ProcessEnv = process.env): RedisConfig | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export type RedisArgument = string | number;

export class RedisError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RedisError";
  }
}

export class RedisRest {
  constructor(private readonly config: RedisConfig) {}

  async command<T = unknown>(...args: RedisArgument[]): Promise<T> {
    const body = await this.post("", args.map(String));
    const { result, error } = body as { result?: T; error?: string };
    if (error) throw new RedisError(error);
    return result as T;
  }

  /** Runs every command or none of them. */
  async transaction(commands: RedisArgument[][]): Promise<unknown[]> {
    const body = await this.post("/multi-exec", commands.map((command) => command.map(String)));
    if (!Array.isArray(body)) throw new RedisError(String((body as { error?: string }).error));
    return body.map(({ result, error }: { result?: unknown; error?: string }) => {
      if (error) throw new RedisError(error);
      return result;
    });
  }

  private async post(path: string, payload: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(this.config.url + path, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch (error) {
      throw new RedisError("The archive store could not be reached.", { cause: error });
    }
    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch (error) {
      throw new RedisError(`Unexpected reply from the archive store (${response.status}).`, { cause: error });
    }
    if (!response.ok) {
      throw new RedisError(String((body as { error?: string }).error ?? response.status));
    }
    return body;
  }
}

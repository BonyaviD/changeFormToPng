import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashPassword } from "../src/lib/auth/core";

async function main() {
  let username: string;
  let password: string;
  if (process.argv.includes("--stdin")) {
    // Automation reads a JSON object from stdin; credentials never go in argv.
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    ({ username, password } = JSON.parse(input));
  } else {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    username = (await rl.question("Username: ")).trim();
    rl.close();
    process.stdout.write("Password (hidden): ");
    const silent = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
    const hidden = createInterface({ input: process.stdin, output: silent, terminal: true });
    password = await hidden.question("");
    hidden.close();
    process.stdout.write("\n");
  }
  if (!username || username.length > 128 || !password || password.length < 12 || password.length > 256) {
    throw new Error("Use a username and a password of 12–256 characters.");
  }
  const fields = {
    SARA_AUTH_USERNAME: username,
    SARA_AUTH_PASSWORD_HASH: await hashPassword(password),
    SARA_SESSION_SECRET: randomBytes(32).toString("base64url"),
  };
  const original = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
  const retained = original.split(/\r?\n/).filter((line) => !/^SARA_(AUTH_USERNAME|AUTH_PASSWORD_HASH|SESSION_SECRET)=/.test(line));
  // Next's dotenv expansion treats $ specially. Escape the hash separators so
  // the stored scrypt hash survives loading without leaking any plaintext.
  const added = Object.entries(fields).map(([key, value]) => `${key}=${value.replace(/\$/g, "\\$")}`);
  writeFileSync(".env.local", [...retained, ...added, ""].join("\n"), { mode: 0o600 });
  console.log("Saved server-only credentials in ignored .env.local; password was not stored.");
}

main().catch(() => { console.error("Authentication setup failed. Check the input; no credentials were logged."); process.exitCode = 1; });

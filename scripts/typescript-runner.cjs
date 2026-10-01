/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS loader hook for tooling only. */
// Small tooling entry point using the TypeScript compiler already installed by
// Next.js. No runtime transpiler dependency is shipped with the application.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
// Mirror the `@/*` → `src/*` path alias from tsconfig.json.
const sourceRoot = path.resolve(__dirname, "../src");
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  const mapped = request.startsWith("@/") ? path.join(sourceRoot, request.slice(2)) : request;
  return resolveFilename.call(this, mapped, ...rest);
};
for (const file of process.argv.slice(2)) require(path.resolve(file));

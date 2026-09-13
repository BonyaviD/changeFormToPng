/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS loader hook for tooling only. */
// Small tooling entry point using the TypeScript compiler already installed by
// Next.js. No runtime transpiler dependency is shipped with the application.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
require(path.resolve(process.argv[2]));

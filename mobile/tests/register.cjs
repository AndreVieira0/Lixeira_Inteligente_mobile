// Transpile source in memory so node:test exercises the same TypeScript as the app.
const fs = require('node:fs');
const ts = require('typescript');

function transpile(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
}

require.extensions['.ts'] = transpile;
require.extensions['.tsx'] = transpile;

import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const serviceRoot = process.cwd();
const repoRoot = path.resolve(serviceRoot, '../..');
const entryPoint = path.resolve(serviceRoot, 'src/server.ts');

const compilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  skipLibCheck: true,
  outDir: path.resolve(serviceRoot, 'dist'),
  rootDir: repoRoot
};

const host = ts.createCompilerHost(compilerOptions);
const program = ts.createProgram([entryPoint], compilerOptions, host);
const emitResult = program.emit();

const diagnostics = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics);

if (diagnostics.length > 0) {
  const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: fileName => fileName,
    getCurrentDirectory: () => serviceRoot,
    getNewLine: () => '\n'
  });

  console.warn(formatted);
}

if (emitResult.emitSkipped) {
  process.exit(1);
}

import ts from 'typescript';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(frontend, 'src/app');
const failures = [];
const manifestPath = resolve(frontend, 'base/base-manifest.json');
if (existsSync(manifestPath)) {
  const base = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const parentPath = resolve(frontend, '../package.json');
  const parent = existsSync(parentPath) ? JSON.parse(readFileSync(parentPath, 'utf8')) : null;
  const workspace = parent?.workspaces?.includes('frontend') ? parent : JSON.parse(readFileSync(resolve(frontend, 'package.json'), 'utf8'));
  for (const [name, version] of Object.entries(base.dependencyOverrides ?? {})) {
    if (workspace.overrides?.[name] !== version) failures.push('Dependency override drift: ' + name);
  }
}
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(resolve(dir, entry.name)) : [resolve(dir, entry.name)]); }
for (const file of walk(root).filter(file => !file.endsWith('.spec.ts') && /\.(ts|html|css)$/.test(file))) {
  const name = relative(root, file).replaceAll('\\', '/');
  const source = readFileSync(file, 'utf8');
  const fail = message => failures.push(name + ': ' + message);
  if (name.startsWith('features/') && /#[0-9a-f]{3,8}\b/i.test(source)) fail('Use semantic color tokens');
  if (!file.endsWith('.ts')) continue;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (spec.startsWith('.')) {
        const target = resolve(dirname(file), spec).replaceAll('\\', '/');
        const own = name.startsWith('shared/ui/') ? resolve(root, 'shared/ui').replaceAll('\\', '/')
          : name.startsWith('core/platform/') ? resolve(root, 'core/platform').replaceAll('\\', '/') : null;
        if (own && target !== own && !target.startsWith(own + '/')) fail('Shared layer imports outside its public responsibility: ' + spec);
        if (name.startsWith('core/') && target.includes('/features/')) fail('Core cannot import product features');
        if (name === 'app.routes.ts' && target.includes('/features/')) fail('Product features must load through route boundaries');
      }
      if (name.startsWith('shared/ui/') && spec.includes('/http')) fail('UI must not issue HTTP requests');
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const called = node.expression.getText(ast);
      if (called === 'eval' || called === 'Function' || /bypassSecurityTrust/.test(called)) fail('Unsafe dynamic code or sanitization bypass');
      if (called === 'withNoXsrfProtection' && !name.startsWith('core/platform/')) fail('Register bounded CSRF through provideCookieSessionHttp');
      if (/\b(?:localStorage|sessionStorage)\.setItem$/.test(called)) fail('Do not persist client session or form state in this base');
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && /\.(?:innerHTML|outerHTML)$/.test(node.left.getText(ast))) fail('Do not assign external HTML directly');
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
if (failures.length) { failures.forEach(message => console.error(message)); process.exitCode = 1; }
else console.log('STD-FE-001: layer boundaries, lazy feature imports, tokens and bounded unsafe-code policies passed. This is not a complete SAST scan.');

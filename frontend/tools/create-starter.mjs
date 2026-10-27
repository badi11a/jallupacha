import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(frontend, 'base/base-manifest.json'), 'utf8'));
const digest = data => createHash('sha256').update(data).digest('hex');
const args = process.argv.slice(2);
const mode = args[0];
if (!['--output', '--check'].includes(mode) || args.length !== 2) throw new Error('Use --output <new-directory> or --check <consumer-directory>');
const output = resolve(args[1]);

function inside(root, file) {
  const rel = relative(root, file);
  if (isAbsolute(rel) || rel.split(sep).includes('..')) throw new Error('Path outside declared root');
}
function regularFile(root, file) {
  inside(root, file);
  let current = file;
  while (current !== root) {
    if (lstatSync(current).isSymbolicLink()) throw new Error('Symbolic links are not exportable');
    current = dirname(current);
  }
  if (lstatSync(root).isSymbolicLink() || !lstatSync(file).isFile()) throw new Error('Expected regular source file');
  inside(realpathSync(root), realpathSync(file));
  return readFileSync(file);
}
function walk(root, current = root) {
  if (lstatSync(current).isSymbolicLink()) throw new Error('Symbolic links are not exportable');
  return readdirSync(current, { withFileTypes: true }).flatMap(entry => {
    const file = join(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Symbolic links are not exportable');
    return entry.isDirectory() ? walk(root, file) : [file];
  });
}

if (mode === '--check') {
  const provenance = JSON.parse(regularFile(output, join(output, '.frontend-base.json')));
  if (provenance.name !== manifest.name || provenance.version !== manifest.version) throw new Error('Consumer needs an explicit version migration');
  const currentShared = manifest.sharedRoots.flatMap(root => walk(join(frontend, root)))
    .filter(file => !file.endsWith('.spec.ts')).map(file => relative(frontend, file).split(sep).join('/')).sort();
  if (JSON.stringify(Object.keys(provenance.sharedSources).sort()) !== JSON.stringify(currentShared)) {
    throw new Error('Shared source inventory changed; review migration');
  }
  for (const [name, hash] of Object.entries(provenance.files)) {
    if (digest(regularFile(output, resolve(output, name))) !== hash) throw new Error('Consumer modified: ' + name);
  }
  for (const [name, hash] of Object.entries(provenance.sharedSources)) {
    const declaredRoot = manifest.sharedRoots.find(root => name.startsWith(root + '/'));
    if (!declaredRoot) throw new Error('Unknown shared source');
    if (digest(regularFile(resolve(frontend, declaredRoot), resolve(frontend, name))) !== hash) throw new Error('Shared source changed; review migration: ' + name);
  }
  console.log('Consumer version and source provenance verified: ' + manifest.version);
} else {
  if (existsSync(output)) throw new Error('Destination already exists; never overwrite a consumer');
  const files = new Map();
  files.set('base/base-manifest.json', readFileSync(join(frontend, 'base/base-manifest.json')));
  const sharedSources = {};
  for (const root of manifest.sharedRoots) {
    inside(frontend, resolve(frontend, root));
    for (const file of walk(join(frontend, root))) {
      if (file.endsWith('.spec.ts')) continue;
      const name = relative(frontend, file).split(sep).join('/');
      const data = regularFile(frontend, file);
      files.set(name, data); sharedSources[name] = digest(data);
    }
  }
  const template = join(frontend, 'base/template');
  for (const file of walk(template)) {
    const name = relative(template, file).split(sep).join('/');
    if (/(?:^|\/)(?:\.env(?:\.|$)|node_modules|\.git(?:\/|$)|credentials?(?:[./]|$)|wallet(?:\/|$))/i.test(name)) throw new Error('Local configuration or credentials are not exportable');
    files.set(name, regularFile(template, file));
  }
  for (const name of ['tools/check-source.mjs', 'tools/check-sarif.mjs', 'scripts/check-contrast.mjs']) {
    files.set(name, regularFile(frontend, join(frontend, name)));
  }
  const pkg = JSON.parse(readFileSync(join(frontend, 'package.json'), 'utf8'));
  files.set('package.json', Buffer.from(JSON.stringify({ name: 'frontend-base-consumer', version: manifest.version, private: true,
    engines: pkg.engines, scripts: { start: 'ng serve --host 127.0.0.1', build: 'ng build', test: 'ng test --watch=false',
      'check:source': 'node tools/check-source.mjs', 'check:contrast': 'node scripts/check-contrast.mjs' },
    dependencies: pkg.dependencies, devDependencies: pkg.devDependencies, overrides: manifest.dependencyOverrides }, null, 2) + '\n'));
  for (const name of ['angular.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.spec.json']) {
    let data = readFileSync(join(frontend, name), 'utf8');
    if (name === 'angular.json') {
      const config = JSON.parse(data);
      const project = config.projects.jallupacha;
      project.architect.build.options.outputPath = 'dist/frontend-base';
      project.architect.build.options.fileReplacements = [];
      project.architect.build.configurations.development.fileReplacements = [];
      delete project.architect.serve.options;
      for (const entry of Object.values(project.architect.serve.configurations)) entry.buildTarget = entry.buildTarget.replace('jallupacha:', 'frontend-base:');
      config.projects = { 'frontend-base': project };
      data = JSON.stringify(config, null, 2) + '\n';
    }
    if (name === 'tsconfig.spec.json') { const config = JSON.parse(data); delete config.exclude; data = JSON.stringify(config, null, 2) + '\n'; }
    files.set(name, Buffer.from(data));
  }
  const lock = join(frontend, 'base/consumer-package-lock.json');
  if (existsSync(lock)) files.set('package-lock.json', readFileSync(lock));
  for (const name of manifest.publicEntries) if (!files.has(name)) throw new Error('Missing public entry: ' + name);
  const hashes = Object.fromEntries([...files].map(([name, data]) => [name, digest(data)]));
  mkdirSync(output);
  for (const [name, data] of files) { const target = join(output, name); inside(output, target); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, data, { flag: 'wx' }); }
  writeFileSync(join(output, '.frontend-base.json'), JSON.stringify({ name: manifest.name, version: manifest.version, files: hashes, sharedSources }, null, 2) + '\n', { flag: 'wx' });
  console.log('Created neutral frontend base ' + manifest.version + ': ' + output);
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const parent = resolve(frontend, '../.tmp'); mkdirSync(parent, { recursive: true });
const parentReal = realpathSync(parent);
if (!parentReal.startsWith(realpathSync(resolve(frontend, '..')) + sep)) throw new Error('Test directory must stay in the workspace');
function run(...args) { return spawnSync(process.execPath, [join(frontend, 'tools/create-starter.mjs'), ...args], { encoding: 'utf8' }); }
test('generates a neutral consumer with provenance, refuses overwrite and detects local drift/path traversal', () => {
  const temp = mkdtempSync(join(parentReal, 'base-generator-'));
  try {
    const output = join(temp, 'consumer');
    assert.equal(run('--output', output).status, 0);
    assert.equal(run('--check', output).status, 0);
    assert.notEqual(run('--output', output).status, 0);
    const angular = JSON.parse(readFileSync(join(output, 'angular.json'), 'utf8'));
    assert.deepEqual(Object.keys(angular.projects), ['frontend-base']);
    const provenance = JSON.parse(readFileSync(join(output, '.frontend-base.json'), 'utf8'));
    assert.ok(!Object.keys(provenance.files).some(name => name.includes('features/processes') || name.endsWith('.env')));
    const inventory = { ...provenance.sharedSources };
    delete provenance.sharedSources['src/app/core/platform/index.ts'];
    writeFileSync(join(output, '.frontend-base.json'), JSON.stringify(provenance));
    assert.notEqual(run('--check', output).status, 0);
    provenance.sharedSources = inventory;
    writeFileSync(join(output, '.frontend-base.json'), JSON.stringify(provenance));
    assert.equal(run('--check', output).status, 0);
    const entry = join(output, 'src/app/core/platform/index.ts');
    writeFileSync(entry, readFileSync(entry, 'utf8') + '\n// local customization\n');
    assert.notEqual(run('--check', output).status, 0);
    provenance.files = { '../outside.txt': 'untrusted' };
    writeFileSync(join(output, '.frontend-base.json'), JSON.stringify(provenance));
    assert.notEqual(run('--check', output).status, 0);
  } finally {
    const resolved = realpathSync(temp);
    if (dirname(resolved) !== parentReal || !resolved.startsWith(join(parentReal, 'base-generator-'))) throw new Error('Unsafe cleanup destination');
    rmSync(resolved, { recursive: true });
  }
});

test('security gate rejects high findings and missing analysis', () => {
  const temp = mkdtempSync(join(parentReal, 'base-generator-sarif-'));
  try {
    const check = () => spawnSync(process.execPath, [join(frontend, 'tools/check-sarif.mjs'), temp], { encoding: 'utf8' }).status;
    assert.notEqual(check(), 0);
    const report = severity => ({ runs: [{ tool: { driver: { rules: [{ id: 'example', properties: { 'security-severity': severity } }] } }, results: [{ ruleId: 'example', level: 'warning' }] }] });
    writeFileSync(join(temp, 'analysis.sarif'), JSON.stringify(report('5.0'))); assert.equal(check(), 0);
    writeFileSync(join(temp, 'analysis.sarif'), JSON.stringify(report('8.0'))); assert.notEqual(check(), 0);
    writeFileSync(join(temp, 'analysis.sarif'), JSON.stringify({ runs: [] })); assert.notEqual(check(), 0);
  } finally {
    const resolved = realpathSync(temp);
    if (dirname(resolved) !== parentReal || !resolved.startsWith(join(parentReal, 'base-generator-'))) throw new Error('Unsafe cleanup destination');
    rmSync(resolved, { recursive: true });
  }
});

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { compareGrants, parseRuntimeGrants, readRuntimeGrants, runtimeGrantStatements } from './grants';
import { SCHEMA_ID_GENERATORS } from './schema';

const srcDir = join(__dirname, '..');
const migrationsDir = join(__dirname, 'migrations');
const databaseDir = join(__dirname, '..', '..', 'database');
// Migrations applied before grants were centralized; they may still contain GRANT statements.
const LEGACY_GRANT_MIGRATIONS = new Set([
  '1740000000003-CreateMissingAuditTable.ts',
  '1740000000004-CreateProcessDrafts.ts',
  '1740000000005-CreateProcessRisks.ts'
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}

const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith('.ts')).sort();
const read = (path: string): string => readFileSync(path, 'utf8');
const declared = readRuntimeGrants();
const declaredObjects = new Set(declared.map((grant) => grant.object));
const allMatches = (text: string, pattern: RegExp): string[] => [...text.matchAll(pattern)].map((match) => match[1]);
const CREATED = /CREATE (?:TABLE|SEQUENCE) \$\{\w+\('([A-Z_]+)'\)\}/g;

describe('runtime grants', () => {
  const statements = runtimeGrantStatements('APP_RUNTIME', 'OWNER_SCHEMA');

  it('covers every base table the API uses, including sessions and security events', () => {
    for (const table of ['APP_SESSION', 'SECURITY_EVENT', 'SECURITY_EVENT_IP', 'USER_IDENTITY', 'USER_PROFILE', 'ADMIN_CONTROL', 'MACROPROCESS_CODE_SEQ']) {
      expect(statements.some((item) => item.includes(`"OWNER_SCHEMA"."${table}"`))).toBe(true);
    }
  });

  it('covers processes, versions, risks, catalogs and sequences', () => {
    for (const object of ['PROCESS', 'PROCESS_VERSION', 'PROCESS_CODE_SEQ', 'PROCESS_RISK', 'RISK_TYPE', 'RISK_LEVEL', 'PROCESS_TYPE', 'MACROPROCESS', 'AUDIT']) {
      expect(declaredObjects.has(object)).toBe(true);
    }
  });

  it('grants only table privileges to the runtime user and never system or migration objects', () => {
    for (const item of statements) {
      expect(item).toMatch(/^GRANT (SELECT|INSERT|UPDATE|DELETE)(, (SELECT|INSERT|UPDATE|DELETE))* ON "OWNER_SCHEMA"\."[A-Z_]+" TO "APP_RUNTIME"$/);
      expect(item).not.toContain('migrations');
    }
  });

  it('keeps sequences read-only and audit append-only', () => {
    for (const grant of declared.filter((item) => item.object.endsWith('_SEQ'))) {
      expect(grant.privileges).toEqual(['SELECT']);
    }
    expect(declared.find((item) => item.object === 'AUDIT')?.privileges).toEqual(['SELECT', 'INSERT']);
  });

  it('grants every table and sequence created by migrations and used by the code', () => {
    const created = [
      ...migrations.flatMap((name) => allMatches(read(join(migrationsDir, name)), CREATED)),
      ...SCHEMA_ID_GENERATORS.map((generator) => generator.sequence)
    ];
    expect(created.length).toBeGreaterThan(10);
    for (const object of created) expect(declaredObjects).toContain(object);

    const used = sourceFiles(srcDir).flatMap((file) => [
      ...allMatches(read(file), /qualifiedTable\('([A-Z_]+)'\)/g),
      ...allMatches(read(file), /@Entity\(\{ name: '([A-Z_]+)' \}\)/g)
    ]);
    expect(used.length).toBeGreaterThan(10);
    for (const object of used) expect(declaredObjects).toContain(object);
  });

  it('declares no grant for an object that no migration creates', () => {
    const created = new Set([
      ...migrations.flatMap((name) => allMatches(read(join(migrationsDir, name)), CREATED)),
      ...SCHEMA_ID_GENERATORS.map((generator) => generator.sequence)
    ]);
    created.add('AUDIT');
    for (const object of declaredObjects) expect(created).toContain(object);
  });

  it('keeps grants out of new migrations and consistent with legacy ones', () => {
    for (const name of migrations) {
      const text = read(join(migrationsDir, name));
      if (!LEGACY_GRANT_MIGRATIONS.has(name)) {
        expect(text).not.toMatch(/\bGRANT\b/);
        continue;
      }
      const legacy = [...text.matchAll(/GRANT ([A-Z, ]+) ON (?:\$\{table\('([A-Z_]+)'\)\}|\$\{table\})/g)];
      expect(legacy.length).toBeGreaterThan(0);
      for (const [, privileges, object] of legacy) {
        const expected = declared.find((grant) => grant.object === (object ?? 'AUDIT'));
        expect(expected?.privileges.join(', ')).toBe(privileges.trim());
      }
    }
  });

  it('keeps system privileges in grant-system.sql only', () => {
    expect(read(join(databaseDir, 'grant-runtime.sql'))).not.toMatch(/CREATE SESSION/i);
    const system = read(join(databaseDir, 'grant-system.sql')).split(/\r?\n/).filter((line) => /^GRANT\b/.test(line));
    expect(system).toEqual(['GRANT CREATE SESSION TO &&app_user;']);
  });

  it('rejects unsupported, malformed or duplicate grant lines', () => {
    expect(() => parseRuntimeGrants('GRANT CREATE SESSION TO &&app_user;')).toThrow();
    expect(() => parseRuntimeGrants('GRANT SELECT ON APP_USER TO PUBLIC;')).toThrow();
    expect(() => parseRuntimeGrants('GRANT ALL ON APP_USER TO &&app_user;')).toThrow();
    expect(() => parseRuntimeGrants('GRANT SELECT ON APP_USER TO &&app_user;\nGRANT INSERT ON APP_USER TO &&app_user;')).toThrow('Duplicate');
  });

  it('detects missing and excess privileges', () => {
    const grants = [{ object: 'AUDIT', privileges: ['SELECT', 'INSERT'] }];
    expect(compareGrants(grants, [{ object: 'AUDIT', privilege: 'SELECT' }, { object: 'AUDIT', privilege: 'INSERT' }]))
      .toEqual({ missing: [], excess: [] });
    expect(compareGrants(grants, [{ object: 'AUDIT', privilege: 'SELECT' }, { object: 'AUDIT', privilege: 'DELETE' }]))
      .toEqual({ missing: ['INSERT ON AUDIT'], excess: ['DELETE ON AUDIT'] });
  });
});

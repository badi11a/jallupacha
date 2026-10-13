import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../common/config';

const GRANT_LINE = /^GRANT\s+([A-Z, ]+?)\s+ON\s+([A-Z][A-Z0-9_]*)\s+TO\s+&&app_user;$/;
const ALLOWED_PRIVILEGES = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);

export interface RuntimeGrant {
  object: string;
  privileges: string[];
}

// grant-runtime.sql is the only source of object privileges; any other GRANT line is rejected.
export function parseRuntimeGrants(script: string): RuntimeGrant[] {
  const grants: RuntimeGrant[] = [];
  for (const raw of script.split(/\r?\n/)) {
    const line = raw.trim();
    if (!/^GRANT\b/i.test(line)) continue;
    const match = GRANT_LINE.exec(line);
    if (!match) throw new Error(`Unsupported statement in grant-runtime.sql: ${line}`);
    const privileges = match[1].split(',').map((item) => item.trim());
    if (!privileges.every((item) => ALLOWED_PRIVILEGES.has(item))) {
      throw new Error(`Unsupported privilege in grant-runtime.sql: ${line}`);
    }
    if (grants.some((grant) => grant.object === match[2])) {
      throw new Error(`Duplicate grant for ${match[2]} in grant-runtime.sql`);
    }
    grants.push({ object: match[2], privileges });
  }
  return grants;
}

export function readRuntimeGrants(): RuntimeGrant[] {
  return parseRuntimeGrants(readFileSync(join(__dirname, '..', '..', 'database', 'grant-runtime.sql'), 'utf8'));
}

export function runtimeGrantStatements(runtimeUser: string, schema: string): string[] {
  return readRuntimeGrants().map(
    (grant) => `GRANT ${grant.privileges.join(', ')} ON "${schema}"."${grant.object}" TO "${runtimeUser}"`
  );
}

export function compareGrants(
  declared: RuntimeGrant[],
  actual: Array<{ object: string; privilege: string }>
): { missing: string[]; excess: string[] } {
  const expected = new Set(declared.flatMap((grant) => grant.privileges.map((item) => `${item} ON ${grant.object}`)));
  const present = new Set(actual.map((row) => `${row.privilege} ON ${row.object}`));
  return {
    missing: [...expected].filter((item) => !present.has(item)),
    excess: [...present].filter((item) => !expected.has(item))
  };
}

// Runs as the schema owner; grants only on its own objects, never system privileges (see grant-system.sql).
export async function applyRuntimeGrants(source: DataSource): Promise<number> {
  const schema = process.env.ORACLE_SCHEMA?.trim().toUpperCase() ?? '';
  const runtimeUser = process.env.DATABASE_USER?.trim().toUpperCase() ?? '';
  if (!/^[A-Z][A-Z0-9_$#]{0,29}$/.test(schema) || !/^[A-Z][A-Z0-9_$#]{0,29}$/.test(runtimeUser)) {
    throw new Error('Invalid Oracle schema or runtime user configuration');
  }
  if (runtimeUser === schema || process.env.MIGRATION_USER?.trim().toUpperCase() !== schema) {
    throw new Error('Runtime grants require the schema owner connection and a separate DATABASE_USER');
  }
  const statements = runtimeGrantStatements(runtimeUser, schema);
  for (const statement of statements) await source.query(statement);

  const rows: Array<{ OBJECT_NAME: string; PRIVILEGE: string }> = await source.query(
    'SELECT TABLE_NAME AS OBJECT_NAME, PRIVILEGE FROM USER_TAB_PRIVS_MADE WHERE GRANTEE = :1',
    [runtimeUser]
  );
  const { missing, excess } = compareGrants(
    readRuntimeGrants(),
    rows.map((row) => ({ object: row.OBJECT_NAME, privilege: row.PRIVILEGE }))
  );
  if (missing.length || excess.length) {
    throw new Error(
      `Runtime grants differ from grant-runtime.sql. Missing: ${missing.join('; ') || 'none'}. ` +
      `Excess (revoke manually): ${excess.join('; ') || 'none'}.`
    );
  }
  return statements.length;
}
async function main(): Promise<void> {
  const source = new DataSource(databaseOptions(true));
  try {
    await source.initialize();
    const total = await applyRuntimeGrants(source);
    console.info(`Applied ${total} runtime grants from database/grant-runtime.sql.`);
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Runtime grants failed');
    process.exitCode = 1;
  });
}

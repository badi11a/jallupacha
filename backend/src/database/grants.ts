import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../common/config';

const GRANT_LINE = /^GRANT\s+([A-Z, ]+?)\s+ON\s+([A-Z][A-Z0-9_]*)\s+TO\s+&&app_user;$/;
const ALLOWED_PRIVILEGES = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);

export function runtimeGrantStatements(runtimeUser: string, schema: string): string[] {
  const script = readFileSync(join(__dirname, '..', '..', 'database', 'grant-runtime.sql'), 'utf8');
  const statements: string[] = [];
  for (const line of script.split(/\r?\n/)) {
    const match = GRANT_LINE.exec(line.trim());
    if (!match) continue;
    const privileges = match[1].split(',').map((item) => item.trim());
    if (!privileges.every((item) => ALLOWED_PRIVILEGES.has(item))) {
      throw new Error(`Unsupported privilege in grant-runtime.sql: ${line.trim()}`);
    }
    statements.push(`GRANT ${privileges.join(', ')} ON "${schema}"."${match[2]}" TO "${runtimeUser}"`);
  }
  return statements;
}

// Runs as the schema owner; grants only on its own objects, never system privileges.
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

import { DataSource } from 'typeorm';
import { requiredOracleIdentifier } from './mvp-v14-schema';

const TABLE_GRANTS = [
  ['MACROPROCESS_TYPE', 'SELECT'],
  ['MACROPROCESS', 'SELECT, INSERT, UPDATE'],
  ['PROCESS_TYPE', 'SELECT, INSERT, UPDATE'],
  ['ORGANIZATIONAL_UNIT', 'SELECT, INSERT, UPDATE'],
  ['PROCESS', 'SELECT, INSERT, UPDATE'],
  ['PROCESS_VERSION', 'SELECT, INSERT, UPDATE'],
  ['PROCESS_UNIT', 'SELECT, INSERT, UPDATE, DELETE'],
  ['PROCESS_RISK', 'SELECT, INSERT, UPDATE, DELETE'],
  ['PROCESS_RELATION', 'SELECT, INSERT, UPDATE, DELETE'],
  ['APP_USER', 'SELECT'],
  ['USER_IDENTITY', 'SELECT'],
  ['APP_PROFILE', 'SELECT'],
  ['USER_PROFILE', 'SELECT, INSERT, DELETE'],
  ['DEMO_IDENTITY', 'SELECT'],
  ['ADMIN_CONTROL', 'SELECT, UPDATE'],
  ['APP_SESSION', 'SELECT, INSERT, UPDATE, DELETE'],
  ['AUDIT', 'SELECT, INSERT'],
  ['SECURITY_EVENT', 'SELECT, INSERT'],
  ['SECURITY_EVENT_IP', 'SELECT, INSERT, UPDATE, DELETE']
] as const;

export async function applyMvpV14RuntimeGrants(source: DataSource): Promise<void> {
  const schema = requiredOracleIdentifier('ORACLE_SCHEMA');
  const runtimeUser = requiredOracleIdentifier('DATABASE_USER');
  if (schema === runtimeUser) throw new Error('DATABASE_USER must be separate from ORACLE_SCHEMA.');

  for (const [object, privileges] of TABLE_GRANTS) {
    await source.query(`GRANT ${privileges} ON "${schema}"."${object}" TO "${runtimeUser}"`);
  }
  await source.query(`GRANT SELECT ON "${schema}"."PROCESS_CODE_SEQ" TO "${runtimeUser}"`);
}

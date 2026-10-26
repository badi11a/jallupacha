export const SCHEMA_TABLES = [
  'PROCESS_RELATION',
  'PROCESS_UNIT',
  'PROCESS_RISK',
  'PROCESS_VERSION',
  'PROCESS',
  'ORGANIZATIONAL_UNIT',
  'PROCESS_TYPE',
  'MACROPROCESS',
  'MACROPROCESS_TYPE',
  // Tablas del modelo institucional de identidad, acceso y auditoria
  'LOCAL_CREDENTIAL',
  'SECURITY_EVENT_IP',
  'SECURITY_EVENT',
  'APP_SESSION',
  'AUDIT',
  'USER_PROFILE',
  'DEMO_IDENTITY',
  'USER_IDENTITY',
  'APP_PROFILE',
  'APP_USER',
  'ADMIN_CONTROL',
  'RISK_TYPE',
  'RISK_LEVEL',
  'migrations'
] as const;

export const SCHEMA_ID_GENERATORS = [
  { table: 'MACROPROCESS_TYPE', sequence: 'MPT_ID_SEQ', trigger: 'MPT_ID_BI' },
  { table: 'MACROPROCESS', sequence: 'MP_ID_SEQ', trigger: 'MP_ID_BI' },
  { table: 'PROCESS_TYPE', sequence: 'PT_ID_SEQ', trigger: 'PT_ID_BI' },
  { table: 'ORGANIZATIONAL_UNIT', sequence: 'OU_ID_SEQ', trigger: 'OU_ID_BI' },
  { table: 'PROCESS', sequence: 'PR_ID_SEQ', trigger: 'PR_ID_BI' },
  { table: 'PROCESS_VERSION', sequence: 'PV_ID_SEQ', trigger: 'PV_ID_BI' },
  { table: 'PROCESS_RISK', sequence: 'RK_ID_SEQ', trigger: 'RK_ID_BI' },
  { table: 'PROCESS_RELATION', sequence: 'RL_ID_SEQ', trigger: 'RL_ID_BI' }
] as const;

export const SCHEMA_SEQUENCES = [
  'PROCESS_CODE_SEQ',
  'MACROPROCESS_CODE_SEQ',
  ...SCHEMA_ID_GENERATORS.map(({ sequence }) => sequence)
] as const;

export function requiredOracleIdentifier(name: 'ORACLE_SCHEMA' | 'DATABASE_USER' | 'MIGRATION_USER'): string {
  const value = process.env[name]?.trim().toUpperCase();
  if (!value || !/^[A-Z][A-Z0-9_$#]{0,29}$/.test(value)) {
    throw new Error(`${name} must be a valid Oracle identifier`);
  }
  return value;
}

export const MVP_V14_TABLES = [
  'PROCESS_RELATION',
  'PROCESS_UNIT',
  'PROCESS_RISK',
  'PROCESS_VERSION',
  'PROCESS',
  'ORGANIZATIONAL_UNIT',
  'PROCESS_TYPE',
  'MACROPROCESS',
  'MACROPROCESS_TYPE',
  // Objects exclusively owned by the retired v13 model. They are included so
  // a clean v14 installation never leaves identity, session or audit data.
  'SECURITY_EVENT_IP',
  'SECURITY_EVENT',
  'APP_SESSION',
  'AUDIT',
  'USER_PROFILE',
  'DEMO_IDENTITY',
  'USER_IDENTITY',
  'APP_PROFILE',
  'APP_USER',
  'RISK_TYPE',
  'RISK_LEVEL',
  'ADMIN_CONTROL',
  'migrations'
] as const;

export const MVP_V14_SEQUENCES = [
  'PROCESS_CODE_SEQ',
  'MACROPROCESS_CODE_SEQ'
] as const;

export function requiredOracleIdentifier(name: 'ORACLE_SCHEMA' | 'DATABASE_USER' | 'MIGRATION_USER'): string {
  const value = process.env[name]?.trim().toUpperCase();
  if (!value || !/^[A-Z][A-Z0-9_$#]{0,29}$/.test(value)) {
    throw new Error(`${name} must be a valid Oracle identifier`);
  }
  return value;
}

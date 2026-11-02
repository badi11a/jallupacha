// Re-exported under the SCHEMA_* names used by the install/reset scripts.
// mvp-v14-schema.ts is the single source of truth (the migration itself depends on it);
// keeping a second hand-maintained copy here is what let TABLE_DROP_ORDER drift out of
// sync in reset-local.ts (see C-056 in docs/trazabilidad/correcciones.md).
export {
  MVP_V14_TABLES as SCHEMA_TABLES,
  MVP_V14_ID_GENERATORS as SCHEMA_ID_GENERATORS,
  MVP_V14_SEQUENCES as SCHEMA_SEQUENCES,
  requiredOracleIdentifier
} from './mvp-v14-schema';

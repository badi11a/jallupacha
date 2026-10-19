import { resolve } from 'node:path';

type OracleDriver = {
  initOracleClient(options?: { libDir?: string; configDir?: string }): void;
};

// node-oracledb 6.x in this project has no bundled TypeScript declaration.
// Use Node's typed require so ts-node and the production build behave equally.
const oracledb = require('oracledb') as OracleDriver;

let initialized = false;

/**
 * Enables Oracle Thick mode only when a client-library directory is configured.
 * It must run before TypeORM creates any Oracle connection or pool.
 */
export function initializeOracleClient(): void {
  if (initialized) return;

  const libDir = process.env.ORACLE_CLIENT_LIB_DIR?.trim();
  if (!libDir) return;

  const configuredDirectory = process.env.ORACLE_NET_CONFIG_DIR?.trim();
  const configDir = configuredDirectory ? resolve(configuredDirectory) : undefined;

  oracledb.initOracleClient({ libDir, configDir });
  initialized = true;
}

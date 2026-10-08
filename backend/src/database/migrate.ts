import 'dotenv/config';
import { AppDataSource } from './data-source';

async function migrate(): Promise<void> {
  try {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations({ transaction: 'all' });
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}

migrate().catch((error: unknown) => {
  console.error('Database migration failed. Check the Oracle connection and migration account.');
  console.error(error instanceof Error ? error.message : 'Unexpected migration error');
  process.exitCode = 1;
});

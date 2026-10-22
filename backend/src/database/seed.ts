import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions, validateDemoRuntime } from '../common/config';
import { qualifiedTable } from '../common/database';
import { hashPassword } from '../common/security';
import { DemoIdentityEntity } from '../identity/demo-identity.entity';
import { LocalCredentialEntity } from '../identity/local-credential.entity';
import { IdentityEntity } from '../identity/identity.entity';
import { ProfileEntity } from '../identity/profile.entity';
import { UserProfileEntity } from '../identity/user-profile.entity';
import { UserEntity } from '../identity/user.entity';
import { RiskLevelEntity } from '../risk/risk-level.entity';
import { RiskTypeEntity } from '../risk/risk-type.entity';
import { seedMvpV14 } from './mvp-v14-seed';

const PROFILES = [
  { code: 'ADMIN', name: 'Administrador' },
  { code: 'PROCESS_OWNER', name: 'Dueño de proceso' },
  { code: 'VALIDATOR', name: 'Revisor/Validador' },
  { code: 'RISK_MANAGER', name: 'Gestor de riesgos' },
  { code: 'CONSULTATION', name: 'Consulta' }
];

const RISK_TYPES = [
  'Operacional',
  'Estratégico',
  'Cumplimiento',
  'Tecnológico',
  'Financiero'
];

const RISK_LEVELS = ['Bajo', 'Medio', 'Alto', 'Crítico'];

const DEMO_USERS = [
  { name: 'Usuario administrador', email: 'admin@example.test', legacyEmail: 'demo-admin@example.test', profiles: ['ADMIN'] },
  { name: 'Usuario responsable', email: 'process-owner@example.test', legacyEmail: 'demo-owner@example.test', profiles: ['PROCESS_OWNER'] },
  { name: 'Usuario validador', email: 'validator@example.test', legacyEmail: 'demo-validator@example.test', profiles: ['VALIDATOR'] },
  { name: 'Usuario de riesgos', email: 'risk-manager@example.test', legacyEmail: 'demo-risk@example.test', profiles: ['RISK_MANAGER'] },
  { name: 'Usuario consulta', email: 'consultation@example.test', legacyEmail: 'demo-reader@example.test', profiles: ['CONSULTATION'] },
  { name: 'Usuario responsable y de riesgos', email: 'process-risk@example.test', legacyEmail: 'demo-multi@example.test', profiles: ['PROCESS_OWNER', 'RISK_MANAGER'] }
];

export async function seed(): Promise<void> {
  validateDemoRuntime(
    process.env.HOST ?? '',
    process.env.AUTH_MODE ?? '',
    process.env.NODE_ENV ?? ''
  );
  if (process.env.DEMO_DATA_ENABLED !== 'true') {
    throw new Error('Demo seed requires DEMO_DATA_ENABLED=true');
  }
  const source = new DataSource(databaseOptions(true) as never);
  try {
    await source.initialize();
    await source.transaction(async (manager) => {
      const profileRepository = manager.getRepository(ProfileEntity);
      for (const profile of PROFILES) {
        if (!(await profileRepository.findOneBy({ code: profile.code }))) {
          await profileRepository.insert(profile);
        }
      }

      const riskTypeRepository = manager.getRepository(RiskTypeEntity);
      for (const name of RISK_TYPES) {
        if (!(await riskTypeRepository.findOneBy({ name }))) {
          await riskTypeRepository.insert({ name, isActive: 1 });
        }
      }
      const riskLevelRepository = manager.getRepository(RiskLevelEntity);
      for (const name of RISK_LEVELS) {
        if (!(await riskLevelRepository.findOneBy({ name }))) {
          await riskLevelRepository.insert({ name, isActive: 1 });
        }
      }

      const users = manager.getRepository(UserEntity);
      const identities = manager.getRepository(IdentityEntity);
      const demoIdentities = manager.getRepository(DemoIdentityEntity);
      const assignments = manager.getRepository(UserProfileEntity);
      const hasSeededIdentities = (await demoIdentities.count()) > 0;
      for (const demo of DEMO_USERS) {
        let identity = await identities.findOneBy([
          { email: demo.email },
          { email: demo.legacyEmail }
        ]);
        if (identity && !(await demoIdentities.findOneBy({ userId: identity.userId }))) {
          identity = null;
        }
        if (!identity) {
          if (hasSeededIdentities) {
            throw new Error('A seeded local identity has an unrecognized email; refusing to create a duplicate.');
          }
          const user = await users.save(users.create({ isDemo: 1, isActive: 1 }));
          identity = await identities.save(identities.create({
            userId: user.id,
            displayName: demo.name,
            email: demo.email,
            provider: 'DEMO'
          }));
          await demoIdentities.insert({ userId: user.id });
          for (const profileCode of demo.profiles) {
            await assignments.insert({ userId: identity.userId, profileCode });
          }
        }
        const localCredentials = manager.getRepository(LocalCredentialEntity);
        const existingCred = await localCredentials.findOneBy({ userId: identity.userId });
        if (!existingCred) {
          const defaultPasswordHash = await hashPassword('ClaveDemo2026!');
          await localCredentials.insert({
            userId: identity.userId,
            passwordHash: defaultPasswordHash,
            failedAttempts: 0,
            lockedUntil: null
          });
        }
      }

      const processCount: Array<{ total: number | string }> = await manager.query(
        `SELECT COUNT(*) AS "total" FROM ${qualifiedTable('PROCESS')}`
      );
      if (Number(processCount[0].total) === 0) {
        await seedMvpV14(manager);
      } else {
        console.info('Generic process content was not loaded because processes already exist.');
      }
    });
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

if (require.main === module) {
  seed().catch((error: unknown) => {
    console.error('Database seed failed. Check the Oracle connection and migration account.');
    console.error(error instanceof Error ? error.message : 'Unexpected seed error');
    process.exitCode = 1;
  });
}

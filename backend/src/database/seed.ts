import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions, validateDemoRuntime } from '../common/config';
import { qualifiedTable } from '../common/database';
import { DemoIdentityEntity } from '../identity/demo-identity.entity';
import { IdentityEntity } from '../identity/identity.entity';
import { ProfileEntity } from '../identity/profile.entity';
import { UserProfileEntity } from '../identity/user-profile.entity';
import { UserEntity } from '../identity/user.entity';
import { MacroprocessEntity } from '../structure/macroprocess.entity';

const PROFILES = [
  { code: 'ADMIN', name: 'Administrador' },
  { code: 'PROCESS_OWNER', name: 'Dueño de proceso' },
  { code: 'RISK_MANAGER', name: 'Gestor de riesgos' },
  { code: 'CONSULTATION', name: 'Consulta' }
];

const MACROPROCESSES = [
  { name: 'Estratégicos', order: 1 },
  { name: 'Misionales', order: 2 },
  { name: 'de Apoyo', order: 3 }
];

const DEMO_USERS = [
  { name: 'Usuario administrador', email: 'admin@example.test', legacyEmail: 'demo-admin@example.test', profiles: ['ADMIN'] },
  { name: 'Usuario responsable', email: 'process-owner@example.test', legacyEmail: 'demo-owner@example.test', profiles: ['PROCESS_OWNER'] },
  { name: 'Usuario de riesgos', email: 'risk-manager@example.test', legacyEmail: 'demo-risk@example.test', profiles: ['RISK_MANAGER'] },
  { name: 'Usuario consulta', email: 'consultation@example.test', legacyEmail: 'demo-reader@example.test', profiles: ['CONSULTATION'] },
  { name: 'Usuario responsable y de riesgos', email: 'process-risk@example.test', legacyEmail: 'demo-multi@example.test', profiles: ['PROCESS_OWNER', 'RISK_MANAGER'] }
];

async function seed(): Promise<void> {
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

      const macroRepository = manager.getRepository(MacroprocessEntity);
      for (const macro of MACROPROCESSES) {
        if (!(await macroRepository.findOneBy({ name: macro.name }))) {
          const codes = await manager.query(
            `SELECT ${qualifiedTable('MACROPROCESS_CODE_SEQ')}.NEXTVAL AS "codeNumber" FROM DUAL`
          );
          await macroRepository.insert({
            code: `MP${codes[0].codeNumber}`,
            name: macro.name,
            description: null,
            order: macro.order,
            isActive: 1
          });
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
      }
    });
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('Database seed failed. Check the Oracle connection and migration account.');
  console.error(error instanceof Error ? error.message : 'Unexpected seed error');
  process.exitCode = 1;
});

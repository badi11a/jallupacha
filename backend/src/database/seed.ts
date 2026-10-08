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
  { name: 'Administración Demo', email: 'demo-admin@example.test', profiles: ['ADMIN'] },
  { name: 'Responsable Demo', email: 'demo-owner@example.test', profiles: ['PROCESS_OWNER'] },
  { name: 'Riesgos Demo', email: 'demo-risk@example.test', profiles: ['RISK_MANAGER'] },
  { name: 'Consulta Demo', email: 'demo-reader@example.test', profiles: ['CONSULTATION'] },
  { name: 'Responsable y Riesgos Demo', email: 'demo-multi@example.test', profiles: ['PROCESS_OWNER', 'RISK_MANAGER'] }
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
      for (const demo of DEMO_USERS) {
        let identity = await identities.findOneBy({ email: demo.email });
        if (!identity) {
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

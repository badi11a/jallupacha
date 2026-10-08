import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { databaseOptions, validateDemoRuntime } from '../common/config';
import { qualifiedTable } from '../common/database';
import { DemoIdentityEntity } from '../identity/demo-identity.entity';
import { IdentityEntity } from '../identity/identity.entity';
import { ProfileEntity } from '../identity/profile.entity';
import { UserProfileEntity } from '../identity/user-profile.entity';
import { UserEntity } from '../identity/user.entity';
import { MacroprocessEntity } from '../structure/macroprocess.entity';
import { ProcessTypeEntity } from '../structure/process-type.entity';
import { ProcessEntity } from '../process/process.entity';
import { ProcessVersionEntity } from '../process/process-version.entity';
import { RiskEntity } from '../risk/risk.entity';
import { RiskLevelEntity } from '../risk/risk-level.entity';
import { RiskTypeEntity } from '../risk/risk-type.entity';

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
  { name: 'Usuario de riesgos', email: 'risk-manager@example.test', legacyEmail: 'demo-risk@example.test', profiles: ['RISK_MANAGER'] },
  { name: 'Usuario consulta', email: 'consultation@example.test', legacyEmail: 'demo-reader@example.test', profiles: ['CONSULTATION'] },
  { name: 'Usuario responsable y de riesgos', email: 'process-risk@example.test', legacyEmail: 'demo-multi@example.test', profiles: ['PROCESS_OWNER', 'RISK_MANAGER'] }
];

interface GenericRiskContent {
  description: string;
  cause: string;
  consequence: string;
  type: string;
  level: string;
}

interface GenericProcessContent {
  type: string;
  name: string;
  description: string;
  objective: string;
  risk: GenericRiskContent;
}

interface GenericMacroprocessContent {
  name: string;
  processes: GenericProcessContent[];
}

interface GenericContentPackage {
  schemaVersion: number;
  macroprocesses: GenericMacroprocessContent[];
}

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
    const audit = new AuditService(source);
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

      const genericContent = loadGenericContent();
      const processTypeRepository = manager.getRepository(ProcessTypeEntity);
      const processTypeNames = new Set(genericContent.macroprocesses.flatMap(
        (macroprocess) => macroprocess.processes.map((process) => process.type)
      ));
      for (const name of processTypeNames) {
        if (!(await processTypeRepository.findOneBy({ name }))) {
          await processTypeRepository.insert({ name, isActive: 1 });
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
      }

      const processCount: Array<{ total: number | string }> = await manager.query(
        `SELECT COUNT(*) AS "total" FROM ${qualifiedTable('PROCESS')}`
      );
      if (Number(processCount[0].total) === 0) {
        await seedGenericProcesses(manager, audit, genericContent);
      } else {
        console.info('Generic process content was not loaded because processes already exist.');
      }
    });
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

async function seedGenericProcesses(
  manager: import('typeorm').EntityManager,
  audit: AuditService,
  content: GenericContentPackage
): Promise<void> {
  const macroRepository = manager.getRepository(MacroprocessEntity);
  const processTypeRepository = manager.getRepository(ProcessTypeEntity);
  const processRepository = manager.getRepository(ProcessEntity);
  const versionRepository = manager.getRepository(ProcessVersionEntity);
  const riskRepository = manager.getRepository(RiskEntity);
  const riskTypes = await manager.getRepository(RiskTypeEntity).find();
  const riskLevels = await manager.getRepository(RiskLevelEntity).find();
  const owners: Array<{ id: number | string }> = await manager.query(
    `SELECT U.ID AS "id"
     FROM ${qualifiedTable('APP_USER')} U
     JOIN ${qualifiedTable('USER_PROFILE')} UP ON UP.USER_ID = U.ID
     WHERE U.IS_ACTIVE = 1 AND UP.PROFILE_CODE = 'PROCESS_OWNER'
     ORDER BY U.ID`
  );
  const riskManagers: Array<{ id: number | string }> = await manager.query(
    `SELECT U.ID AS "id"
     FROM ${qualifiedTable('APP_USER')} U
     JOIN ${qualifiedTable('USER_PROFILE')} UP ON UP.USER_ID = U.ID
     WHERE U.IS_ACTIVE = 1 AND UP.PROFILE_CODE = 'RISK_MANAGER'
     ORDER BY U.ID FETCH FIRST 1 ROWS ONLY`
  );
  if (!owners.length || !riskManagers.length) {
    throw new Error('Generic content requires active process-owner and risk-manager identities.');
  }

  let processIndex = 0;
  for (const macroContent of content.macroprocesses) {
    const macroprocess = await macroRepository.findOneBy({ name: macroContent.name });
    if (!macroprocess || macroprocess.isActive !== 1) {
      throw new Error(`Generic content references an unavailable macroprocess: ${macroContent.name}`);
    }
    for (const processContent of macroContent.processes) {
      const processType = await processTypeRepository.findOneBy({ name: processContent.type });
      if (!processType || processType.isActive !== 1) {
        throw new Error(`Generic content references an unavailable process type: ${processContent.type}`);
      }
      const riskType = riskTypes.find((value) => value.name === processContent.risk.type && value.isActive === 1);
      const riskLevel = riskLevels.find((value) => value.name === processContent.risk.level && value.isActive === 1);
      if (!riskType || !riskLevel) {
        throw new Error('Generic content references an unavailable risk type or level.');
      }

      const sequence: Array<{ codeNumber: number | string }> = await manager.query(
        `SELECT ${qualifiedTable('PROCESS_CODE_SEQ')}.NEXTVAL AS "codeNumber" FROM DUAL`
      );
      const process = await processRepository.save(processRepository.create({
        code: `PR${Number(sequence[0].codeNumber)}`,
        ownerUserId: Number(owners[processIndex % owners.length].id),
        currentVersionId: null,
        isActive: 1
      }));
      const version = await versionRepository.save(versionRepository.create({
        processId: process.id,
        versionNumber: 1,
        status: 'Borrador',
        macroprocessId: macroprocess.id,
        processTypeId: processType.id,
        parentProcessId: null,
        name: processContent.name,
        description: processContent.description,
        objective: processContent.objective,
        revision: 1
      }));
      process.currentVersionId = version.id;
      await processRepository.save(process);
      await audit.record({
        actorUserId: process.ownerUserId,
        action: 'PROCESS_CREATED',
        entityType: 'PROCESS',
        entityId: String(process.id),
        afterValue: {
          code: process.code,
          ownerUserId: process.ownerUserId,
          versionNumber: version.versionNumber,
          status: version.status,
          macroprocessId: macroprocess.id,
          processTypeId: processType.id,
          name: version.name
        }
      }, manager);

      const risk = await riskRepository.save(riskRepository.create({
        processId: process.id,
        description: processContent.risk.description,
        cause: processContent.risk.cause,
        consequence: processContent.risk.consequence,
        riskTypeId: riskType.id,
        riskLevelId: riskLevel.id,
        createdByUserId: Number(riskManagers[0].id)
      }));
      await audit.record({
        actorUserId: Number(riskManagers[0].id),
        action: 'PROCESS_RISK_CREATED',
        entityType: 'PROCESS_RISK',
        entityId: String(risk.id),
        afterValue: {
          processId: process.id,
          description: risk.description,
          cause: risk.cause,
          consequence: risk.consequence,
          riskTypeId: risk.riskTypeId,
          riskLevelId: risk.riskLevelId
        }
      }, manager);
      processIndex += 1;
    }
  }
  console.info(`Loaded ${processIndex} generic processes and ${processIndex} associated risks.`);
}

function loadGenericContent(): GenericContentPackage {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(join(__dirname, 'generic-content.json'), 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read generic-content.json: ${error instanceof Error ? error.message : 'invalid file'}`);
  }
  if (!isGenericContentPackage(value)) {
    throw new Error('generic-content.json does not match the supported schema version.');
  }
  return value;
}

function isGenericContentPackage(value: unknown): value is GenericContentPackage {
  if (!isRecord(value) || value.schemaVersion !== 1 ||
    !Array.isArray(value.macroprocesses) || value.macroprocesses.length !== 3) return false;
  return value.macroprocesses.every((macroprocess) =>
    isRecord(macroprocess) &&
    isNonEmptyString(macroprocess.name) &&
    Array.isArray(macroprocess.processes) &&
    macroprocess.processes.length > 0 &&
    macroprocess.processes.every((process) =>
      isRecord(process) &&
      isNonEmptyString(process.type) &&
      isNonEmptyString(process.name) &&
      isNonEmptyString(process.description) &&
      isNonEmptyString(process.objective) &&
      isRecord(process.risk) &&
      isNonEmptyString(process.risk.description) &&
      isNonEmptyString(process.risk.cause) &&
      isNonEmptyString(process.risk.consequence) &&
      isNonEmptyString(process.risk.type) &&
      isNonEmptyString(process.risk.level)
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

if (require.main === module) {
  seed().catch((error: unknown) => {
    console.error('Database seed failed. Check the Oracle connection and migration account.');
    console.error(error instanceof Error ? error.message : 'Unexpected seed error');
    process.exitCode = 1;
  });
}

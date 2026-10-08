import { MigrationInterface, QueryRunner } from 'typeorm';

const SEEDED_IDENTITIES = [
  {
    oldName: 'Administración Demo',
    oldEmail: 'demo-admin@example.test',
    name: 'Usuario administrador',
    email: 'admin@example.test'
  },
  {
    oldName: 'Responsable Demo',
    oldEmail: 'demo-owner@example.test',
    name: 'Usuario responsable',
    email: 'process-owner@example.test'
  },
  {
    oldName: 'Riesgos Demo',
    oldEmail: 'demo-risk@example.test',
    name: 'Usuario de riesgos',
    email: 'risk-manager@example.test'
  },
  {
    oldName: 'Consulta Demo',
    oldEmail: 'demo-reader@example.test',
    name: 'Usuario consulta',
    email: 'consultation@example.test'
  },
  {
    oldName: 'Responsable y Riesgos Demo',
    oldEmail: 'demo-multi@example.test',
    name: 'Usuario responsable y de riesgos',
    email: 'process-risk@example.test'
  }
];

export class NormalizeSeedIdentityPresentation1740000000002 implements MigrationInterface {
  name = 'NormalizeSeedIdentityPresentation1740000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = tableName();
    for (const identity of SEEDED_IDENTITIES) {
      await queryRunner.query(
        `INSERT INTO ${table('AUDIT')}
          (ACTOR_USER_ID, ACTION, ENTITY_TYPE, ENTITY_ID, BEFORE_VALUE, AFTER_VALUE)
         SELECT NULL, 'SEED_PRESENTATION_NORMALIZED', 'USER_IDENTITY', TO_CHAR(I.USER_ID),
           '{"seedPresentation":"legacy"}', '{"seedPresentation":"standard"}'
         FROM ${table('USER_IDENTITY')} I
         JOIN ${table('APP_USER')} U ON U.ID = I.USER_ID
         WHERE I.EMAIL = :1 AND I.DISPLAY_NAME = :2 AND I.PROVIDER = 'DEMO'
           AND U.IS_DEMO = 1
           AND NOT EXISTS (
             SELECT 1 FROM ${table('USER_IDENTITY')} OTHER
             WHERE OTHER.EMAIL = :3 AND OTHER.USER_ID <> I.USER_ID
           )
           AND EXISTS (SELECT 1 FROM ${table('DEMO_IDENTITY')} D WHERE D.USER_ID = I.USER_ID)`,
        [identity.oldEmail, identity.oldName, identity.email]
      );
      await queryRunner.query(
        `UPDATE ${table('USER_IDENTITY')} I
         SET DISPLAY_NAME = :1, EMAIL = :2
         WHERE I.EMAIL = :3 AND I.DISPLAY_NAME = :4 AND I.PROVIDER = 'DEMO'
           AND NOT EXISTS (
             SELECT 1 FROM ${table('USER_IDENTITY')} OTHER
             WHERE OTHER.EMAIL = :5 AND OTHER.USER_ID <> I.USER_ID
           )
           AND EXISTS (
             SELECT 1 FROM ${table('APP_USER')} U
             JOIN ${table('DEMO_IDENTITY')} D ON D.USER_ID = U.ID
             WHERE U.ID = I.USER_ID AND U.IS_DEMO = 1
           )`,
        [identity.name, identity.email, identity.oldEmail, identity.oldName, identity.email]
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = tableName();
    for (const identity of SEEDED_IDENTITIES) {
      await queryRunner.query(
        `INSERT INTO ${table('AUDIT')}
          (ACTOR_USER_ID, ACTION, ENTITY_TYPE, ENTITY_ID, BEFORE_VALUE, AFTER_VALUE)
         SELECT NULL, 'SEED_PRESENTATION_REVERTED', 'USER_IDENTITY', TO_CHAR(I.USER_ID),
           '{"seedPresentation":"standard"}', '{"seedPresentation":"legacy"}'
         FROM ${table('USER_IDENTITY')} I
         JOIN ${table('APP_USER')} U ON U.ID = I.USER_ID
         WHERE I.EMAIL = :1 AND I.DISPLAY_NAME = :2 AND I.PROVIDER = 'DEMO'
           AND U.IS_DEMO = 1
           AND NOT EXISTS (
             SELECT 1 FROM ${table('USER_IDENTITY')} OTHER
             WHERE OTHER.EMAIL = :3 AND OTHER.USER_ID <> I.USER_ID
           )
           AND EXISTS (SELECT 1 FROM ${table('DEMO_IDENTITY')} D WHERE D.USER_ID = I.USER_ID)`,
        [identity.email, identity.name, identity.oldEmail]
      );
      await queryRunner.query(
        `UPDATE ${table('USER_IDENTITY')} I
         SET DISPLAY_NAME = :1, EMAIL = :2
         WHERE I.EMAIL = :3 AND I.DISPLAY_NAME = :4 AND I.PROVIDER = 'DEMO'
           AND NOT EXISTS (
             SELECT 1 FROM ${table('USER_IDENTITY')} OTHER
             WHERE OTHER.EMAIL = :5 AND OTHER.USER_ID <> I.USER_ID
           )
           AND EXISTS (
             SELECT 1 FROM ${table('APP_USER')} U
             JOIN ${table('DEMO_IDENTITY')} D ON D.USER_ID = U.ID
             WHERE U.ID = I.USER_ID AND U.IS_DEMO = 1
           )`,
        [identity.oldName, identity.oldEmail, identity.email, identity.name, identity.oldEmail]
      );
    }
  }
}

function tableName(): (name: string) => string {
  const schema = process.env.ORACLE_SCHEMA?.trim().toUpperCase();
  if (!schema || !/^[A-Z][A-Z0-9_$#]{0,29}$/.test(schema)) {
    throw new Error('ORACLE_SCHEMA must be a valid Oracle schema name');
  }
  return (name: string) => `"${schema}"."${name}"`;
}

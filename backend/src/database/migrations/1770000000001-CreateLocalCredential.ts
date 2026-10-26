import { MigrationInterface, QueryRunner } from 'typeorm';
import { requiredOracleIdentifier } from '../mvp-v14-schema';

export class CreateLocalCredential1770000000001 implements MigrationInterface {
  name = 'CreateLocalCredential1770000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = requiredOracleIdentifier('ORACLE_SCHEMA');
    const table = (name: string) => `"${schema}"."${name}"`;

    await queryRunner.query(`CREATE TABLE ${table('LOCAL_CREDENTIAL')} (
      USER_ID NUMBER PRIMARY KEY REFERENCES ${table('APP_USER')}(ID),
      PASSWORD_HASH VARCHAR2(255 CHAR) NOT NULL,
      FAILED_ATTEMPTS NUMBER(2) DEFAULT 0 NOT NULL,
      LOCKED_UNTIL TIMESTAMP WITH TIME ZONE,
      PASSWORD_UPDATED_AT TIMESTAMP WITH TIME ZONE DEFAULT (SYSTIMESTAMP AT TIME ZONE 'UTC') NOT NULL
    )`);
  }

  async down(): Promise<void> {
    throw new Error('The institutional schema is removed only by the explicit clean installer.');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

// SECURITY_EVENT.IP_ADDRESS was NOT NULL while the application stores IPs only in
// SECURITY_EVENT_IP (so they can be anonymized independently). Existing values are
// copied before the column is removed.
export class MoveSecurityEventIp1740000000001 implements MigrationInterface {
  name = 'MoveSecurityEventIp1740000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = tableName();
    await queryRunner.query(`INSERT INTO ${table('SECURITY_EVENT_IP')} (SECURITY_EVENT_ID, IP_ADDRESS)
      SELECT E.ID, E.IP_ADDRESS FROM ${table('SECURITY_EVENT')} E
      WHERE NOT EXISTS (
        SELECT 1 FROM ${table('SECURITY_EVENT_IP')} P WHERE P.SECURITY_EVENT_ID = E.ID
      )`);
    const missing = await queryRunner.query(`SELECT COUNT(*) AS "count" FROM ${table('SECURITY_EVENT')} E
      WHERE NOT EXISTS (
        SELECT 1 FROM ${table('SECURITY_EVENT_IP')} P WHERE P.SECURITY_EVENT_ID = E.ID
      )`);
    if (Number(missing[0].count ?? missing[0].COUNT) !== 0) {
      throw new Error('SECURITY_EVENT IP backfill incomplete; column not dropped');
    }
    await queryRunner.query(`ALTER TABLE ${table('SECURITY_EVENT')} DROP COLUMN IP_ADDRESS`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = tableName();
    await queryRunner.query(`ALTER TABLE ${table('SECURITY_EVENT')} ADD IP_ADDRESS VARCHAR2(64 CHAR)`);
    await queryRunner.query(`UPDATE ${table('SECURITY_EVENT')} E
      SET IP_ADDRESS = COALESCE(
        (SELECT P.IP_ADDRESS FROM ${table('SECURITY_EVENT_IP')} P WHERE P.SECURITY_EVENT_ID = E.ID),
        'unknown'
      )`);
    await queryRunner.query(`ALTER TABLE ${table('SECURITY_EVENT')} MODIFY IP_ADDRESS NOT NULL`);
  }
}

function tableName(): (name: string) => string {
  const schema = process.env.ORACLE_SCHEMA?.trim().toUpperCase();
  if (!schema || !/^[A-Z][A-Z0-9_$#]{0,29}$/.test(schema)) {
    throw new Error('ORACLE_SCHEMA must be a valid Oracle schema name');
  }
  return (name: string) => `"${schema}"."${name}"`;
}

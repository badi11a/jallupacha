import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { qualifiedTable as table } from '../common/database';
import { runDatabaseOperation } from '../common/database-operation';
import { asBody, Body, oneOf, rejectUnknownKeys, requiredText, RISK_LEVELS } from '../common/input-validation';
import { Row } from '../common/database-values';

@Injectable()
export class ProcessRisksService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) { }

  addRisk(processId: number, raw: unknown): Promise<unknown> {
    const risk = this.readRisk(asBody(raw));
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      await this.assertProcessExists(manager, processId, 'El proceso');
      await this.insertRisk(manager, processId, risk);
      const rows: Row[] = await manager.query(`SELECT MAX(ID) AS "id" FROM ${table('PROCESS_RISK')} WHERE PROCESS_ID = :1`, [processId]);
      return { id: Number(rows[0].id) };
    }));
  }

  updateRisk(processId: number, riskId: number, raw: unknown): Promise<unknown> {
    const risk = this.readRisk(asBody(raw));
    return runDatabaseOperation(async () => {
      const exists: Row[] = await this.dataSource.query(`SELECT ID FROM ${table('PROCESS_RISK')} WHERE ID = :1 AND PROCESS_ID = :2`, [riskId, processId]);
      if (exists.length !== 1) throw new NotFoundException('Riesgo no encontrado.');
      await this.dataSource.query(
        `UPDATE ${table('PROCESS_RISK')} SET DESCRIPTION = :1, CAUSE = :2, CONSEQUENCE = :3, RISK_TYPE = :4, RISK_LEVEL = :5 WHERE ID = :6`,
        [risk.description, risk.cause, risk.consequence, risk.type, risk.level, riskId]
      );
      return { id: riskId };
    });
  }

  deleteRisk(processId: number, riskId: number): Promise<void> {
    return runDatabaseOperation(async () => {
      const exists: Row[] = await this.dataSource.query(`SELECT ID FROM ${table('PROCESS_RISK')} WHERE ID = :1 AND PROCESS_ID = :2`, [riskId, processId]);
      if (exists.length !== 1) throw new NotFoundException('Riesgo no encontrado.');
      await this.dataSource.query(`DELETE FROM ${table('PROCESS_RISK')} WHERE ID = :1`, [riskId]);
    });
  }

  private readRisk(body: Body): { description: string; cause: string; consequence: string; type: string; level: string } {
    rejectUnknownKeys(body, ['description', 'cause', 'consequence', 'type', 'level']);
    if (body.level === undefined || body.level === null || body.level === '') throw new BadRequestException('El nivel de riesgo es obligatorio.');
    return {
      description: requiredText(body, 'description', 'Descripción del riesgo', 4000),
      cause: requiredText(body, 'cause', 'Causa', 4000),
      consequence: requiredText(body, 'consequence', 'Consecuencia', 4000),
      type: requiredText(body, 'type', 'Tipo de riesgo', 120),
      level: oneOf(body.level, RISK_LEVELS, 'El nivel de riesgo')
    };
  }

  private async insertRisk(manager: EntityManager, processId: number, risk: { description: string; cause: string; consequence: string; type: string; level: string }): Promise<void> {
    await manager.query(
      `INSERT INTO ${table('PROCESS_RISK')} (PROCESS_ID, DESCRIPTION, CAUSE, CONSEQUENCE, RISK_TYPE, RISK_LEVEL) VALUES (:1, :2, :3, :4, :5, :6)`,
      [processId, risk.description, risk.cause, risk.consequence, risk.type, risk.level]
    );
  }

  private async assertProcessExists(manager: EntityManager, processId: number, label: string): Promise<void> {
    const rows: Row[] = await manager.query(`SELECT ID FROM ${table('PROCESS')} WHERE ID = :1 AND IS_ACTIVE = 1`, [processId]);
    if (rows.length !== 1) throw new BadRequestException(`${label} no existe.`);
  }
}

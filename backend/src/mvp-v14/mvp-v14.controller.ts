import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CurrentUser, Public } from '../common/auth.decorator';
import { AuthenticatedUser } from '../common/auth.types';
import { qualifiedTable } from '../common/database';
import { MvpV14Service } from './mvp-v14.service';

interface MapRow {
  macroprocessTypeId: number | string;
  macroprocessTypeName: string;
  macroprocessTypeOrder: number | string;
  macroprocessId: number | string;
  macroprocessCode: string;
  macroprocessName: string;
  macroprocessOrder: number | string;
  processTypeId: number | string | null;
  processTypeName: string | null;
  processId: number | string | null;
  processCode: string | null;
  processName: string | null;
  status: string | null;
}

@Public()
@Controller('mvp-v14')
export class MvpV14Controller {
  constructor(private readonly dataSource: DataSource, private readonly service: MvpV14Service) {}

  @Get('map')
  async map(): Promise<{ macroprocessTypes: unknown[] }> {
    const table = qualifiedTable;
    const rows: MapRow[] = await this.dataSource.query(`
      SELECT MT.ID AS "macroprocessTypeId", MT.NAME AS "macroprocessTypeName", MT.SORT_ORDER AS "macroprocessTypeOrder",
             M.ID AS "macroprocessId", M.CODE AS "macroprocessCode", M.NAME AS "macroprocessName", M.SORT_ORDER AS "macroprocessOrder",
             PT.ID AS "processTypeId", PT.NAME AS "processTypeName",
             P.ID AS "processId", P.CODE AS "processCode", V.NAME AS "processName", V.STATUS AS "status"
      FROM ${table('MACROPROCESS_TYPE')} MT
      JOIN ${table('MACROPROCESS')} M ON M.MACROPROCESS_TYPE_ID = MT.ID AND M.IS_ACTIVE = 1
      LEFT JOIN ${table('PROCESS_TYPE')} PT ON PT.MACROPROCESS_ID = M.ID AND PT.IS_ACTIVE = 1
      LEFT JOIN ${table('PROCESS_VERSION')} V ON V.MACROPROCESS_ID = M.ID AND V.PROCESS_TYPE_ID = PT.ID
      LEFT JOIN ${table('PROCESS')} P ON P.CURRENT_VERSION_ID = V.ID AND P.IS_ACTIVE = 1
      WHERE MT.IS_ACTIVE = 1
      ORDER BY MT.SORT_ORDER, M.SORT_ORDER, PT.NAME, P.CODE
    `);
    const types = new Map<number, { id: number; name: string; order: number; macroprocesses: unknown[] }>();
    const macros = new Map<number, { id: number; code: string; name: string; order: number; processTypes: unknown[] }>();
    const processTypes = new Map<number, { id: number; name: string; processes: unknown[] }>();
    for (const row of rows) {
      const typeId = Number(row.macroprocessTypeId);
      if (!types.has(typeId)) types.set(typeId, { id: typeId, name: row.macroprocessTypeName, order: Number(row.macroprocessTypeOrder), macroprocesses: [] });
      const macroId = Number(row.macroprocessId);
      if (!macros.has(macroId)) {
        const macro = { id: macroId, code: row.macroprocessCode, name: row.macroprocessName, order: Number(row.macroprocessOrder), processTypes: [] };
        macros.set(macroId, macro);
        types.get(typeId)?.macroprocesses.push(macro);
      }
      if (row.processTypeId === null) continue;
      const processTypeId = Number(row.processTypeId);
      if (!processTypes.has(processTypeId)) {
        const processType = { id: processTypeId, name: row.processTypeName ?? '', processes: [] };
        processTypes.set(processTypeId, processType);
        macros.get(macroId)?.processTypes.push(processType);
      }
      if (row.processId !== null) {
        processTypes.get(processTypeId)?.processes.push({
          id: Number(row.processId), code: row.processCode, name: row.processName, status: row.status
        });
      }
    }
    return { macroprocessTypes: [...types.values()] };
  }

  @Get('processes/:id')
  detail(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return this.service.processDetail(id);
  }

  @Get('processes')
  processes(@Query() query: Record<string, unknown>): Promise<unknown[]> {
    return this.service.listProcesses(query);
  }

  @Post('processes')
  createProcess(@Body() body: unknown): Promise<unknown> {
    return this.service.createProcess(body);
  }

  @Patch('processes/:id')
  updateProcess(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<unknown> {
    return this.service.updateProcess(id, body);
  }

  @Post('processes/:id/submit')
  submitProcess(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: AuthenticatedUser): Promise<unknown> {
    return this.service.submitProcess(id, actor);
  }

  @Post('processes/:id/approve')
  approveProcess(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: AuthenticatedUser): Promise<unknown> {
    return this.service.approveProcess(id, actor);
  }

  @Post('processes/:id/reject')
  rejectProcess(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @CurrentUser() actor?: AuthenticatedUser
  ): Promise<unknown> {
    return this.service.rejectProcess(id, body?.reason ?? '', actor);
  }

  @Post('processes/:id/new-version')
  newVersion(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: AuthenticatedUser): Promise<unknown> {
    return this.service.newVersion(id, actor);
  }

  @Post('processes/:id/retire')
  retireProcess(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: AuthenticatedUser): Promise<unknown> {
    return this.service.retireProcess(id, actor);
  }

  @Post('processes/:id/risks')
  addRisk(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<unknown> {
    return this.service.addRisk(id, body);
  }

  @Patch('processes/:id/risks/:riskId')
  updateRisk(@Param('id', ParseIntPipe) id: number, @Param('riskId', ParseIntPipe) riskId: number, @Body() body: unknown): Promise<unknown> {
    return this.service.updateRisk(id, riskId, body);
  }

  @Delete('processes/:id/risks/:riskId')
  @HttpCode(204)
  deleteRisk(@Param('id', ParseIntPipe) id: number, @Param('riskId', ParseIntPipe) riskId: number): Promise<void> {
    return this.service.deleteRisk(id, riskId);
  }

  @Post('processes/:id/relations')
  addRelation(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<unknown> {
    return this.service.addRelation(id, body);
  }

  @Patch('processes/:id/relations/:relationId')
  updateRelation(@Param('id', ParseIntPipe) id: number, @Param('relationId', ParseIntPipe) relationId: number, @Body() body: unknown): Promise<unknown> {
    return this.service.updateRelation(id, relationId, body);
  }

  @Delete('processes/:id/relations/:relationId')
  @HttpCode(204)
  deleteRelation(@Param('id', ParseIntPipe) id: number, @Param('relationId', ParseIntPipe) relationId: number): Promise<void> {
    return this.service.deleteRelation(id, relationId);
  }

  @Get('process-types')
  processTypes(): Promise<unknown[]> {
    return this.service.listProcessTypes();
  }

  @Post('process-types')
  createProcessType(@Body() body: unknown): Promise<unknown> {
    return this.service.createProcessType(body);
  }

  @Patch('process-types/:id')
  updateProcessType(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<unknown> {
    return this.service.updateProcessType(id, body);
  }

  @Patch('process-types/:id/deactivate')
  deactivateProcessType(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return this.service.deactivateProcessType(id);
  }

  @Get('units')
  units(): Promise<unknown[]> {
    return this.service.listUnits();
  }

  @Post('units')
  createUnit(@Body() body: unknown): Promise<unknown> {
    return this.service.createUnit(body);
  }

  @Patch('units/:id')
  updateUnit(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<unknown> {
    return this.service.updateUnit(id, body);
  }

  @Patch('units/:id/deactivate')
  deactivateUnit(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return this.service.deactivateUnit(id);
  }
}

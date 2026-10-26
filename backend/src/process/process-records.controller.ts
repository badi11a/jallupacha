import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RequireProfiles } from '../common/auth.decorator';

import { ProcessRecordsService } from './process-records.service';

@Controller('management')
@ApiTags('process-management')
@ApiCookieAuth('jallupacha_session')
export class ProcessRecordsController {
  constructor(@Inject(ProcessRecordsService) private readonly service: ProcessRecordsService) { }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER', 'VALIDATOR', 'RISK_MANAGER', 'CONSULTATION')
  @Get('processes/:id')
  detail(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return this.service.processDetail(id);
  }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER', 'VALIDATOR', 'RISK_MANAGER', 'CONSULTATION')
  @Get('processes')
  processes(@Query() query: Record<string, unknown>): Promise<unknown[]> {
    return this.service.listProcesses(query);
  }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Post('processes')
  createProcess(@Body() body: unknown): Promise<unknown> {
    return this.service.createProcess(body);
  }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Patch('processes/:id')
  updateProcess(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<unknown> {
    return this.service.updateProcess(id, body);
  }
}

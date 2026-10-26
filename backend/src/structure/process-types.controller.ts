import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RequireProfiles } from '../common/auth.decorator';

import { ProcessTypesService } from './process-types.service';

@Controller('management')
@ApiTags('structure-management')
@ApiCookieAuth('jallupacha_session')
export class ProcessTypesController {
  constructor(@Inject(ProcessTypesService) private readonly service: ProcessTypesService) { }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER', 'VALIDATOR', 'RISK_MANAGER', 'CONSULTATION')
  @Get('process-types')
  processTypes(): Promise<unknown[]> {
    return this.service.listProcessTypes();
  }

  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Post('process-types')
  createProcessType(@Body() body: unknown): Promise<unknown> {
    return this.service.createProcessType(body);
  }

  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Patch('process-types/:id')
  updateProcessType(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<unknown> {
    return this.service.updateProcessType(id, body);
  }

  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Patch('process-types/:id/deactivate')
  deactivateProcessType(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return this.service.deactivateProcessType(id);
  }
}

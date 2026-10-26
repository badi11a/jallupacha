import { Body, Controller, Delete, HttpCode, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RequireProfiles } from '../common/auth.decorator';

import { ProcessRisksService } from './process-risks.service';

@Controller('management')
@ApiTags('risk-management')
@ApiCookieAuth('jallupacha_session')
export class ProcessRisksController {
  constructor(@Inject(ProcessRisksService) private readonly service: ProcessRisksService) { }

  @RequireProfiles('RISK_MANAGER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Post('processes/:id/risks')
  addRisk(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<unknown> {
    return this.service.addRisk(id, body);
  }

  @RequireProfiles('RISK_MANAGER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Patch('processes/:id/risks/:riskId')
  updateRisk(@Param('id', ParseIntPipe) id: number, @Param('riskId', ParseIntPipe) riskId: number, @Body() body: unknown): Promise<unknown> {
    return this.service.updateRisk(id, riskId, body);
  }

  @RequireProfiles('RISK_MANAGER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Delete('processes/:id/risks/:riskId')
  @HttpCode(204)
  deleteRisk(@Param('id', ParseIntPipe) id: number, @Param('riskId', ParseIntPipe) riskId: number): Promise<void> {
    return this.service.deleteRisk(id, riskId);
  }
}

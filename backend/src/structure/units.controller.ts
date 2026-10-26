import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RequireProfiles } from '../common/auth.decorator';

import { UnitsService } from './units.service';

@Controller('management')
@ApiTags('structure-management')
@ApiCookieAuth('jallupacha_session')
export class UnitsController {
  constructor(@Inject(UnitsService) private readonly service: UnitsService) { }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER', 'VALIDATOR', 'RISK_MANAGER', 'CONSULTATION')
  @Get('units')
  units(): Promise<unknown[]> {
    return this.service.listUnits();
  }

  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Post('units')
  createUnit(@Body() body: unknown): Promise<unknown> {
    return this.service.createUnit(body);
  }

  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Patch('units/:id')
  updateUnit(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<unknown> {
    return this.service.updateUnit(id, body);
  }

  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Patch('units/:id/deactivate')
  deactivateUnit(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    return this.service.deactivateUnit(id);
  }
}

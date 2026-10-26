import { Controller, Get, Inject } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { RequireProfiles } from '../common/auth.decorator';

import { ProcessMapViewService } from './process-map-view.service';

@Controller('management')
@ApiTags('process-management')
@ApiCookieAuth('jallupacha_session')
export class ProcessMapViewController {
  constructor(@Inject(ProcessMapViewService) private readonly service: ProcessMapViewService) { }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER', 'VALIDATOR', 'RISK_MANAGER', 'CONSULTATION')
  @Get('map')
  map() { return this.service.map(); }
}

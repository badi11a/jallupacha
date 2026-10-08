import { Controller, Get, Inject } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { RequireProfiles } from '../common/auth.decorator';
import {
  ProcessMapMacroprocess,
  ProcessMapService
} from './process-map.service';

const USERS = ['ADMIN', 'PROCESS_OWNER', 'RISK_MANAGER', 'CONSULTATION'] as const;

class ProcessMapResponse {
  macroprocesses!: ProcessMapMacroprocess[];
}

@Controller('process-map')
@ApiTags('process-map')
@ApiCookieAuth('jallupacha_session')
export class ProcessMapController {
  constructor(@Inject(ProcessMapService) private readonly processMap: ProcessMapService) {}

  @Get()
  @RequireProfiles(...USERS)
  @ApiOperation({
    summary: 'Obtiene el mapa interno Macroproceso → Proceso agrupado por tipo.',
    description: 'Requiere sesión y cualquier perfil vigente. Incluye procesos Borrador.'
  })
  @ApiOkResponse({ type: ProcessMapResponse })
  @ApiUnauthorizedResponse({ description: 'Sesión requerida.' })
  @ApiForbiddenResponse({ description: 'Perfil sin permiso.' })
  getMap() {
    return this.processMap.getMap();
  }
}

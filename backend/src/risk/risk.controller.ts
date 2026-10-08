import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { CurrentUser, RequireProfiles } from '../common/auth.decorator';
import { AuthenticatedUser } from '../common/auth.types';
import { CreateRiskDto, ListRisksQueryDto } from './risk.dto';
import { RiskService } from './risk.service';

const RISK_READERS = ['ADMIN', 'PROCESS_OWNER', 'RISK_MANAGER'] as const;

@Controller('processes/:processId/risks')
@ApiTags('risks')
@ApiCookieAuth('jallupacha_session')
export class RiskController {
  constructor(@Inject(RiskService) private readonly risks: RiskService) {}

  @Get()
  @RequireProfiles(...RISK_READERS)
  @ApiOperation({
    summary: 'Lista riesgos de un proceso según el permiso del actor sobre ese proceso.'
  })
  @ApiOkResponse({ description: 'Página de riesgos vinculados al proceso.' })
  @ApiForbiddenResponse({ description: 'Consulta o dueño de otro proceso no puede ver riesgos.' })
  @ApiNotFoundResponse({ description: 'Proceso inexistente.' })
  @ApiUnauthorizedResponse({ description: 'Sesión requerida.' })
  list(
    @Param('processId', ParseIntPipe) processId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListRisksQueryDto
  ) {
    return this.risks.listForProcess(processId, actor, query);
  }

  @Post()
  @RequireProfiles('RISK_MANAGER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({ summary: 'Registra un riesgo para un proceso existente.' })
  @ApiCreatedResponse({ description: 'Riesgo guardado con su nivel y tipo.' })
  @ApiBadRequestResponse({ description: 'Campos o referencias inválidos.' })
  @ApiForbiddenResponse({ description: 'Se requiere perfil Gestor de riesgos.' })
  @ApiNotFoundResponse({ description: 'Proceso inexistente.' })
  create(
    @Param('processId', ParseIntPipe) processId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: CreateRiskDto
  ) {
    return this.risks.createForProcess(processId, actor, body);
  }
}

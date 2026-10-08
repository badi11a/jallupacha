import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { CurrentUser, RequireProfiles } from '../common/auth.decorator';
import { AuthenticatedUser } from '../common/auth.types';
import { CreateRiskListValueDto } from './risk.dto';
import { RiskService } from './risk.service';

const RISK_READERS = ['ADMIN', 'PROCESS_OWNER', 'RISK_MANAGER'] as const;

@Controller()
@ApiTags('risk-catalogs')
@ApiCookieAuth('jallupacha_session')
export class RiskCatalogController {
  constructor(@Inject(RiskService) private readonly risks: RiskService) {}

  @Get('risk-types')
  @RequireProfiles(...RISK_READERS)
  @ApiOperation({ summary: 'Lista tipos de riesgo disponibles.' })
  @ApiOkResponse({ description: 'Tipos activos; Administrador también recibe inactivos.' })
  @ApiUnauthorizedResponse({ description: 'Sesión requerida.' })
  listTypes(@CurrentUser() actor: AuthenticatedUser) {
    return this.risks.listTypes(actor);
  }

  @Get('risk-levels')
  @RequireProfiles(...RISK_READERS)
  @ApiOperation({ summary: 'Lista niveles de riesgo disponibles.' })
  @ApiOkResponse({ description: 'Niveles activos; Administrador también recibe inactivos.' })
  @ApiUnauthorizedResponse({ description: 'Sesión requerida.' })
  listLevels(@CurrentUser() actor: AuthenticatedUser) {
    return this.risks.listLevels(actor);
  }

  @Post('risk-types')
  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({ summary: 'Agrega un tipo de riesgo al catálogo.' })
  @ApiCreatedResponse({ description: 'Tipo de riesgo creado.' })
  @ApiForbiddenResponse({ description: 'Se requiere perfil Administrador.' })
  createType(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateRiskListValueDto) {
    return this.risks.createType(actor, body);
  }

  @Post('risk-levels')
  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({ summary: 'Agrega un nivel de riesgo al catálogo.' })
  @ApiCreatedResponse({ description: 'Nivel de riesgo creado.' })
  @ApiForbiddenResponse({ description: 'Se requiere perfil Administrador.' })
  createLevel(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateRiskListValueDto) {
    return this.risks.createLevel(actor, body);
  }

  @Post('risk-types/:id/deactivate')
  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({ summary: 'Desactiva un tipo sin borrar su historial.' })
  @ApiOkResponse({ description: 'Tipo desactivado.' })
  @ApiForbiddenResponse({ description: 'Se requiere perfil Administrador.' })
  async deactivateType(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    await this.risks.deactivateType(actor, id);
    return { success: true };
  }

  @Post('risk-levels/:id/deactivate')
  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({ summary: 'Desactiva un nivel sin borrar su historial.' })
  @ApiOkResponse({ description: 'Nivel desactivado.' })
  @ApiForbiddenResponse({ description: 'Se requiere perfil Administrador.' })
  async deactivateLevel(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    await this.risks.deactivateLevel(actor, id);
    return { success: true };
  }
}

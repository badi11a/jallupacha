import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
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
import {
  CreateProcessDto,
  ListProcessesQueryDto,
  ProcessPageResponseDto,
  ProcessResponseDto,
  ReassignProcessOwnerDto,
  UpdateProcessDto
} from './process.dto';
import { ProcessService } from './process.service';

const USERS = ['ADMIN', 'PROCESS_OWNER', 'RISK_MANAGER', 'CONSULTATION'] as const;

@Controller('processes')
@ApiTags('processes')
@ApiCookieAuth('jallupacha_session')
export class ProcessController {
  constructor(@Inject(ProcessService) private readonly processes: ProcessService) {}

  @Get()
  @RequireProfiles(...USERS)
  @ApiOperation({
    summary: 'Lista procesos activos por página, sin filtros avanzados.',
    description: 'Requiere sesión; pueden consultar ADMIN, PROCESS_OWNER, RISK_MANAGER y CONSULTATION.'
  })
  @ApiOkResponse({ type: ProcessPageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Sesión requerida.' })
  list(@Query() query: ListProcessesQueryDto) {
    return this.processes.list(query);
  }

  @Post()
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN', 'PROCESS_OWNER')
  @ApiOperation({
    summary: 'Crea un Borrador y asigna el responsable desde la sesión autenticada.',
    description: 'Requiere perfil ADMIN o PROCESS_OWNER.'
  })
  @ApiCreatedResponse({ type: ProcessResponseDto })
  @ApiBadRequestResponse({ description: 'Entrada inválida o referencia no válida.' })
  @ApiForbiddenResponse({ description: 'Se requiere perfil Dueño de proceso o Administrador.' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() body: CreateProcessDto) {
    return this.processes.create(actor, body);
  }

  @Get(':id')
  @RequireProfiles(...USERS)
  @ApiOperation({
    summary: 'Consulta todos los campos de la ficha y el responsable vigente.',
    description: 'Requiere sesión; pueden consultar ADMIN, PROCESS_OWNER, RISK_MANAGER y CONSULTATION.'
  })
  @ApiOkResponse({ type: ProcessResponseDto })
  @ApiNotFoundResponse({ description: 'Proceso inexistente.' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.processes.get(id);
  }

  @Patch(':id')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN', 'PROCESS_OWNER')
  @ApiOperation({
    summary: 'Edita la ficha de un Borrador con revisión optimista.',
    description: 'Requiere perfil ADMIN o PROCESS_OWNER y ser responsable actual, salvo ADMIN.'
  })
  @ApiOkResponse({ type: ProcessResponseDto })
  @ApiBadRequestResponse({ description: 'Entrada inválida o referencia no válida.' })
  @ApiForbiddenResponse({ description: 'Proceso ajeno o perfil sin permiso.' })
  @ApiNotFoundResponse({ description: 'Proceso inexistente.' })
  @ApiUnauthorizedResponse({ description: 'Sesión requerida.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: UpdateProcessDto
  ) {
    return this.processes.update(id, actor, body);
  }

  @Patch(':id/owner')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  @ApiOperation({
    summary: 'Reasigna el responsable a una cuenta activa con perfil Dueño de proceso.',
    description: 'Requiere perfil ADMIN.'
  })
  @ApiOkResponse({ type: ProcessResponseDto })
  @ApiBadRequestResponse({ description: 'La cuenta destino no es un Dueño activo.' })
  @ApiForbiddenResponse({ description: 'Se requiere perfil Administrador.' })
  @ApiNotFoundResponse({ description: 'Proceso inexistente.' })
  reassignOwner(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: ReassignProcessOwnerDto
  ) {
    return this.processes.reassignOwner(id, actor, body);
  }
}

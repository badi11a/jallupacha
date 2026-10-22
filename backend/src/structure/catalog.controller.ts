import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CurrentUser, RequireProfiles } from '../common/auth.decorator';
import { AuthenticatedUser } from '../common/auth.types';
import { ApiCookieAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import {
  CreateMacroprocessDto,
  CreateUnitDto,
  ProcessTypeDto,
  UpdateMacroprocessDto,
  UpdateProcessTypeDto,
  UpdateUnitDto
} from './catalog.dto';
import { CatalogService } from './catalog.service';

const USERS = ['ADMIN', 'PROCESS_OWNER', 'RISK_MANAGER', 'CONSULTATION'] as const;

@Controller()
@ApiTags('catalogs')
@ApiCookieAuth('jallupacha_session')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalogs: CatalogService) {}

  @Get('macroprocess-types')
  @RequireProfiles(...USERS)
  macroprocessTypes() {
    return this.catalogs.listMacroprocessTypes();
  }

  @Get('macroprocesses')
  @RequireProfiles(...USERS)
  macroprocesses() {
    return this.catalogs.listMacroprocesses();
  }

  @Post('macroprocesses')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  createMacroprocess(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateMacroprocessDto) {
    return this.catalogs.createMacroprocess(user.id, body);
  }

  @Patch('macroprocesses/:id')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  updateMacroprocess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMacroprocessDto
  ) {
    return this.catalogs.updateMacroprocess(user.id, id, body);
  }

  @Post('macroprocesses/:id/deactivate')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  async deactivateMacroprocess(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    await this.catalogs.deactivateMacroprocess(user.id, id);
    return { deactivated: true };
  }

  @Get('process-types')
  @RequireProfiles(...USERS)
  processTypes() {
    return this.catalogs.listProcessTypes();
  }

  @Post('process-types')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  createProcessType(@CurrentUser() user: AuthenticatedUser, @Body() body: ProcessTypeDto) {
    return this.catalogs.createProcessType(user.id, body);
  }

  @Patch('process-types/:id')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  updateProcessType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProcessTypeDto
  ) {
    return this.catalogs.updateProcessType(user.id, id, body);
  }

  @Post('process-types/:id/deactivate')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  async deactivateProcessTypePost(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    await this.catalogs.deactivateProcessType(user.id, id);
    return { deactivated: true };
  }

  @Patch('process-types/:id/deactivate')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  async deactivateProcessTypePatch(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    await this.catalogs.deactivateProcessType(user.id, id);
    return { deactivated: true };
  }

  @Get('units')
  @RequireProfiles(...USERS)
  units() {
    return this.catalogs.listUnits();
  }

  @Post('units')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  createUnit(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateUnitDto) {
    return this.catalogs.createUnit(user.id, body);
  }

  @Patch('units/:id')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  updateUnit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUnitDto
  ) {
    return this.catalogs.updateUnit(user.id, id, body);
  }

  @Post('units/:id/deactivate')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  async deactivateUnitPost(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    await this.catalogs.deactivateUnit(user.id, id);
    return { deactivated: true };
  }

  @Patch('units/:id/deactivate')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN')
  async deactivateUnitPatch(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    await this.catalogs.deactivateUnit(user.id, id);
    return { deactivated: true };
  }
}

import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Put,
  Req
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, RequireProfiles } from '../common/auth.decorator';
import { AuthenticatedUser, ProfileCode } from '../common/auth.types';
import { qualifiedTable } from '../common/database';
import { UpdateProfilesDto } from './profile.dto';

@Controller('users')
@RequireProfiles('ADMIN')
@ApiTags('users')
@ApiCookieAuth('jallupacha_session')
export class UsersController {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(AuditService) private readonly audit: AuditService
  ) {}

  @Get()
  async list() {
    return this.dataSource.query(
      `SELECT U.ID AS "id", I.DISPLAY_NAME AS "displayName", I.EMAIL AS "email", U.IS_ACTIVE AS "isActive",
        (SELECT LISTAGG(UP.PROFILE_CODE, ',') WITHIN GROUP (ORDER BY UP.PROFILE_CODE)
         FROM ${qualifiedTable('USER_PROFILE')} UP WHERE UP.USER_ID = U.ID) AS "profiles"
       FROM ${qualifiedTable('APP_USER')} U
       JOIN ${qualifiedTable('USER_IDENTITY')} I ON I.USER_ID = U.ID
       WHERE U.IS_ACTIVE = 1 ORDER BY U.ID`
    );
  }

  @Get('process-owners')
  @ApiOperation({
    summary: 'Lista cuentas activas con perfil Dueño para reasignación administrativa.',
    description: 'Requiere perfil ADMIN.'
  })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'displayName'],
        properties: {
          id: { type: 'integer' },
          displayName: { type: 'string' }
        }
      }
    }
  })
  @ApiForbiddenResponse({ description: 'Se requiere perfil Administrador.' })
  async listProcessOwners() {
    return this.dataSource.query(
      `SELECT U.ID AS "id", I.DISPLAY_NAME AS "displayName"
       FROM ${qualifiedTable('APP_USER')} U
       JOIN ${qualifiedTable('USER_IDENTITY')} I ON I.USER_ID = U.ID
       JOIN ${qualifiedTable('USER_PROFILE')} UP ON UP.USER_ID = U.ID
       WHERE U.IS_ACTIVE = 1 AND UP.PROFILE_CODE = 'PROCESS_OWNER'
       ORDER BY I.DISPLAY_NAME, U.ID`
    );
  }

  @Put(':id/profiles')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  async updateProfiles(
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Param('id', ParseIntPipe) userId: number,
    @Body() body: UpdateProfilesDto
  ) {
    if (actor.id === userId) {
      await this.audit.securityEvent(actor.id, request.ip || 'unknown', 'PROFILE_CHANGE_SELF_REJECTED', 'REJECTED');
      throw new ForbiddenException('No puede cambiar sus propios perfiles');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT ID FROM ${qualifiedTable('ADMIN_CONTROL')} WHERE ID = 1 FOR UPDATE`);
      const target = await manager.query(
        `SELECT ID FROM ${qualifiedTable('APP_USER')} WHERE ID = :1 AND IS_ACTIVE = 1`,
        [userId]
      );
      if (target.length !== 1) {
        throw new NotFoundException('User not found');
      }

      const existingRows: Array<{ profileCode: ProfileCode }> = await manager.query(
        `SELECT PROFILE_CODE AS "profileCode" FROM ${qualifiedTable('USER_PROFILE')} WHERE USER_ID = :1`,
        [userId]
      );
      const before = existingRows.map((row) => row.profileCode).sort();
      const next = [...body.profiles].sort();
      if (before.includes('ADMIN') && !next.includes('ADMIN')) {
        const admins = await manager.query(
          `SELECT COUNT(*) AS "total" FROM ${qualifiedTable('USER_PROFILE')} UP
           JOIN ${qualifiedTable('APP_USER')} U ON U.ID = UP.USER_ID
           WHERE UP.PROFILE_CODE = 'ADMIN' AND U.IS_ACTIVE = 1`
        );
        if (Number(admins[0].total) <= 1) {
          throw new ConflictException('No se puede quitar el último perfil Administrador');
        }
      }

      await manager.query(`DELETE FROM ${qualifiedTable('USER_PROFILE')} WHERE USER_ID = :1`, [userId]);
      for (const profile of body.profiles) {
        await manager.query(
          `INSERT INTO ${qualifiedTable('USER_PROFILE')} (USER_ID, PROFILE_CODE) VALUES (:1, :2)`,
          [userId, profile]
        );
      }
      await this.audit.record({
        actorUserId: actor.id,
        action: 'USER_PROFILES_UPDATED',
        entityType: 'USER',
        entityId: String(userId),
        beforeValue: before,
        afterValue: next
      }, manager);
      await this.audit.securityEvent(
        actor.id,
        request.ip || 'unknown',
        'PROFILE_CHANGE',
        'SUCCESS',
        manager
      );
      return { userId, profiles: next };
    });
  }
}

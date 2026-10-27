import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import { ApiCookieAuth, ApiHeader, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Public, RequireProfiles } from '../common/auth.decorator';
import { AuthenticatedRequest } from '../common/auth.types';
import { qualifiedTable } from '../common/database';
import { verifyPassword } from '../common/security';
import { LocalCredentialEntity } from '../identity/local-credential.entity';
import { LoginDto } from './login.dto';
import { SessionService } from './session.service';

class DemoSessionDto {
  @ApiProperty({ minimum: 1, description: 'ID of a pre-seeded fictional demo identity' })
  @IsInt()
  @Min(1)
  identityId!: number;
}

@Controller('auth')
@ApiTags('authentication')
export class AuthController {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(AuditService) private readonly audit: AuditService
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicio de sesión institucional mediante correo y contraseña' })
  @ApiResponse({ status: 200, description: 'Sesión iniciada exitosamente' })
  @ApiResponse({ status: 401, description: 'Credenciales no válidas' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async login(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: LoginDto
  ) {
    const normalizedEmail = body.email.trim().toLowerCase();
    const clientIp = request.ip || 'unknown';

    const rows = await this.dataSource.query(
      `SELECT U.ID AS "id",
              U.IS_ACTIVE AS "isActive",
              I.DISPLAY_NAME AS "displayName",
              I.EMAIL AS "email",
              C.PASSWORD_HASH AS "passwordHash",
              C.FAILED_ATTEMPTS AS "failedAttempts",
              C.LOCKED_UNTIL AS "lockedUntil"
       FROM ${qualifiedTable('APP_USER')} U
       JOIN ${qualifiedTable('USER_IDENTITY')} I ON I.USER_ID = U.ID
       LEFT JOIN ${qualifiedTable('LOCAL_CREDENTIAL')} C ON C.USER_ID = U.ID
       WHERE LOWER(I.EMAIL) = :1`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      await this.audit.securityEvent(null, clientIp, 'LOGIN', 'REJECTED');
      throw new UnauthorizedException('Credenciales no válidas');
    }

    const user = rows[0];
    const now = new Date();

    if (Number(user.isActive) !== 1 || !user.passwordHash) {
      await this.audit.securityEvent(user.id, clientIp, 'LOGIN', 'REJECTED');
      throw new UnauthorizedException('Credenciales no válidas');
    }

    const lockedUntilDate = user.lockedUntil ? new Date(user.lockedUntil) : null;
    const isCurrentlyLocked = lockedUntilDate !== null && lockedUntilDate.getTime() > now.getTime();
    if (isCurrentlyLocked) {
      await this.audit.securityEvent(user.id, clientIp, 'LOGIN', 'REJECTED');
      throw new UnauthorizedException('Credenciales no válidas');
    }

    const passwordValid = await verifyPassword(body.password, user.passwordHash);
    if (!passwordValid) {
      const isExpiredLockout = lockedUntilDate !== null && lockedUntilDate.getTime() <= now.getTime();
      const currentAttempts = isExpiredLockout ? 0 : (Number(user.failedAttempts) || 0);
      const newAttempts = currentAttempts + 1;
      const newLockedUntil = newAttempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null;

      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(LocalCredentialEntity).update(
          { userId: user.id },
          {
            failedAttempts: newAttempts,
            lockedUntil: newLockedUntil
          }
        );
        await this.audit.securityEvent(user.id, clientIp, 'LOGIN', 'REJECTED', manager);
      });

      throw new UnauthorizedException('Credenciales no válidas');
    }

    const { sessionToken, csrfToken, profiles } = await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(LocalCredentialEntity).update(
        { userId: user.id },
        {
          failedAttempts: 0,
          lockedUntil: null
        }
      );
      const tokens = await this.sessions.create(user.id, manager);
      await this.audit.securityEvent(user.id, clientIp, 'LOGIN', 'SUCCESS', manager);
      const profileRows: Array<{ profileCode: string }> = await manager.query(
        `SELECT PROFILE_CODE AS "profileCode" FROM ${qualifiedTable('USER_PROFILE')} WHERE USER_ID = :1`,
        [user.id]
      );
      return {
        ...tokens,
        profiles: profileRows.map((r) => r.profileCode)
      };
    });

    setSessionCookies(response, request, sessionToken, csrfToken);
    return {
      authenticated: true,
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      profiles
    };
  }

  @Public()
  @Get('demo/identities')
  async demoIdentities() {
    ensureDemoEnabled();
    return this.dataSource.query(
      `SELECT D.USER_ID AS "id", I.DISPLAY_NAME AS "displayName"
       FROM ${qualifiedTable('DEMO_IDENTITY')} D
       JOIN ${qualifiedTable('USER_IDENTITY')} I ON I.USER_ID = D.USER_ID
       JOIN ${qualifiedTable('APP_USER')} U ON U.ID = D.USER_ID
       WHERE U.IS_ACTIVE = 1 AND U.IS_DEMO = 1 AND I.PROVIDER = 'DEMO' ORDER BY D.USER_ID`
    );
  }

  @Public()
  @Post('demo/session')
  @HttpCode(201)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createDemoSession(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: DemoSessionDto
  ) {
    ensureDemoEnabled();
    if (!hasDemoOrigin(request)) {
      await this.audit.securityEvent(null, request.ip || 'unknown', 'LOGIN', 'REJECTED');
      throw new ForbiddenException();
    }
    const identity = await this.dataSource.query(
      `SELECT D.USER_ID AS "userId"
       FROM ${qualifiedTable('DEMO_IDENTITY')} D
       JOIN ${qualifiedTable('USER_IDENTITY')} I ON I.USER_ID = D.USER_ID
       JOIN ${qualifiedTable('APP_USER')} U ON U.ID = D.USER_ID
       WHERE D.USER_ID = :1 AND U.IS_ACTIVE = 1 AND U.IS_DEMO = 1 AND I.PROVIDER = 'DEMO'`,
      [body.identityId]
    );
    if (identity.length !== 1) {
      await this.audit.securityEvent(null, request.ip || 'unknown', 'LOGIN', 'REJECTED');
      throw new UnauthorizedException();
    }
    const { sessionToken, csrfToken } = await this.dataSource.transaction(async (manager) => {
      const tokens = await this.sessions.create(body.identityId, manager);
      await this.audit.securityEvent(
        body.identityId,
        request.ip || 'unknown',
        'LOGIN',
        'SUCCESS',
        manager
      );
      return tokens;
    });
    setSessionCookies(response, request, sessionToken, csrfToken);
    return { authenticated: true };
  }

  @Get('me')
  @ApiCookieAuth('jallupacha_session')
  @RequireProfiles('ADMIN', 'PROCESS_OWNER', 'VALIDATOR', 'RISK_MANAGER', 'CONSULTATION')
  async me(@Req() request: AuthenticatedRequest) {
    const identities = await this.dataSource.query(
      `SELECT DISPLAY_NAME AS "displayName", EMAIL AS "email" FROM ${qualifiedTable('USER_IDENTITY')} WHERE USER_ID = :1`,
      [request.authUser.id]
    );
    return {
      userId: request.authUser.id,
      displayName: identities[0]?.displayName,
      email: identities[0]?.email,
      profiles: request.authUser.profiles
    };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth('jallupacha_session')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @RequireProfiles('ADMIN', 'PROCESS_OWNER', 'VALIDATOR', 'RISK_MANAGER', 'CONSULTATION')
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response
  ): Promise<void> {
    await this.sessions.invalidate(request.authUser.sessionHash);
    clearSessionCookies(response, request);
  }
}

function ensureDemoEnabled(): void {
  if (process.env.AUTH_MODE !== 'demo' || process.env.NODE_ENV !== 'development' || process.env.DEMO_DATA_ENABLED !== 'true') {
    throw new UnauthorizedException();
  }
}

function hasDemoOrigin(request: Request): boolean {
  const allowedOrigin = process.env.DEMO_UI_ORIGIN ?? 'http://127.0.0.1:4200';
  return request.header('origin') === allowedOrigin;
}

function setSessionCookies(
  response: Response,
  request: Request,
  sessionToken: string,
  csrfToken: string
): void {
  const secure = process.env.NODE_ENV !== 'development' || request.secure;
  const attributes = `Path=/; SameSite=Strict; Max-Age=1800${secure ? '; Secure' : ''}`;
  response.setHeader('Set-Cookie', [
    `jallupacha_session=${encodeURIComponent(sessionToken)}; ${attributes}; HttpOnly`,
    `jallupacha_csrf=${encodeURIComponent(csrfToken)}; ${attributes}`
  ]);
}

function clearSessionCookies(response: Response, request: Request): void {
  const secure = process.env.NODE_ENV !== 'development' || request.secure;
  const attributes = `Path=/; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
  response.setHeader('Set-Cookie', [
    `jallupacha_session=; ${attributes}; HttpOnly`,
    `jallupacha_csrf=; ${attributes}`
  ]);
}

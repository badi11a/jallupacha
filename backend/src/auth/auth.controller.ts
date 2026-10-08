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
import { ApiCookieAuth, ApiHeader, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Public, RequireProfiles } from '../common/auth.decorator';
import { AuthenticatedRequest } from '../common/auth.types';
import { qualifiedTable } from '../common/database';
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
  @RequireProfiles('ADMIN', 'PROCESS_OWNER', 'RISK_MANAGER', 'CONSULTATION')
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
  @RequireProfiles('ADMIN', 'PROCESS_OWNER', 'RISK_MANAGER', 'CONSULTATION')
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

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { AuditService } from '../audit/audit.service';
import { IS_PUBLIC, REQUIRED_PROFILES } from '../common/auth.decorator';
import { AuthenticatedRequest, ProfileCode } from '../common/auth.types';
import { SessionService } from './session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(AuditService) private readonly audit: AuditService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const sessionToken = readCookie(request, 'jallupacha_session');
    const user = await this.sessions.authenticate(sessionToken);
    if (!user) {
      await this.audit.securityEvent(null, request.ip || 'unknown', 'ACCESS_DENIED', 'REJECTED');
      throw new UnauthorizedException();
    }
    request.authUser = user;
    if (sessionToken) {
      refreshSessionCookies(
        context.switchToHttp().getResponse<Response>(),
        request,
        sessionToken,
        readCookie(request, 'jallupacha_csrf')
      );
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const headerToken = request.header('x-csrf-token');
      const cookieToken = readCookie(request, 'jallupacha_csrf');
      if (!headerToken || headerToken !== cookieToken || !this.sessions.verifyCsrf(headerToken, user)) {
        await this.audit.securityEvent(user.id, request.ip || 'unknown', 'CSRF_REJECTED', 'REJECTED');
        throw new ForbiddenException();
      }
    }

    const required = this.reflector.getAllAndOverride<ProfileCode[]>(REQUIRED_PROFILES, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!required?.length) {
      await this.audit.securityEvent(user.id, request.ip || 'unknown', 'POLICY_MISSING', 'REJECTED');
      throw new InternalServerErrorException();
    }
    if (!required.some((profile) => user.profiles.includes(profile))) {
      await this.audit.securityEvent(user.id, request.ip || 'unknown', 'ACCESS_DENIED', 'REJECTED');
      throw new ForbiddenException();
    }
    return true;
  }
}

function refreshSessionCookies(
  response: Response,
  request: Request,
  sessionToken: string,
  csrfToken: string | undefined
): void {
  const secure = process.env.NODE_ENV !== 'development' || request.secure;
  const attributes = `Path=/; SameSite=Strict; Max-Age=1800${secure ? '; Secure' : ''}`;
  response.setHeader('Set-Cookie', [
    `jallupacha_session=${encodeURIComponent(sessionToken)}; ${attributes}; HttpOnly`,
    ...(csrfToken ? [`jallupacha_csrf=${encodeURIComponent(csrfToken)}; ${attributes}`] : [])
  ]);
}

function readCookie(request: Request, name: string): string | undefined {
  const cookie = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!cookie) return undefined;
  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

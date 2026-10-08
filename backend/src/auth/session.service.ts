import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ProfileCode, AuthenticatedUser } from '../common/auth.types';
import { qualifiedTable } from '../common/database';
import { randomToken, safeHashEqual, tokenHash } from '../common/security';
import { SessionEntity } from './session.entity';

const SESSION_MINUTES = 30;

@Injectable()
export class SessionService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async create(
    userId: number,
    manager: EntityManager = this.dataSource.manager
  ): Promise<{ sessionToken: string; csrfToken: string }> {
    const sessionToken = randomToken();
    const csrfToken = randomToken();
    const now = new Date();
    const session = this.dataSource.getRepository(SessionEntity).create({
      sessionHash: tokenHash(sessionToken),
      csrfHash: tokenHash(csrfToken),
      userId,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + SESSION_MINUTES * 60_000)
    });
    await manager.getRepository(SessionEntity).save(session);
    return { sessionToken, csrfToken };
  }

  async authenticate(sessionToken: string | undefined): Promise<AuthenticatedUser | null> {
    if (!sessionToken || !/^[A-Za-z0-9_-]{40,60}$/.test(sessionToken)) return null;
    const sessionHash = tokenHash(sessionToken);
    const session = await this.dataSource.getRepository(SessionEntity).findOneBy({ sessionHash });
    const now = new Date();
    if (!session) return null;
    if (session.expiresAt.getTime() <= now.getTime()) {
      await this.dataSource.getRepository(SessionEntity).delete({ sessionHash });
      return null;
    }

    const activeUsers = await this.dataSource.query(
      `SELECT ID FROM ${qualifiedTable('APP_USER')} WHERE ID = :1 AND IS_ACTIVE = 1`,
      [session.userId]
    );
    if (activeUsers.length === 0) {
      await this.dataSource.getRepository(SessionEntity).delete({ sessionHash });
      return null;
    }

    const rows: Array<{ profileCode: ProfileCode }> = await this.dataSource.query(
      `SELECT PROFILE_CODE AS "profileCode" FROM ${qualifiedTable('USER_PROFILE')} WHERE USER_ID = :1`,
      [session.userId]
    );
    const refreshedAt = new Date();
    session.lastActivity = refreshedAt;
    session.expiresAt = new Date(refreshedAt.getTime() + SESSION_MINUTES * 60_000);
    await this.dataSource.getRepository(SessionEntity).save(session);

    return {
      id: session.userId,
      profiles: rows.map((row) => row.profileCode),
      sessionHash,
      csrfHash: session.csrfHash
    };
  }

  verifyCsrf(csrfToken: string | undefined, authenticatedUser: AuthenticatedUser): boolean {
    return Boolean(csrfToken && safeHashEqual(csrfToken, authenticatedUser.csrfHash));
  }

  async invalidate(sessionHash: string): Promise<void> {
    await this.dataSource.getRepository(SessionEntity).delete({ sessionHash });
  }
}

import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { AuditService } from '../audit/audit.service';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from '../common/auth.types';

describe('UsersController', () => {
  let controller: UsersController;
  let dataSource: Partial<DataSource>;
  let audit: Partial<AuditService>;

  beforeEach(() => {
    dataSource = {
      query: jest.fn(),
      transaction: jest.fn()
    };
    audit = {
      record: jest.fn(),
      securityEvent: jest.fn()
    };
    controller = new UsersController(dataSource as DataSource, audit as AuditService);
  });

  it('lists active users with their profiles', async () => {
    (dataSource.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, displayName: 'Admin Test', email: 'admin@example.test', isActive: 1, profiles: 'ADMIN,CONSULTATION' }
    ]);

    const result = await controller.list();
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Admin Test');
    expect(result[0].profiles).toBe('ADMIN,CONSULTATION');
  });

  it('lists process owners', async () => {
    (dataSource.query as jest.Mock).mockResolvedValueOnce([
      { id: 2, displayName: 'Dueño Test' }
    ]);

    const result = await controller.listProcessOwners();
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Dueño Test');
  });

  it('rejects self profile modification with 403', async () => {
    const actor: AuthenticatedUser = {
      id: 1,
      profiles: ['ADMIN'],
      sessionHash: 'abc',
      csrfHash: 'def'
    };

    await expect(
      controller.updateProfiles(actor, { ip: '127.0.0.1' } as any, 1, { profiles: ['ADMIN', 'VALIDATOR'] })
    ).rejects.toThrow(ForbiddenException);

    expect(audit.securityEvent).toHaveBeenCalledWith(1, '127.0.0.1', 'PROFILE_CHANGE_SELF_REJECTED', 'REJECTED');
  });

  it('updates profiles of another user and audits the change', async () => {
    const actor: AuthenticatedUser = {
      id: 1,
      profiles: ['ADMIN'],
      sessionHash: 'abc',
      csrfHash: 'def'
    };

    const mockManager = {
      query: jest.fn()
    };

    (dataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
      // 1. Lock ADMIN_CONTROL
      // 2. target user check
      mockManager.query
        .mockResolvedValueOnce([]) // lock ADMIN_CONTROL
        .mockResolvedValueOnce([{ ID: 2 }]) // target user exists
        .mockResolvedValueOnce([{ profileCode: 'CONSULTATION' }]) // existing rows
        .mockResolvedValueOnce([]) // delete old profiles
        .mockResolvedValueOnce([]); // insert new profile

      return callback(mockManager);
    });

    const result = await controller.updateProfiles(
      actor,
      { ip: '127.0.0.1' } as any,
      2,
      { profiles: ['VALIDATOR', 'PROCESS_OWNER'] }
    );

    expect(result).toEqual({ userId: 2, profiles: ['PROCESS_OWNER', 'VALIDATOR'] });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_PROFILES_UPDATED',
        actorUserId: 1,
        entityType: 'USER',
        entityId: '2'
      }),
      mockManager
    );
  });

  it('prevents removing the last active ADMIN', async () => {
    const actor: AuthenticatedUser = {
      id: 1,
      profiles: ['ADMIN'],
      sessionHash: 'abc',
      csrfHash: 'def'
    };

    const mockManager = {
      query: jest.fn()
    };

    (dataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
      mockManager.query
        .mockResolvedValueOnce([]) // lock ADMIN_CONTROL
        .mockResolvedValueOnce([{ ID: 2 }]) // target user exists
        .mockResolvedValueOnce([{ profileCode: 'ADMIN' }]) // target currently has ADMIN
        .mockResolvedValueOnce([{ total: 1 }]); // only 1 admin in system!

      return callback(mockManager);
    });

    await expect(
      controller.updateProfiles(
        actor,
        { ip: '127.0.0.1' } as any,
        2,
        { profiles: ['CONSULTATION'] } // removing ADMIN
      )
    ).rejects.toThrow(ConflictException);
  });
});

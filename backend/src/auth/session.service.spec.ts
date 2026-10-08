import { DataSource, Repository } from 'typeorm';
import { SessionEntity } from './session.entity';
import { SessionService } from './session.service';

describe('Oracle-backed sessions', () => {
  const sessionRepository = {
    create: jest.fn((value: Partial<SessionEntity>) => value),
    save: jest.fn(async (value: Partial<SessionEntity>) => value),
    findOneBy: jest.fn(),
    delete: jest.fn()
  };
  const manager = {
    getRepository: jest.fn(() => sessionRepository)
  };
  const dataSource = {
    getRepository: jest.fn(() => sessionRepository),
    manager,
    query: jest.fn()
  } as unknown as DataSource;
  const service = new SessionService(dataSource);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-08T12:00:00.000Z'));
    sessionRepository.create.mockClear();
    sessionRepository.save.mockClear();
    sessionRepository.findOneBy.mockReset();
    sessionRepository.delete.mockReset();
    dataSource.query = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores only token hashes and expires after 30 minutes of inactivity', async () => {
    const created = await service.create(42);
    const persisted = sessionRepository.save.mock.calls[0][0];
    expect(persisted.sessionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.sessionHash).not.toBe(created.sessionToken);
    expect(persisted.csrfHash).not.toBe(created.csrfToken);
    if (!(persisted.expiresAt instanceof Date) || !(persisted.lastActivity instanceof Date)) {
      throw new Error('Session timestamps were not persisted');
    }
    expect(persisted.expiresAt.getTime() - persisted.lastActivity.getTime()).toBe(30 * 60_000);
  });

  it('loads current profiles on each authenticated request and refreshes inactivity', async () => {
    const session: Partial<SessionEntity> = {
      sessionHash: 'a'.repeat(64),
      userId: 42,
      csrfHash: 'b'.repeat(64),
      lastActivity: new Date('2026-10-08T11:45:00.000Z'),
      expiresAt: new Date('2026-10-08T12:15:00.000Z')
    };
    sessionRepository.findOneBy.mockResolvedValue(session);
    dataSource.query = jest.fn()
      .mockResolvedValueOnce([{ id: 42 }])
      .mockResolvedValueOnce([{ profileCode: 'CONSULTATION' }]);

    const authenticated = await service.authenticate('a-session-token-of-at-least-forty-characters');

    expect(authenticated?.profiles).toEqual(['CONSULTATION']);
    expect(dataSource.query).toHaveBeenCalledTimes(2);
    expect(sessionRepository.save).toHaveBeenCalled();
    expect(session?.expiresAt?.getTime()).toBe(Date.parse('2026-10-08T12:30:00.000Z'));
  });

  it('deletes expired sessions and invalidates sessions on logout', async () => {
    sessionRepository.findOneBy.mockResolvedValue({
      sessionHash: 'c'.repeat(64),
      userId: 42,
      csrfHash: 'd'.repeat(64),
      expiresAt: new Date('2026-10-08T11:59:59.000Z')
    });

    await expect(service.authenticate('another-session-token-with-more-than-forty-chars')).resolves.toBeNull();
    expect(sessionRepository.delete).toHaveBeenCalledWith({ sessionHash: expect.any(String) });

    await service.invalidate('e'.repeat(64));
    expect(sessionRepository.delete).toHaveBeenLastCalledWith({ sessionHash: 'e'.repeat(64) });
  });
});

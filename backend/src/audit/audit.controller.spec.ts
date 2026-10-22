import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController (REQ-27)', () => {
  let controller: AuditController;
  let service: Partial<AuditService>;

  beforeEach(() => {
    service = {
      list: jest.fn(async (page, limit, filter) => ({
        items: [
          {
            id: 1,
            createdAt: new Date(),
            actorUserId: 10,
            actorDisplayName: 'Admin Test',
            actorEmail: 'admin@example.test',
            action: 'PROCESS_SUBMITTED',
            entityType: 'PROCESS',
            entityId: 'PR1',
            beforeValue: '{"status":"Borrador"}',
            afterValue: '{"status":"En revisión"}'
          }
        ],
        total: 1
      }))
    };
    controller = new AuditController(service as AuditService);
  });

  it('lists audit logs with pagination and filters', async () => {
    const result = await controller.list(1, 20, 'PROCESS', 'PROCESS_SUBMITTED');
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(1);
    expect(service.list).toHaveBeenCalledWith(1, 20, { entityType: 'PROCESS', action: 'PROCESS_SUBMITTED' });
  });

  it('clamps invalid pagination parameters safely', async () => {
    await controller.list(-5, 500);
    expect(service.list).toHaveBeenCalledWith(1, 100, { entityType: undefined, action: undefined });
  });
});

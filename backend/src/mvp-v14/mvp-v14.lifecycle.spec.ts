import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/auth.types';
import { MvpV14Service } from './mvp-v14.service';

describe('MvpV14Service - Process Lifecycle (REQ-07, REQ-09, REQ-56)', () => {
  let service: MvpV14Service;
  let dataSource: Partial<DataSource>;
  let audit: Partial<AuditService>;
  let mockManager: any;

  beforeEach(() => {
    mockManager = {
      query: jest.fn()
    };
    dataSource = {
      query: jest.fn(),
      transaction: jest.fn(async (callback: any) => callback(mockManager)) as any
    };
    audit = {
      record: jest.fn()
    };
    service = new MvpV14Service(dataSource as DataSource, audit as AuditService);
  });

  describe('submitProcess (REQ-05)', () => {
    it('rejects submission if process is not found', async () => {
      mockManager.query.mockResolvedValueOnce([]); // not found
      await expect(service.submitProcess(999)).rejects.toThrow(NotFoundException);
    });

    it('rejects submission if status is not Borrador', async () => {
      mockManager.query.mockResolvedValueOnce([{ id: 1, versionId: 10, status: 'Vigente' }]);
      await expect(service.submitProcess(1)).rejects.toThrow(ConflictException);
    });

    it('submits successfully when status is Borrador and process is complete', async () => {
      mockManager.query
        .mockResolvedValueOnce([{ id: 1, versionId: 10, status: 'Borrador' }]) // lock process
        .mockResolvedValueOnce([]); // update version status

      // Mock processDetail for completeness
      jest.spyOn(service, 'processDetail').mockResolvedValueOnce({
        completeness: { complete: true, missing: [] }
      } as any);

      const actor: AuthenticatedUser = { id: 5, profiles: ['PROCESS_OWNER'], sessionHash: 'h', csrfHash: 'c' };
      const result = await service.submitProcess(1, actor);

      expect(result).toEqual({ id: 1, status: 'En revisión' });
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE"),
        [10]
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROCESS_SUBMITTED',
          actorUserId: 5,
          entityId: '1'
        }),
        mockManager
      );
    });
  });

  describe('approveProcess (REQ-07)', () => {
    it('rejects approval if status is not En revisión', async () => {
      mockManager.query.mockResolvedValueOnce([{ id: 1, versionId: 10, status: 'Borrador', elaborator: 'User 2' }]);
      await expect(service.approveProcess(1)).rejects.toThrow(ConflictException);
    });

    it('enforces segregation of duties: validator cannot be the elaborator', async () => {
      mockManager.query
        .mockResolvedValueOnce([{ id: 1, versionId: 10, status: 'En revisión', elaborator: 'Validator User' }]) // process
        .mockResolvedValueOnce([{ name: 'Validator User' }]); // actor displayName

      const actor: AuthenticatedUser = { id: 7, profiles: ['VALIDATOR'], sessionHash: 'h', csrfHash: 'c' };
      await expect(service.approveProcess(1, actor)).rejects.toThrow(ForbiddenException);
    });

    it('approves process, archives previous version as Obsoleto, and sets current to Vigente', async () => {
      mockManager.query
        .mockResolvedValueOnce([{ id: 1, versionId: 10, status: 'En revisión', elaborator: 'Different User' }]) // process
        .mockResolvedValueOnce([{ name: 'Validator User' }]) // actor displayName
        .mockResolvedValueOnce([]) // archive previous Vigente to Obsoleto
        .mockResolvedValueOnce([]); // update current to Vigente

      const actor: AuthenticatedUser = { id: 7, profiles: ['VALIDATOR'], sessionHash: 'h', csrfHash: 'c' };
      const result = await service.approveProcess(1, actor);

      expect(result).toEqual({ id: 1, status: 'Vigente' });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROCESS_APPROVED',
          actorUserId: 7,
          entityId: '1'
        }),
        mockManager
      );
    });
  });

  describe('rejectProcess (REQ-07)', () => {
    it('requires a non-empty rejection reason', async () => {
      await expect(service.rejectProcess(1, '  ')).rejects.toThrow(BadRequestException);
    });

    it('rejects with observations and sets status back to Borrador', async () => {
      mockManager.query
        .mockResolvedValueOnce([{ id: 1, versionId: 10, status: 'En revisión', elaborator: 'Creator', validation: null }])
        .mockResolvedValueOnce([{ name: 'Validator User' }])
        .mockResolvedValueOnce([]); // update status to Borrador with feedback

      const actor: AuthenticatedUser = { id: 8, profiles: ['VALIDATOR'], sessionHash: 'h', csrfHash: 'c' };
      const result = await service.rejectProcess(1, 'Faltan entradas detalladas', actor);

      expect(result).toEqual({ id: 1, status: 'Borrador', reason: 'Faltan entradas detalladas' });
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE"),
        [expect.stringContaining('Faltan entradas detalladas'), 10]
      );
    });
  });

  describe('newVersion (REQ-09, REQ-56)', () => {
    it('creates next version (v+1) in Borrador from Vigente version', async () => {
      mockManager.query
        .mockResolvedValueOnce([{
          ID: 1, CURRENT_VERSION_ID: 10, STATUS: 'Vigente', VERSION_NUMBER: 1,
          MACROPROCESS_ID: 1, PROCESS_TYPE_ID: 2, PARENT_PROCESS_ID: null,
          ELABORATOR: 'Old Elaborator', RESPONSIBLE: 'Resp', NAME: 'Test'
        }])
        .mockResolvedValueOnce([{ name: 'New Elaborator' }]) // actor displayName
        .mockResolvedValueOnce([]) // insert new version
        .mockResolvedValueOnce([{ id: 11 }]) // new version id
        .mockResolvedValueOnce([]); // update current_version_id on process

      const actor: AuthenticatedUser = { id: 3, profiles: ['PROCESS_OWNER'], sessionHash: 'h', csrfHash: 'c' };
      const result = await service.newVersion(1, actor);

      expect(result).toEqual({ id: 1, status: 'Borrador', versionNumber: 2 });
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE"),
        [11, 1]
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROCESS_NEW_VERSION_CREATED',
          afterValue: { versionNumber: 2, status: 'Borrador' }
        }),
        mockManager
      );
    });
  });

  describe('retireProcess', () => {
    it('retires a Vigente process to Obsoleto', async () => {
      mockManager.query
        .mockResolvedValueOnce([{ id: 1, versionId: 10, status: 'Vigente' }])
        .mockResolvedValueOnce([]); // update to Obsoleto

      const actor: AuthenticatedUser = { id: 1, profiles: ['ADMIN'], sessionHash: 'h', csrfHash: 'c' };
      const result = await service.retireProcess(1, actor);

      expect(result).toEqual({ id: 1, status: 'Obsoleto' });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROCESS_RETIRED',
          afterValue: { status: 'Obsoleto' }
        }),
        mockManager
      );
    });
  });
});

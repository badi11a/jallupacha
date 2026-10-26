import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { AuthGuard } from './auth/auth.guard';
import { ProcessRecordsService } from './process/process-records.service';
import { ProcessLifecycleService } from './process/process-lifecycle.service';
import { ProcessRisksService } from './risk/process-risks.service';
import { ProcessTypesService } from './structure/process-types.service';
import { UnitsService } from './structure/units.service';

describe('v15 application module composition', () => {
  it('resolves every domain against one shared database without opening a connection', async () => {
    const database = { isInitialized: false, destroy: jest.fn() };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource).useValue(database).compile();
    try {
      expect(moduleRef.get(DataSource)).toBe(database);
      expect(moduleRef.get(AuthGuard)).toBeInstanceOf(AuthGuard);
      for (const service of [ProcessRecordsService, ProcessLifecycleService, ProcessRisksService, ProcessTypesService, UnitsService]) {
        expect(moduleRef.get(service)).toBeInstanceOf(service);
      }
    } finally {
      await moduleRef.close();
    }
    expect(database.destroy).not.toHaveBeenCalled();
  });
});

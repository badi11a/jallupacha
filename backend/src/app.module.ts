import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { AuditController } from './audit/audit.controller';
import { AuditService } from './audit/audit.service';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { SessionService } from './auth/session.service';
import { databaseOptions, configuredRateLimit } from './common/config';
import { UsersController } from './identity/users.controller';
import { CatalogController } from './structure/catalog.controller';
import { CatalogService } from './structure/catalog.service';
import { ProcessController } from './process/process.controller';
import { ProcessMapController } from './process/process-map.controller';
import { ProcessMapService } from './process/process-map.service';
import { ProcessService } from './process/process.service';
import { RiskCatalogController } from './risk/risk-catalog.controller';
import { RiskController } from './risk/risk.controller';
import { RiskService } from './risk/risk.service';

const options = databaseOptions();
const rateLimit = configuredRateLimit();
const dataSource = new DataSource(options);

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: rateLimit.ttl,
      limit: rateLimit.limit
    }])
  ],
  controllers: [
    AuthController,
    UsersController,
    CatalogController,
    AuditController,
    ProcessController,
    ProcessMapController,
    RiskController,
    RiskCatalogController
  ],
  providers: [
    { provide: DataSource, useValue: dataSource },
    {
      provide: 'DATABASE_SHUTDOWN',
      useFactory: () => ({
        onModuleDestroy: async () => {
          if (dataSource.isInitialized) await dataSource.destroy();
        }
      })
    },
    AuditService,
    SessionService,
    CatalogService,
    ProcessService,
    ProcessMapService,
    RiskService,
    AuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: AuthGuard }
  ]
})
export class AppModule {}

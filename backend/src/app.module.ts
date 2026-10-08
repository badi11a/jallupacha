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
  controllers: [AuthController, UsersController, CatalogController, AuditController],
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
    AuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: AuthGuard }
  ]
})
export class AppModule {}

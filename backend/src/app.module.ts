import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuredRateLimit } from './common/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { AuditModule } from './audit/audit.module';
import { IdentityModule } from './identity/identity.module';
import { StructureModule } from './structure/structure.module';
import { ProcessModule } from './process/process.module';
import { RiskModule } from './risk/risk.module';

@Module({
 imports: [
  DatabaseModule,
  ThrottlerModule.forRoot([{ name: 'default', ...configuredRateLimit() }]),
  AuditModule, AuthModule, IdentityModule, StructureModule, ProcessModule, RiskModule
 ],
 providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
  { provide: APP_GUARD, useExisting: AuthGuard }
 ]
})
export class AppModule {}

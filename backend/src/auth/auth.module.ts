import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SessionService } from './session.service';
import { AuthGuard } from './auth.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [SessionService, AuthGuard],
  exports: [SessionService, AuthGuard]
})
export class AuthModule { }

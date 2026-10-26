import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { RiskCatalogController } from './risk-catalog.controller';
import { ProcessRisksController } from './process-risks.controller';
import { RiskService } from './risk.service';
import { ProcessRisksService } from './process-risks.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RiskController, RiskCatalogController, ProcessRisksController],
  providers: [RiskService, ProcessRisksService],
  exports: []
})
export class RiskModule { }

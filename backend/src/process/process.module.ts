import { Module } from '@nestjs/common';
import { ProcessController } from './process.controller';
import { ProcessMapController } from './process-map.controller';
import { ProcessRecordsController } from './process-records.controller';
import { ProcessLifecycleController } from './process-lifecycle.controller';
import { ProcessMapViewController } from './process-map-view.controller';
import { ProcessRelationsController } from './process-relations.controller';
import { ProcessService } from './process.service';
import { ProcessMapService } from './process-map.service';
import { ProcessRecordsService } from './process-records.service';
import { ProcessLifecycleService } from './process-lifecycle.service';
import { ProcessMapViewService } from './process-map-view.service';
import { ProcessRelationsService } from './process-relations.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ProcessController, ProcessMapController, ProcessRecordsController, ProcessLifecycleController, ProcessMapViewController, ProcessRelationsController],
  providers: [ProcessService, ProcessMapService, ProcessRecordsService, ProcessLifecycleService, ProcessMapViewService, ProcessRelationsService],
  exports: []
})
export class ProcessModule { }

import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { ProcessTypesController } from './process-types.controller';
import { UnitsController } from './units.controller';
import { CatalogService } from './catalog.service';
import { ProcessTypesService } from './process-types.service';
import { UnitsService } from './units.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CatalogController, ProcessTypesController, UnitsController],
  providers: [CatalogService, ProcessTypesService, UnitsService],
  exports: []
})
export class StructureModule { }

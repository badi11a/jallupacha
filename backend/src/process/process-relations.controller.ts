import { Body, Controller, Delete, HttpCode, Inject, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RequireProfiles } from '../common/auth.decorator';

import { ProcessRelationsService } from './process-relations.service';

@Controller('management')
@ApiTags('process-management')
@ApiCookieAuth('jallupacha_session')
export class ProcessRelationsController {
  constructor(@Inject(ProcessRelationsService) private readonly service: ProcessRelationsService) { }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Post('processes/:id/relations')
  addRelation(@Param('id', ParseIntPipe) id: number, @Body() body: unknown): Promise<unknown> {
    return this.service.addRelation(id, body);
  }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Patch('processes/:id/relations/:relationId')
  updateRelation(@Param('id', ParseIntPipe) id: number, @Param('relationId', ParseIntPipe) relationId: number, @Body() body: unknown): Promise<unknown> {
    return this.service.updateRelation(id, relationId, body);
  }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Delete('processes/:id/relations/:relationId')
  @HttpCode(204)
  deleteRelation(@Param('id', ParseIntPipe) id: number, @Param('relationId', ParseIntPipe) relationId: number): Promise<void> {
    return this.service.deleteRelation(id, relationId);
  }
}

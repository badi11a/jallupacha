import { Body, Controller, Inject, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequireProfiles } from '../common/auth.decorator';
import { AuthenticatedUser } from '../common/auth.types';
import { ProcessLifecycleService } from './process-lifecycle.service';

@Controller('management')
@ApiTags('process-management')
@ApiCookieAuth('jallupacha_session')
export class ProcessLifecycleController {
  constructor(@Inject(ProcessLifecycleService) private readonly service: ProcessLifecycleService) { }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Post('processes/:id/submit')
  submitProcess(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: AuthenticatedUser): Promise<unknown> {
    return this.service.submitProcess(id, actor);
  }

  @RequireProfiles('ADMIN', 'VALIDATOR')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Post('processes/:id/approve')
  approveProcess(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: AuthenticatedUser): Promise<unknown> {
    return this.service.approveProcess(id, actor);
  }

  @RequireProfiles('ADMIN', 'VALIDATOR')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Post('processes/:id/reject')
  rejectProcess(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @CurrentUser() actor?: AuthenticatedUser
  ): Promise<unknown> {
    return this.service.rejectProcess(id, body?.reason ?? '', actor);
  }

  @RequireProfiles('ADMIN', 'PROCESS_OWNER')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Post('processes/:id/new-version')
  newVersion(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: AuthenticatedUser): Promise<unknown> {
    return this.service.newVersion(id, actor);
  }

  @RequireProfiles('ADMIN')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @Post('processes/:id/retire')
  retireProcess(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor?: AuthenticatedUser): Promise<unknown> {
    return this.service.retireProcess(id, actor);
  }
}

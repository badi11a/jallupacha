import { Controller, Get, Inject, ParseIntPipe, Query } from '@nestjs/common';
import { RequireProfiles } from '../common/auth.decorator';
import { AuditService } from './audit.service';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

@Controller('audit')
@RequireProfiles('ADMIN')
@ApiTags('audit')
@ApiCookieAuth('jallupacha_session')
export class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50
  ) {
    const currentPage = Math.max(1, page);
    const pageSize = Math.min(100, Math.max(1, limit));
    return this.audit.list(currentPage, pageSize).then(({ items, total }) => ({
      items,
      page: currentPage,
      limit: pageSize,
      total
    }));
  }
}

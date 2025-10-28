import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(AuthGuard('jwt'))
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getLogs(
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.auditService.getLogs({
      resourceType,
      resourceId,
      userId,
      limit,
      offset,
    });
  }

  @Get('stats')
  async getStats(@Query('timeRange') timeRange?: string) {
    return this.auditService.getStats(timeRange);
  }
}

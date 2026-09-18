import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { ActivityLogService } from './activity-log.service';

@ApiTags('ActivityLog')
@ApiBearerAuth('access-token')
@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogController {
    constructor(
        private readonly activityLogService: ActivityLogService,
    ) { }

    @Get()
    findAll(
        @CurrentUser() user,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.activityLogService.findAllForUser(
            user.userId,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 20,
        );
    }
}
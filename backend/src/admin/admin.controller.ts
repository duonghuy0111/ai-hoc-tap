import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ActivityLogService } from 'src/activity-log/activity-log.service';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly activityLogService: ActivityLogService,
    ) { }

    @Get('users')
    getAllUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
        return this.adminService.getAllUsers(page ? Number(page) : undefined, limit ? Number(limit) : undefined);
    }

    @Get('stats')
    getSystemStats() {
        return this.adminService.getSystemStats();
    }

    @Get('activity-logs')
    getAllActivityLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
        return this.activityLogService.findAllGlobal(page ? Number(page) : undefined, limit ? Number(limit) : undefined);
    }
}

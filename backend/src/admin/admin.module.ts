import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
    imports: [PrismaModule, ActivityLogModule],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }

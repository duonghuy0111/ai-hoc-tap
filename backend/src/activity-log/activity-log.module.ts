import { Global, Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma.module';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';

@Global()
@Module({
    imports: [PrismaModule],
    controllers: [ActivityLogController],
    providers: [ActivityLogService],
    exports: [ActivityLogService],
})
export class ActivityLogModule { }
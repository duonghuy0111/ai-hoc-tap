import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { ReminderService } from "./reminder.service";
import { CurrentUser } from "src/auth/current-user.decorator";
import { PushService } from "./push.service";
import { SubscribePushDto } from "./dto/subscribe-push.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";


@ApiTags('Reminder')
@ApiBearerAuth('access-token')
@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class ReminderController {
    constructor(
        private readonly reminderService: ReminderService,
        private readonly pushService: PushService,
    ) { }


    @Post('trigger-now')
    @UseGuards(RolesGuard)
    @Roles('admin')
    async triggerNow() {
        return this.reminderService.triggerManually();
    }

    @Post('push/subscribe')
    async subscribe(
        @CurrentUser() user,
        @Body() dto: SubscribePushDto,
    ) {
        await this.pushService.saveSubscription(
            user.userId,
            dto.endpoint,
            dto.keys.p256dh,
            dto.keys.auth
        );
        return { message: 'Đã đăng ký nhận thông báo' };
    }
}
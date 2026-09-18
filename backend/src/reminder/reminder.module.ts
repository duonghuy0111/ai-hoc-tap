import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "prisma/prisma.module";
import { EmailService } from "./email.service";
import { ReminderService } from "./reminder.service";
import { ReminderController } from "./reminder.controller";
import { PushService } from "./push.service";

@Module({
    imports: [ScheduleModule.forRoot(), PrismaModule],
    controllers: [ReminderController],
    providers: [EmailService, ReminderService, PushService],
})
export class ReminderModule { }
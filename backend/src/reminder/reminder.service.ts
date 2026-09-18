import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "prisma/prisma.service";
import { EmailService } from "./email.service";
import { PushService } from "./push.service";

@Injectable()
export class ReminderService {
    private readonly logger = new Logger(ReminderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly pushService: PushService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async checkAndSendReminders() {
        this.logger.log('Bắt đầu kiểm tra topic cần nhắc nhở....');

        const dueTopics = await this.prisma.studyTopic.findMany({
            where: { nextReviewAt: { lte: new Date() } },
            include: { subject: { include: { user: true } } },
        });

        this.logger.log(`Tìm thấy ${dueTopics.length} topic cần nhắc nhở`);

        for (const topic of dueTopics) {
            const user = topic.subject.user;
            try {
                const [sentEmail, sentPush] = await Promise.all([
                    this.emailService.sendReviewReminder(
                        user.email,
                        topic.title,
                        topic.masteryScore,
                    ),
                    this.pushService.sendToUser(
                        user.id,
                        `Ôn lại: ${topic.title}`,
                        `Mức độ nắm vững: ${topic.masteryScore.toFixed(0)}%`,
                    ),
                ]);

                await this.prisma.reminderLog.createMany({
                    data: [
                        {
                            userId: user.id,
                            studyTopicId: topic.id,
                            channel: 'email',
                            emailStatus: sentEmail ? 'sent' : 'failed',
                        },
                        {
                            userId: user.id,
                            studyTopicId: topic.id,
                            channel: 'push',
                            emailStatus: sentPush ? 'sent' : 'failed',
                        },
                    ],
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(
                    `Gửi nhắc nhở thất bại cho topic ${topic.id} (user ${user.id}): ${message}`,
                );
            }
        }
        this.logger.log('Hoàn tất kiểm tra nhắc nhở');

    }
    async triggerManually() {
        await this.checkAndSendReminders();
        return {
            message: 'Đã trigger kiểm tra nhắc nhở thủ công'
        };
    }
}
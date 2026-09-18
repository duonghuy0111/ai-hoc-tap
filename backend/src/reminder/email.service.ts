import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly transporter: nodemailer.Transporter;

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.getOrThrow<string>('EMAIL_USER'),
                pass: this.configService.getOrThrow<string>('EMAIL_APP_PASSWORD'),
            },
        });
    }

    async sendReviewReminder(toEmail: string, topicTitle: string, masteryScore: number): Promise<boolean> {
        try {
            await this.transporter.sendMail({
                from: `"AI học tập" <${this.configService.get('EMAIL_USER')}>`,
                to: toEmail,
                subject: `Đến giờ ôn lại: ${topicTitle}`,
                html: `
                    <p>Chào bạn,</p>
                    <p>Đã đến giờ ôn lại chủ đề <strong>${topicTitle}</strong>.</p>
                    <p>Mức độ nắm vững hiện tại: <strong>${masteryScore.toFixed(0)}%</strong>.</p>
                    <p>Vào hệ thống để làm lại quiz và củng cố kiến thức nhé!</p>
                `,
            });
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Gửi email thất bại tới ${toEmail}: ${message}`);
            return false;
        }
    }
}
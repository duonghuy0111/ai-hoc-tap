import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';
import * as webpush from 'web-push';

@Injectable()
export class PushService {
    private readonly logger = new Logger(PushService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        webpush.setVapidDetails(
            this.configService.getOrThrow('VAPID_SUBJECT'),
            this.configService.getOrThrow('VAPID_PUBLIC_KEY'),
            this.configService.getOrThrow('VAPID_PRIVATE_KEY'),
        );
    }

    async saveSubscription(userId: string, endpoint: string, p256dhKey: string, authKey: string) {
        await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
        return this.prisma.pushSubscription.create({
            data: { userId, endpoint, p256dhKey, authKey },
        });
    }

    async sendToUser(userId: string, title: string, body: string): Promise<boolean> {
        const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
        if (subscriptions.length === 0) return false;

        const result = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
                        },
                        JSON.stringify({ title, body }),
                    );
                    return true;
                } catch (error: any) {
                    this.logger.warn(`Push thất bại tới subscription ${sub.id}: ${error?.message || error}`);
                    if (error?.statusCode === 410 || error?.statusCode === 404) {
                        await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
                    }
                    return false;
                }
            })
        );
        return result.some((r) => r.status === 'fulfilled' && r.value === true);

    }
}
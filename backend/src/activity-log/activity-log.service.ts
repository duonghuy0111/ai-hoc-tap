import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type ActivityAction =
    | 'auth.register'
    | 'auth.login'
    | 'subject.create'
    | 'subject.delete'
    | 'material.upload'
    | 'quiz.generate'
    | 'quiz.submit';

@Injectable()
export class ActivityLogService {
    private readonly logger = new Logger(ActivityLogService.name);

    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async log(
        userId: string,
        action: ActivityAction,
        options?: { entityType?: string; entityId?: string; metadata?: Prisma.InputJsonValue },
    ): Promise<void> {
        try {
            await this.prisma.activityLog.create({
                data: {
                    userId,
                    action,
                    entityType: options?.entityType,
                    entityId: options?.entityId,
                    metadata: options?.metadata ?? Prisma.JsonNull,
                },
            });
        } catch (error) {
            this.logger.error(`Không ghi được activity log (action=${action}, userId=${userId})`, error);
        }
    }

    async findAllForUser(userId: string, page = 1, limit = 20) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(Math.max(1, limit), 100);
        const skip = (safePage - 1) * safeLimit;

        const [items, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: safeLimit,
            }),
            this.prisma.activityLog.count({ where: { userId } }),
        ]);

        return { items, total, page: safePage, limit: safeLimit };
    }

    async findAllGlobal(page = 1, limit = 20) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(Math.max(1, limit), 100);
        const skip = (safePage - 1) * safeLimit;

        const [items, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: safeLimit,
                include: { user: { select: { name: true, email: true } } },
            }),
            this.prisma.activityLog.count(),
        ]);

        return { items, total, page: safePage, limit: safeLimit };
    }
}
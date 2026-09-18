import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AdminService {
    constructor(private readonly prisma: PrismaService) { }

    async getAllUsers(page = 1, limit = 20) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(Math.max(1, limit), 100);
        const skip = (safePage - 1) * safeLimit;

        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: safeLimit,
                select: { id: true, name: true, email: true, role: true, createdAt: true },
            }),
            this.prisma.user.count(),
        ]);

        return { items, total, page: safePage, limit: safeLimit };
    }

    async getSystemStats() {
        const [totalUsers, totalSubjects, totalMaterials, totalQuizzes, totalAttempts, avgScore] =
            await Promise.all([
                this.prisma.user.count(),
                this.prisma.subject.count(),
                this.prisma.material.count(),
                this.prisma.quiz.count(),
                this.prisma.quizAttempt.count(),
                this.prisma.quizAttempt.aggregate({ _avg: { score: true } }),
            ]);

        return {
            totalUsers,
            totalSubjects,
            totalMaterials,
            totalQuizzes,
            totalQuizAttempts: totalAttempts,
            averageScoreAcrossSystem: avgScore._avg.score ?? null,
        };
    }
}

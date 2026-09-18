import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async getOverview(userId: string) {
        const [scoreAgg, totalAttempts, weakTopics, topicsToReview, recentAttempts] =
            await Promise.all([
                this.prisma.quizAttempt.aggregate({
                    where: { userId },
                    _avg: { score: true },
                }),
                this.prisma.quizAttempt.count({ where: { userId } }),
                this.prisma.studyTopic.findMany({
                    where: { subject: { userId } },
                    orderBy: { masteryScore: 'asc' },
                    take: 5,
                    include: { subject: { select: { name: true } } },
                }),
                this.prisma.studyTopic.findMany({
                    where: {
                        subject: { userId },
                        nextReviewAt: { lte: new Date() },
                    },
                    orderBy: { masteryScore: 'asc' },
                    take: 5,
                    include: { subject: { select: { name: true } } },
                }),
                this.prisma.quizAttempt.findMany({
                    where: { userId },
                    orderBy: { attemptedAt: 'desc' },
                    take: 5,
                    include: {
                        quiz: {
                            select: { title: true, subject: { select: { name: true } } },
                        },
                    },
                }),
            ]);

        return {
            averageScore: scoreAgg._avg.score ?? null,
            totalQuizzesTaken: totalAttempts,
            weakTopics: weakTopics.map((t) => ({
                id: t.id,
                title: t.title,
                subjectName: t.subject.name,
                masteryScore: t.masteryScore,
            })),
            topicsToReview: topicsToReview.map((t) => ({
                id: t.id,
                title: t.title,
                subjectName: t.subject.name,
                masteryScore: t.masteryScore,
                nextReviewAt: t.nextReviewAt,
            })),
            recentAttempts: recentAttempts.map((a) => ({
                id: a.id,
                quizTitle: a.quiz.title,
                subjectName: a.quiz.subject.name,
                score: a.score,
                attemptedAt: a.attemptedAt,
            })),
        };
    }
}

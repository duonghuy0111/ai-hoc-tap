import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { GeneratedEssayQuestion, GeneratedMcqQuestion, QuizGenerationService } from "./quiz-generation.service";
import { EssayGradingService } from "./essay-grading.service";
import { StudyTopic } from "@prisma/client";
@Injectable()
export class QuizService {
    private readonly logger = new Logger(QuizService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly quizGenerationService: QuizGenerationService,
        private readonly essayGradingService: EssayGradingService,
    ) { }

    async generateFromMaterial(subjectId: string, materialId: string, numberOfQuestions: number, questionType: 'mcq' | 'essay') {
        const material = await this.prisma.material.findFirst({
            where: { id: materialId, subjectId },
        });
        if (!material) {
            throw new BadRequestException('Không tìm thấy tài liệu trong môn học này');
        }

        const validStatuses = ['ready', 'ready_embedding_failed'];
        if (!validStatuses.includes(material.status)) {
            throw new BadRequestException(
                `Tài liệu chưa sẵn sàng (trạng thái hiện tại: ${material.status}), không thể tạo quiz`,
            );
        }
        const chunks = await this.prisma.materialChunk.findMany({
            where: { materialId },
            orderBy: { chunkIndex: 'asc' },
        });
        if (chunks.length === 0) {
            throw new BadRequestException('Tài liệu không có nội dung để tạo quiz');
        }

        const sampledChunks = this.sampleChunks(chunks, 15);
        const questions = await this.quizGenerationService.generateQuestions(
            sampledChunks.map((c) => ({ content: c.content, page: c.page })),
            numberOfQuestions,
            questionType,
        );
        const quiz = await this.prisma.quiz.create({
            data: {
                subjectId,
                materialId,
                title: `Quiz: ${material.title}`,
                source: 'ai_generated',
            },
        });

        if (questionType === 'mcq') {
            const mcqQuestions = questions as GeneratedMcqQuestion[];
            await this.prisma.question.createMany({
                data: mcqQuestions.map((q) => ({
                    quizId: quiz.id,
                    questionType: 'mcq',
                    question: q.question,
                    optionA: q.optionA,
                    optionB: q.optionB,
                    optionC: q.optionC,
                    optionD: q.optionD,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                })),
            });
        } else {
            const essayQuestions = questions as GeneratedEssayQuestion[];
            await this.prisma.question.createMany({
                data: essayQuestions.map((q) => ({
                    quizId: quiz.id, questionType: 'essay',
                    question: q.question,
                    optionA: null, optionB: null, optionC: null, optionD: null,
                    correctAnswer: q.modelAnswer,
                    explanation: q.explanation,
                })),
            });
        }
        return this.prisma.quiz.findUnique({
            where: { id: quiz.id },
            include: { questions: true },
        });
    }

    private sampleChunks<T>(chunks: T[], maxCount: number): T[] {
        if (chunks.length <= maxCount)
            return chunks;
        const step = chunks.length / maxCount;
        const result: T[] = [];
        for (let i = 0; i < maxCount; i++) {
            result.push(chunks[Math.floor(i * step)]);
        }
        return result;
    }
    async findAllBySubject(subjectId: string) {
        const quizzes = await this.prisma.quiz.findMany({
            where: { subjectId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { questions: true } },
                questions: { take: 1, select: { questionType: true } },
            },
        });
        return quizzes.map((q) => ({
            ...q,
            questionType: q.questions[0]?.questionType ?? 'mcq',
            questions: undefined,
        }));
    }
    async findOne(subjectId: string, quizId: string) {
        const quiz = await this.prisma.quiz.findFirst({
            where: { id: quizId, subjectId },
            include: { questions: true },
        });
        if (!quiz) {
            throw new BadRequestException('Không tìm thấy quiz');
        }
        return quiz;
    }
    async submitAttempt(userId: string, subjectId: string, quizId: string, answers: { questionId: string; selected: string }[]) {
        const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId, subjectId, subject: { userId, }, }, });
        if (!quiz) {
            throw new BadRequestException('Không tìm thấy quiz');
        }
        const questions = await this.prisma.question.findMany({ where: { quizId } });
        if (questions.length === 0) {
            throw new BadRequestException('Quiz không có câu hỏi');
        }

        const mcqResults = new Map<string, any>();
        for (const q of questions) {
            if (q.questionType !== 'mcq') continue;
            const userAnswer = answers.find((a) => a.questionId === q.id);
            const selectedText = userAnswer?.selected ?? '';
            const isCorrect = userAnswer?.selected === q.correctAnswer;
            const scorePercent = isCorrect ? 100 : 0;
            mcqResults.set(q.id, {
                questionId: q.id, questionType: 'mcq', selected: selectedText || null,
                correctAnswer: q.correctAnswer, isCorrect, scorePercent,
                explanation: q.explanation,
            });
        }

        const essayQuestions = questions.filter((q) => q.questionType === 'essay');
        const essaySettled = await Promise.allSettled(
            essayQuestions.map((q) => {
                const userAnswer = answers.find((a) => a.questionId === q.id);
                return this.essayGradingService.gradeAnswer(q.question, q.correctAnswer, userAnswer?.selected ?? '');
            }),
        );

        const essayResults = new Map<string, any>();
        essayQuestions.forEach((q, i) => {
            const userAnswer = answers.find((a) => a.questionId === q.id);
            const selectedText = userAnswer?.selected ?? '';
            const settled = essaySettled[i];
            const graded = settled.status === 'fulfilled'
                ? settled.value
                : {
                    score: 0,
                    feedback: 'Không thể chấm điểm câu này do lỗi hệ thống, vui lòng liên hệ giảng viên.',
                    correctPoints: [],
                    missingPoints: [],
                    suggestion: 'Vui lòng thử nộp lại hoặc liên hệ giảng viên để được chấm thủ công.',
                };
            essayResults.set(q.id, {
                questionId: q.id, questionType: 'essay', selected: selectedText || null,
                correctAnswer: q.correctAnswer, isCorrect: graded.score >= 70, scorePercent: graded.score,
                feedback: graded.feedback,
                correctPoints: graded.correctPoints,
                missingPoints: graded.missingPoints,
                suggestion: graded.suggestion,
                explanation: q.explanation,
            });
        });

        const detailedAnswers = questions.map((q) => mcqResults.get(q.id) ?? essayResults.get(q.id));
        const totalScorePercent = detailedAnswers.reduce((sum, d) => sum + d.scorePercent, 0);

        const score = totalScorePercent / questions.length;
        const correctCount = detailedAnswers.filter((d) => d.isCorrect).length;
        const attempt = await this.prisma.quizAttempt.create({
            data: {
                quizId,
                userId,
                score,
                answersJson: detailedAnswers,
            },
        });

        let studyTopic: StudyTopic | null = null;
        if (quiz.materialId) {
            studyTopic = await this.updateMasteryScore(quiz.subjectId, quiz.materialId, score);
        }
        return { attemptId: attempt.id, score, totalQuestions: questions.length, correctCount, details: detailedAnswers, masteryScore: studyTopic?.masteryScore ?? null, };
    }
    private async updateMasteryScore(subjectId: string, materialId: string, latestScore: number): Promise<StudyTopic | null> {
        const material = await this.prisma.material.findUnique({ where: { id: materialId } });
        if (!material)
            return null;

        const existing = await this.prisma.studyTopic.findFirst({
            where: { subjectId, title: material.title },
        });
        const now = new Date();

        if (existing) {
            const newMastery = existing.masteryScore * 0.6 + latestScore * 0.4;
            const newInterval = this.calculateNextInterval(newMastery, existing.intervalDays);
            const nextReviewAt = this.addDays(now, newInterval);

            return this.prisma.studyTopic.update({
                where: { id: existing.id },
                data: {
                    masteryScore: newMastery,
                    intervalDays: newInterval,
                    lastReviewedAt: new Date(),
                    nextReviewAt,
                },
            });
        }
        const initialInterval = this.calculateNextInterval(latestScore, 1);
        return this.prisma.studyTopic.create({
            data: {
                subjectId,
                title: material.title,
                masteryScore: latestScore,
                intervalDays: initialInterval,
                lastReviewedAt: now,
                nextReviewAt: this.addDays(now, initialInterval),
            },
        });
    }
    private calculateNextInterval(masteryScore: number, currentInterval: number): number {
        if (masteryScore >= 80) return Math.min(currentInterval * 2, 30);
        if (masteryScore >= 50) return 3;
        return 1;
    }

    private addDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
}
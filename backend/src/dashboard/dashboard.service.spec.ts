import { DashboardService } from './dashboard.service';

describe('DashboardService - getOverview', () => {
    const mockPrisma = {
        quizAttempt: {
            aggregate: jest.fn(),
            count: jest.fn(),
            findMany: jest.fn(),
        },
        studyTopic: {
            findMany: jest.fn(),
        },
    };

    let service: DashboardService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DashboardService(mockPrisma as any);
    });

    it('trả về averageScore = null khi user chưa làm bài quiz nào (phân biệt với điểm 0)', async () => {
        mockPrisma.quizAttempt.aggregate.mockResolvedValue({ _avg: { score: null } });
        mockPrisma.quizAttempt.count.mockResolvedValue(0);
        mockPrisma.studyTopic.findMany.mockResolvedValue([]);
        mockPrisma.quizAttempt.findMany.mockResolvedValue([]);

        const result = await service.getOverview('user-1');

        expect(result.averageScore).toBeNull();
        expect(result.totalQuizzesTaken).toBe(0);
    });

    it('tính đúng điểm trung bình và tổng số lượt làm quiz', async () => {
        mockPrisma.quizAttempt.aggregate.mockResolvedValue({ _avg: { score: 72.5 } });
        mockPrisma.quizAttempt.count.mockResolvedValue(4);
        mockPrisma.studyTopic.findMany.mockResolvedValue([]);
        mockPrisma.quizAttempt.findMany.mockResolvedValue([]);

        const result = await service.getOverview('user-1');

        expect(result.averageScore).toBe(72.5);
        expect(result.totalQuizzesTaken).toBe(4);
    });

    it('map đúng weakTopics kèm tên môn học (subjectName lấy từ include)', async () => {
        mockPrisma.quizAttempt.aggregate.mockResolvedValue({ _avg: { score: 50 } });
        mockPrisma.quizAttempt.count.mockResolvedValue(1);
        mockPrisma.studyTopic.findMany
            .mockResolvedValueOnce([
                { id: 't1', title: 'Kiểm thử hộp đen', masteryScore: 20, subject: { name: 'Kiểm thử phần mềm' } },
            ])
            .mockResolvedValueOnce([]); 
        mockPrisma.quizAttempt.findMany.mockResolvedValue([]);

        const result = await service.getOverview('user-1');

        expect(result.weakTopics).toEqual([
            { id: 't1', title: 'Kiểm thử hộp đen', subjectName: 'Kiểm thử phần mềm', masteryScore: 20 },
        ]);
    });

    it('gọi studyTopic.findMany lần 2 (topicsToReview) với điều kiện nextReviewAt <= hiện tại', async () => {
        mockPrisma.quizAttempt.aggregate.mockResolvedValue({ _avg: { score: null } });
        mockPrisma.quizAttempt.count.mockResolvedValue(0);
        mockPrisma.studyTopic.findMany.mockResolvedValue([]);
        mockPrisma.quizAttempt.findMany.mockResolvedValue([]);

        await service.getOverview('user-1');

        const secondCallArgs = mockPrisma.studyTopic.findMany.mock.calls[1][0];
        expect(secondCallArgs.where.nextReviewAt.lte).toBeInstanceOf(Date);
        expect(secondCallArgs.where.subject.userId).toBe('user-1');
    });

    it('map đúng recentAttempts kèm tên quiz và môn học', async () => {
        mockPrisma.quizAttempt.aggregate.mockResolvedValue({ _avg: { score: 80 } });
        mockPrisma.quizAttempt.count.mockResolvedValue(1);
        mockPrisma.studyTopic.findMany.mockResolvedValue([]);
        const attemptedAt = new Date('2026-08-01T00:00:00Z');
        mockPrisma.quizAttempt.findMany.mockResolvedValue([
            {
                id: 'a1',
                score: 80,
                attemptedAt,
                quiz: { title: 'Quiz chương 1', subject: { name: 'Kiểm thử phần mềm' } },
            },
        ]);

        const result = await service.getOverview('user-1');

        expect(result.recentAttempts).toEqual([
            {
                id: 'a1',
                quizTitle: 'Quiz chương 1',
                subjectName: 'Kiểm thử phần mềm',
                score: 80,
                attemptedAt,
            },
        ]);
    });
});

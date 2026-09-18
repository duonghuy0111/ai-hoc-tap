import { AdminService } from './admin.service';

describe('AdminService', () => {
    const mockPrisma = {
        user: { findMany: jest.fn(), count: jest.fn() },
        subject: { count: jest.fn() },
        material: { count: jest.fn() },
        quiz: { count: jest.fn() },
        quizAttempt: { count: jest.fn(), aggregate: jest.fn() },
    };

    let service: AdminService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new AdminService(mockPrisma as any);
    });

    describe('getAllUsers', () => {
        it('không bao giờ trả về field password, kể cả cho admin', async () => {
            mockPrisma.user.findMany.mockResolvedValue([
                { id: 'u1', name: 'A', email: 'a@test.com', role: 'user', createdAt: new Date() },
            ]);
            mockPrisma.user.count.mockResolvedValue(1);

            await service.getAllUsers();

            const selectArg = mockPrisma.user.findMany.mock.calls[0][0].select;
            expect(selectArg.password).toBeUndefined();
        });

        it('giới hạn limit tối đa 100, không cho truyền limit quá lớn', async () => {
            mockPrisma.user.findMany.mockResolvedValue([]);
            mockPrisma.user.count.mockResolvedValue(0);

            const result = await service.getAllUsers(1, 99999);

            expect(result.limit).toBe(100);
        });
    });

    describe('getSystemStats', () => {
        it('trả về averageScoreAcrossSystem = null khi hệ thống chưa có lượt làm quiz nào', async () => {
            mockPrisma.user.count.mockResolvedValue(5);
            mockPrisma.subject.count.mockResolvedValue(10);
            mockPrisma.material.count.mockResolvedValue(20);
            mockPrisma.quiz.count.mockResolvedValue(3);
            mockPrisma.quizAttempt.count.mockResolvedValue(0);
            mockPrisma.quizAttempt.aggregate.mockResolvedValue({ _avg: { score: null } });

            const result = await service.getSystemStats();

            expect(result.averageScoreAcrossSystem).toBeNull();
            expect(result.totalUsers).toBe(5);
            expect(result.totalQuizAttempts).toBe(0);
        });

        it('tính đúng các chỉ số khi hệ thống có dữ liệu', async () => {
            mockPrisma.user.count.mockResolvedValue(12);
            mockPrisma.subject.count.mockResolvedValue(30);
            mockPrisma.material.count.mockResolvedValue(45);
            mockPrisma.quiz.count.mockResolvedValue(18);
            mockPrisma.quizAttempt.count.mockResolvedValue(60);
            mockPrisma.quizAttempt.aggregate.mockResolvedValue({ _avg: { score: 71.5 } });

            const result = await service.getSystemStats();

            expect(result).toEqual({
                totalUsers: 12,
                totalSubjects: 30,
                totalMaterials: 45,
                totalQuizzes: 18,
                totalQuizAttempts: 60,
                averageScoreAcrossSystem: 71.5,
            });
        });
    });
});

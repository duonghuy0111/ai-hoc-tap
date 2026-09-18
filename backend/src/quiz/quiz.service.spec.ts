import { QuizService } from './quiz.service';

describe('QuizService - calculateNextInterval (công thức SM-2 rút gọn)', () => {
    let service: QuizService;

    beforeEach(() => {
        service = new QuizService({} as any, {} as any, {} as any);
    });

    const calculateNextInterval = (masteryScore: number, currentInterval: number): number =>
        (service as any).calculateNextInterval(masteryScore, currentInterval);

    it('mastery >= 80: nhân đôi interval hiện tại, tối đa 30 ngày (ôn thưa hơn)', () => {
        expect(calculateNextInterval(85, 5)).toBe(10);
        expect(calculateNextInterval(100, 20)).toBe(30);
    });

    it('mastery từ 50 đến dưới 80: cố định 3 ngày (mức trung bình)', () => {
        expect(calculateNextInterval(50, 10)).toBe(3);
        expect(calculateNextInterval(79, 1)).toBe(3);
    });

    it('mastery dưới 50: về lại 1 ngày (cần ôn gấp)', () => {
        expect(calculateNextInterval(0, 15)).toBe(1);
        expect(calculateNextInterval(49, 20)).toBe(1);
    });
});

describe('QuizService - submitAttempt (chấm điểm trắc nghiệm)', () => {
    const mockPrisma = {
        quiz: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },
        question: { findMany: jest.fn() },
        quizAttempt: { create: jest.fn() },
        material: { findUnique: jest.fn() },
        studyTopic: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    };
    const mockQuizGenerationService = {};
    const mockEssayGradingService = { gradeAnswer: jest.fn() };

    let service: QuizService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new QuizService(
            mockPrisma as any,
            mockQuizGenerationService as any,
            mockEssayGradingService as any,
        );
        mockPrisma.quiz.findFirst.mockResolvedValue({ id: 'quiz-1', subjectId: 'subj-1', materialId: null });
        mockPrisma.quizAttempt.create.mockImplementation(({ data }: any) =>
            Promise.resolve({ id: 'attempt-1', ...data }),
        );
    });

    it('chấm đúng 2/2 câu trắc nghiệm -> score 100, correctCount = 2', async () => {
        mockPrisma.question.findMany.mockResolvedValue([
            { id: 'q1', questionType: 'mcq', correctAnswer: 'A', explanation: '' },
            { id: 'q2', questionType: 'mcq', correctAnswer: 'B', explanation: '' },
        ]);

        const result = await service.submitAttempt('user-1', 'subj-1', 'quiz-1', [
            { questionId: 'q1', selected: 'A' },
            { questionId: 'q2', selected: 'B' },
        ]);

        expect(result.score).toBe(100);
        expect(result.correctCount).toBe(2);
    });

    it('trả lời sai 1/2 câu -> score trung bình 50, correctCount = 1', async () => {
        mockPrisma.question.findMany.mockResolvedValue([
            { id: 'q1', questionType: 'mcq', correctAnswer: 'A', explanation: '' },
            { id: 'q2', questionType: 'mcq', correctAnswer: 'B', explanation: '' },
        ]);

        const result = await service.submitAttempt('user-1', 'subj-1', 'quiz-1', [
            { questionId: 'q1', selected: 'A' },
            { questionId: 'q2', selected: 'C' }, // sai
        ]);

        expect(result.score).toBe(50);
        expect(result.correctCount).toBe(1);
    });

    it('không trả lời một câu (thiếu trong mảng answers) -> tính như sai, không crash', async () => {
        mockPrisma.question.findMany.mockResolvedValue([
            { id: 'q1', questionType: 'mcq', correctAnswer: 'A', explanation: '' },
        ]);

        const result = await service.submitAttempt('user-1', 'subj-1', 'quiz-1', []);

        expect(result.score).toBe(0);
        expect(result.correctCount).toBe(0);
    });

    it('câu tự luận: nếu essayGradingService lỗi (throw), vẫn trả về score 0 thay vì crash cả bài', async () => {
        mockPrisma.question.findMany.mockResolvedValue([
            { id: 'q1', questionType: 'essay', correctAnswer: 'Đáp án mẫu', explanation: '' },
        ]);
        mockEssayGradingService.gradeAnswer.mockRejectedValue(new Error('OpenAI timeout'));

        const result = await service.submitAttempt('user-1', 'subj-1', 'quiz-1', [
            { questionId: 'q1', selected: 'Câu trả lời của sinh viên' },
        ]);

        expect(result.score).toBe(0);
        expect(result.details[0].feedback).toContain('liên hệ giảng viên');
    });

    it('câu tự luận: truyền đủ correctPoints, missingPoints, suggestion từ EssayGradingService qua kết quả trả về', async () => {
        mockPrisma.question.findMany.mockResolvedValue([
            { id: 'q1', questionType: 'essay', correctAnswer: 'Đáp án mẫu', explanation: '' },
        ]);
        mockEssayGradingService.gradeAnswer.mockResolvedValue({
            score: 70,
            feedback: 'Đúng phần lớn ý chính.',
            correctPoints: ['Nêu đúng khái niệm cơ bản'],
            missingPoints: ['Chưa nêu ví dụ minh họa'],
            suggestion: 'Nên bổ sung ví dụ cụ thể để làm rõ ý.',
        });

        const result = await service.submitAttempt('user-1', 'subj-1', 'quiz-1', [
            { questionId: 'q1', selected: 'Câu trả lời của sinh viên' },
        ]);

        expect(result.details[0].correctPoints).toEqual(['Nêu đúng khái niệm cơ bản']);
        expect(result.details[0].missingPoints).toEqual(['Chưa nêu ví dụ minh họa']);
        expect(result.details[0].suggestion).toBe('Nên bổ sung ví dụ cụ thể để làm rõ ý.');
    });

    it('quiz không có câu hỏi nào -> ném BadRequestException, không tạo attempt', async () => {
        mockPrisma.question.findMany.mockResolvedValue([]);

        await expect(
            service.submitAttempt('user-1', 'subj-1', 'quiz-1', []),
        ).rejects.toThrow('Quiz không có câu hỏi');
        expect(mockPrisma.quizAttempt.create).not.toHaveBeenCalled();
    });

    it('từ chối submit khi quiz không thuộc subject của user', async () => {
        mockPrisma.quiz.findFirst.mockResolvedValue(null);

        await expect(
            service.submitAttempt('user-1', 'subj-other', 'quiz-1', []),
        ).rejects.toThrow('Không tìm thấy quiz');

        expect(mockPrisma.question.findMany).not.toHaveBeenCalled();
        expect(mockPrisma.quizAttempt.create).not.toHaveBeenCalled();
    });
});
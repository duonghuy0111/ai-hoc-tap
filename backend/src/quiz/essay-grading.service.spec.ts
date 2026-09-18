import { EssayGradingService } from './essay-grading.service';

describe('EssayGradingService - gradeAnswer', () => {
    const mockConfigService = {
        getOrThrow: jest.fn().mockReturnValue('fake-api-key'),
    };

    let service: EssayGradingService;

    beforeEach(() => {
        service = new EssayGradingService(mockConfigService as any);
    });

    it('câu trả lời rỗng -> trả về ngay score=0 kèm đủ 5 field, không gọi OpenAI', async () => {
        const result = await service.gradeAnswer('Câu hỏi mẫu', 'Đáp án mẫu', '');

        expect(result.score).toBe(0);
        expect(result.feedback).toBeTruthy();
        expect(result.correctPoints).toEqual([]);
        expect(result.missingPoints.length).toBeGreaterThan(0);
        expect(result.suggestion).toBeTruthy();
    });

    it('chỉ có khoảng trắng -> vẫn coi là không trả lời, không gọi OpenAI', async () => {
        const result = await service.gradeAnswer('Câu hỏi mẫu', 'Đáp án mẫu', '   ');

        expect(result.score).toBe(0);
        expect(result.correctPoints).toEqual([]);
    });

    it('parse đúng response hợp lệ từ LLM thành đủ 5 field (correctPoints, missingPoints, suggestion tách bạch khỏi feedback)', async () => {
        const mockCreate = jest.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            score: 75,
                            feedback: 'Trả lời khá tốt, còn thiếu 1 ý.',
                            correctPoints: ['Nêu đúng định nghĩa', 'Nêu đúng ví dụ'],
                            missingPoints: ['Chưa giải thích nguyên nhân'],
                            suggestion: 'Bổ sung phần giải thích nguyên nhân để câu trả lời đầy đủ hơn.',
                        }),
                    },
                },
            ],
        });
        (service as any).client = { chat: { completions: { create: mockCreate } } };

        const result = await service.gradeAnswer(
            'Tại sao cần kiểm thử phần mềm?',
            'Đáp án mẫu đầy đủ',
            'Câu trả lời của sinh viên',
        );

        expect(result.score).toBe(75);
        expect(result.correctPoints).toEqual(['Nêu đúng định nghĩa', 'Nêu đúng ví dụ']);
        expect(result.missingPoints).toEqual(['Chưa giải thích nguyên nhân']);
        expect(result.suggestion).toBe('Bổ sung phần giải thích nguyên nhân để câu trả lời đầy đủ hơn.');
    });

    it('LLM trả về thiếu field correctPoints/missingPoints -> tự động default về mảng rỗng thay vì crash (Zod .default([]))', async () => {
        const mockCreate = jest.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            score: 100,
                            feedback: 'Hoàn toàn chính xác.',
                            suggestion: 'Không cần cải thiện thêm.',
                        }),
                    },
                },
            ],
        });
        (service as any).client = { chat: { completions: { create: mockCreate } } };

        const result = await service.gradeAnswer('Câu hỏi', 'Đáp án', 'Trả lời');

        expect(result.correctPoints).toEqual([]);
        expect(result.missingPoints).toEqual([]);
    });

    it('LLM trả về JSON không hợp lệ (thiếu suggestion bắt buộc) -> ném lỗi thay vì âm thầm trả sai cấu trúc', async () => {
        const mockCreate = jest.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({ score: 50, feedback: 'Thiếu suggestion' }),
                    },
                },
            ],
        });
        (service as any).client = { chat: { completions: { create: mockCreate } } };

        await expect(service.gradeAnswer('Câu hỏi', 'Đáp án', 'Trả lời')).rejects.toThrow();
    });
});

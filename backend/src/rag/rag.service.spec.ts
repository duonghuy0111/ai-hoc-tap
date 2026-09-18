import { RagService } from './rag.service';

describe('RagService - askQuestion (lọc ngữ cảnh theo threshold)', () => {
    const mockPrisma = {
        chatMessage: {
            create: jest.fn().mockResolvedValue({}),
            findMany: jest.fn(),
        },
        $queryRaw: jest.fn(),
    };
    const mockEmbeddingService = {
        embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };
    const mockRerankService = {
        rerank: jest.fn(),
    };
    const mockAnswerGenerationService = {
        generateAnswer: jest.fn().mockResolvedValue('Câu trả lời từ AI dựa trên ngữ cảnh.'),
    };

    let service: RagService;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.chatMessage.create.mockResolvedValue({});
        mockAnswerGenerationService.generateAnswer.mockResolvedValue(
            'Câu trả lời từ AI dựa trên ngữ cảnh.',
        );
        service = new RagService(
            mockPrisma as any,
            mockEmbeddingService as any,
            mockRerankService as any,
            mockAnswerGenerationService as any,
        );
    });


    it('loại bỏ chunk có rerankScore thấp (dưới ngưỡng liên quan trên thang 0-10)', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([
            { id: 'c1', content: 'nội dung không liên quan', chunkIndex: 0, page: 1, similarity: 0.9 },
        ]);
        mockRerankService.rerank.mockResolvedValue([{ id: 'c1', score: 3 }]);

        const result = await service.askQuestion('subject-1', 'câu hỏi bất kỳ');

        expect(result.hasEnoughContext).toBe(false);
        expect(result.sources).toHaveLength(0);
        expect(result.answer).toBe('Tài liệu chưa có thông tin để trả lời câu hỏi này.');
        expect(mockAnswerGenerationService.generateAnswer).not.toHaveBeenCalled();
    });

    it('giữ lại chunk có rerankScore đạt ngưỡng liên quan (>= 5/10) và gọi AI để trả lời', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([
            { id: 'c1', content: 'nội dung liên quan trực tiếp', chunkIndex: 0, page: 2, similarity: 0.8 },
        ]);
        mockRerankService.rerank.mockResolvedValue([{ id: 'c1', score: 8 }]);

        const result = await service.askQuestion('subject-1', 'câu hỏi bất kỳ');

        expect(result.hasEnoughContext).toBe(true);
        expect(result.sources).toHaveLength(1);
        expect(mockAnswerGenerationService.generateAnswer).toHaveBeenCalledTimes(1);
    });

    it('khi rerank thất bại (trả về rỗng), fallback lọc theo similarity thô (thang 0-1)', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([
            { id: 'c1', content: 'chunk có similarity thấp', chunkIndex: 0, page: 1, similarity: 0.2 },
        ]);
        mockRerankService.rerank.mockResolvedValue([]); 

        const result = await service.askQuestion('subject-1', 'câu hỏi bất kỳ');

        expect(result.hasEnoughContext).toBe(false);
        expect(mockAnswerGenerationService.generateAnswer).not.toHaveBeenCalled();
    });

    it('không có chunk ứng viên nào -> trả lời "chưa có thông tin" ngay, không gọi rerank/AI', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([]);

        const result = await service.askQuestion('subject-1', 'câu hỏi bất kỳ');

        expect(result.hasEnoughContext).toBe(false);
        expect(mockRerankService.rerank).not.toHaveBeenCalled();
        expect(mockAnswerGenerationService.generateAnswer).not.toHaveBeenCalled();
    });
});

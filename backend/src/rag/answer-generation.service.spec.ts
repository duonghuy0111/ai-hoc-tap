import { AnswerGenerationService, ContextChunk } from './answer-generation.service';

describe('AnswerGenerationService - resolveCitations (chống trích dẫn sai trang)', () => {
    const mockConfigService = {
        getOrThrow: jest.fn().mockReturnValue('fake-api-key'),
    };

    let service: AnswerGenerationService;

    beforeEach(() => {
        service = new AnswerGenerationService(mockConfigService as any);
    });

    const resolveCitations = (text: string, chunks: ContextChunk[]): string =>
        (service as any).resolveCitations(text, chunks);

    it('thay thế đúng [Đoạn N] bằng số trang thật lấy từ chunks[N-1], không phải số LLM tự viết', () => {
        const chunks: ContextChunk[] = [
            { content: 'nội dung A', page: 4 },
            { content: 'nội dung B', page: 5 },
        ];

        const llmOutput = 'Tester tương tác với giao diện [Đoạn 1]. Ưu điểm là không cần mã nguồn [Đoạn 2].';

        const result = resolveCitations(llmOutput, chunks);

        expect(result).toBe('Tester tương tác với giao diện (trang 4). Ưu điểm là không cần mã nguồn (trang 5).');
    });

    it('đây chính là regression test cho bug từng gặp: dù LLM có "nhớ nhầm" thứ tự nội dung, số trang vẫn LUÔN đúng vì lấy từ chunks, không phải từ text LLM sinh ra', () => {
        const chunks: ContextChunk[] = [
            { content: 'nội dung không liên quan (kiểm thử thăm dò)', page: 70 },
            { content: 'nội dung về tương tác giao diện, WHAT vs HOW', page: 4 },
        ];

        const llmOutput = 'Tester không quan tâm cách xử lý bên trong [Đoạn 2].';

        const result = resolveCitations(llmOutput, chunks);

        expect(result).toBe('Tester không quan tâm cách xử lý bên trong (trang 4).');
        expect(result).not.toContain('trang 70');
    });

    it('chunk không có page (page null/undefined) -> bỏ nhãn, không hiện "(trang null)" ra UI', () => {
        const chunks: ContextChunk[] = [{ content: 'nội dung không rõ trang', page: null }];
        const llmOutput = 'Đây là câu trả lời [Đoạn 1].';

        const result = resolveCitations(llmOutput, chunks);

        expect(result).toBe('Đây là câu trả lời .');
        expect(result).not.toContain('null');
        expect(result).not.toContain('[Đoạn');
    });

    it('LLM trích dẫn số đoạn không tồn tại (ví dụ [Đoạn 5] khi chỉ có 2 đoạn) -> bỏ nhãn, không crash', () => {
        const chunks: ContextChunk[] = [{ content: 'nội dung A', page: 1 }];
        const llmOutput = 'Câu trả lời với nhãn sai [Đoạn 5].';

        const result = resolveCitations(llmOutput, chunks);

        expect(result).toBe('Câu trả lời với nhãn sai .');
    });

    it('nhiều nhãn liền nhau cho 1 câu tổng hợp từ nhiều đoạn -> thay đúng từng nhãn', () => {
        const chunks: ContextChunk[] = [
            { content: 'nội dung A', page: 3 },
            { content: 'nội dung B', page: 3 },
            { content: 'nội dung C', page: 6 },
        ];
        const llmOutput = 'Quy trình gồm nhiều bước [Đoạn 1][Đoạn 2] và kết thúc bằng báo cáo [Đoạn 3].';

        const result = resolveCitations(llmOutput, chunks);

        expect(result).toBe('Quy trình gồm nhiều bước (trang 3)(trang 3) và kết thúc bằng báo cáo (trang 6).');
    });

    it('văn bản không có nhãn [Đoạn N] nào -> giữ nguyên không đổi', () => {
        const chunks: ContextChunk[] = [{ content: 'nội dung A', page: 1 }];
        const llmOutput = 'Tài liệu chưa có thông tin để trả lời câu hỏi này.';

        const result = resolveCitations(llmOutput, chunks);

        expect(result).toBe(llmOutput);
    });
});
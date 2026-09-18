import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { retryAsync } from "src/shared/retry.util";
import OpenAI from "openai";

export interface ContextChunk {
    content: string;
    page?: number | null;
}

@Injectable()
export class AnswerGenerationService {
    private readonly logger = new Logger(AnswerGenerationService.name);
    private readonly client: OpenAI;
    private readonly model = 'gpt-4.1-mini';

    constructor(private readonly configService: ConfigService) {
        this.client = new OpenAI({
            apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
        });
    }

    async generateAnswer(query: string, chunks: ContextChunk[]): Promise<string> {
        const context = chunks.map((c, i) => `[Đoạn ${i + 1}]${c.page ? ` (trang ${c.page})` : ''}\n${c.content}`).join('\n\n---\n\n');

        const systemPrompt = `Bạn là trợ lý học tập thông minh. 
                            Nhiệm vụ: Trả lời câu hỏi của người dùng DỰA HOÀN TOÀN vào ngữ cảnh được cung cấp.

                            Quy tắc:
                            1. Chỉ sử dụng thông tin trong ngữ cảnh. Không tự bịa thêm thông tin ngoài tài liệu.
                            2. Nếu ngữ cảnh không đủ thông tin để trả lời, hãy lịch sự thông báo rằng tài liệu chưa đề cập đến vấn đề này.
                            3. QUAN TRỌNG - Khi trích dẫn: đặt đúng nhãn [Đoạn N] (N là số thứ tự đoạn ngữ cảnh, ví dụ [Đoạn 1], [Đoạn 2]) ngay sau câu bạn vừa trích, TƯƠNG ỨNG CHÍNH XÁC với đoạn ngữ cảnh bạn đang dùng để trả lời câu đó.
                            4. TUYỆT ĐỐI KHÔNG tự viết số trang bằng chữ (không viết "trang 5", "theo trang X"...). Chỉ dùng đúng định dạng nhãn [Đoạn N]. Hệ thống sẽ tự động thay nhãn đó bằng số trang chính xác — nếu bạn tự viết số trang, số đó có thể sai vì bạn không có quyền truy cập trực tiếp vào metadata gốc.
                            5. Nếu một câu tổng hợp từ nhiều đoạn, đặt nhiều nhãn liền nhau, ví dụ: [Đoạn 1][Đoạn 3].
                            6. Trả lời bằng tiếng Việt, rõ ràng và mạch lạc.`;

        const userPrompt = `Ngữ cảnh tài liệu:\n${context}\n\nCâu hỏi: ${query}`;

        try {
            const response = await retryAsync(() =>
                this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                }),
            );

            const text = response.choices[0]?.message?.content;
            if (!text) {
                this.logger.warn('generateAnswer: response rỗng');
                return 'Xin lỗi, có lỗi khi tạo câu trả lời. Vui lòng thử lại.';
            }
            return this.resolveCitations(text, chunks);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`generateAnswer thất bại: ${message}`);
            throw error;
        }
    }
    private resolveCitations(text: string, chunks: ContextChunk[]): string {
        return text.replace(/\[Đoạn\s*(\d+)\]/g, (match, indexStr: string) => {
            const index = parseInt(indexStr, 10) - 1;
            const chunk = chunks[index];
            if (!chunk) return ''; 
            return chunk.page ? `(trang ${chunk.page})` : '';
        });
    }
}
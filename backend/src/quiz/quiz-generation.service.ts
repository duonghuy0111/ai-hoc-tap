import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { z } from "zod";
import { retryAsync } from "src/shared/retry.util";

const McqQuestionSchema = z.object({
    question: z.string().min(5),
    optionA: z.string().min(1),
    optionB: z.string().min(1),
    optionC: z.string().min(1),
    optionD: z.string().min(1),
    correctAnswer: z.enum(['A', 'B', 'C', 'D']),
    explanation: z.string().min(5),
});

const EssayQuestionSchema = z.object({
    question: z.string().min(5),
    modelAnswer: z.string().min(10),
    explanation: z.string().min(5),
});

const McqGenSchema = z.object({ questions: z.array(McqQuestionSchema) });
const EssayGenSchema = z.object({ questions: z.array(EssayQuestionSchema) });

export type GeneratedMcqQuestion = z.infer<typeof McqQuestionSchema>;
export type GeneratedEssayQuestion = z.infer<typeof EssayQuestionSchema>;

export interface SourceChunkForQuiz {
    content: string,
    page: number | null,
}

@Injectable()
export class QuizGenerationService {
    private readonly logger = new Logger(QuizGenerationService.name);
    private readonly client: OpenAI;
    private readonly model = 'gpt-4.1-mini';

    constructor(private readonly configService: ConfigService) {
        this.client = new OpenAI({
            apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
        });
    }
    async generateQuestions(
        chunks: SourceChunkForQuiz[],
        numberOfQuestions: number,
        questionType: 'mcq' | 'essay',
    ): Promise<(GeneratedMcqQuestion | GeneratedEssayQuestion)[]> {
        const { systemPrompt, userPrompt } = questionType === 'mcq'
            ? this.buildMcqPrompts(chunks, numberOfQuestions)
            : this.buildEssayPrompts(chunks, numberOfQuestions);
        const schema = questionType === 'mcq' ? McqGenSchema : EssayGenSchema;

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const response = await retryAsync(() =>
                    this.client.chat.completions.create({
                        model: this.model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }],
                        response_format: { type: 'json_object' },
                    }),
                );
                const text = response.choices[0]?.message?.content;
                if (!text) {
                    this.logger.warn(`Lần ${attempt}: response rỗng từ LLM`);
                    continue;
                }
                const parsed = JSON.parse(text);
                const validated = schema.parse(parsed);

                if (validated.questions.length === 0) {
                    this.logger.warn(`Lần ${attempt}: LLM trả về mảng questions rỗng`);
                    continue;
                }
                return validated.questions;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Lần ${attempt} validate/parse thất bại: ${message}`);
                if (attempt === 2) {
                    throw new Error('Không thể sinh quiz hợp lệ sau 2 lần thử, vui lòng thử lại');
                }
            }
        }
        throw new Error('Không thể sinh quiz hợp lệ');
    }

    private buildEssayPrompts(chunks: SourceChunkForQuiz[], numberOfQuestions: number) {
        const context = chunks.map((c, i) => `[Đoạn ${i + 1}]${c.page ? ` (trang ${c.page})` : ''}\n${c.content}`).join('\n\n---\n\n');

        const systemPrompt = `Bạn là trợ lý tạo bài kiểm tra tự luận ngắn cho sinh viên, dựa hoàn toàn trên nội dung tài liệu được cung cấp.
                            Nhiệm vụ: Tạo các câu hỏi tự luận ngắn (yêu cầu trả lời bằng 2-4 câu) để kiểm tra khả năng hiểu và diễn giải kiến thức.
                            Yêu cầu:
                            - Câu hỏi dạng "giải thích", "so sánh", "nêu ví dụ" — khuyến khích diễn giải bằng lời riêng.
                            - "modelAnswer" là đáp án mẫu đầy đủ, chi tiết — dùng làm chuẩn để so sánh khi chấm điểm sau này.
                            - Câu hỏi và đáp án phải bằng TIẾNG VIỆT.
                            - Chỉ dựa trên nội dung tài liệu, không bịa thêm kiến thức ngoài.

                            Chỉ trả về JSON theo cấu trúc:
                            {
                            "questions": [
                                { "question": "...", "modelAnswer": "...", "explanation": "..." }
                            ]
                            }`;
        const userPrompt = `Hãy tạo đúng ${numberOfQuestions} câu hỏi tự luận ngắn từ nội dung tài liệu sau:\n\n${context}`;
        return { systemPrompt, userPrompt };
    }
    private buildMcqPrompts(chunks: SourceChunkForQuiz[], numberOfQuestions: number) {
        const context = chunks.map((c, i) => `[Đoạn ${i + 1}]${c.page ? ` (trang ${c.page})` : ''}\n${c.content}`).join('\n\n---\n\n');
        const systemPrompt = `Bạn là trợ lý tạo bài kiểm tra trắc nghiệm cho sinh viên, dựa hoàn toàn trên nội dung tài liệu được cung cấp.
                            Nhiệm vụ: Tạo câu hỏi trắc nghiệm (4 đáp án A/B/C/D, chỉ 1 đáp án đúng) để kiểm tra mức độ hiểu bài.
                            Yêu cầu:
                            - Câu hỏi phải dựa TRỰC TIẾP vào nội dung tài liệu, không bịa thêm kiến thức ngoài.
                            - Mỗi câu có "explanation" giải thích ngắn gọn vì sao đáp án đó đúng, kèm số trang nếu biết (ví dụ "(trang 5)").
                            - Độ khó đa dạng: có câu dễ (định nghĩa) và câu khó hơn (áp dụng, so sánh).
                            - Câu hỏi và đáp án phải bằng TIẾNG VIỆT.

                            Chỉ trả về JSON theo cấu trúc:
                            {
                            "questions": [
                                {
                                "question": "...",
                                "optionA": "...",
                                "optionB": "...",
                                "optionC": "...",
                                "optionD": "...",
                                "correctAnswer": "A",
                                "explanation": "..."
                                }
                            ]
                            }`;
        const userPrompt = `Hãy tạo đúng ${numberOfQuestions} câu hỏi trắc nghiệm từ nội dung tài liệu sau:\n\n${context}`;
        return { systemPrompt, userPrompt };
    }

}
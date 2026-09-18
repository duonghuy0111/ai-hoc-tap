import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { z } from 'zod';
import { retryAsync } from "src/shared/retry.util";

const GradingResultSchema = z.object({
    score: z.number().min(0).max(100),
    feedback: z.string().min(5),
    correctPoints: z.array(z.string()).default([]),
    missingPoints: z.array(z.string()).default([]),
    suggestion: z.string().min(1),
});

export type GradingResult = z.infer<typeof GradingResultSchema>;

@Injectable()
export class EssayGradingService {
    private readonly logger = new Logger(EssayGradingService.name);
    private readonly client: OpenAI;
    private readonly model = 'gpt-4.1-mini';

    constructor(private readonly configService: ConfigService) {
        this.client = new OpenAI({ apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY') });
    }
    async gradeAnswer(question: string, modelAnswer: string, userAnswer: string): Promise<GradingResult> {
        if (!userAnswer || userAnswer.trim().length === 0) {
            return {
                score: 0,
                feedback: 'Không có câu trả lời. ',
                correctPoints: [],
                missingPoints: ['Chưa trả lời câu hỏi này.'],
                suggestion: 'Hãy trả lời dựa trên nội dung đã học trước khi nộp bài.',
            };
        }

        try {
            const response = await retryAsync(() =>
                this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: 'system', content: `Bạn là trợ giảng chấm điểm câu trả lời tự luận ngắn.
                                                    Nhiệm vụ: Chấm điểm câu trả lời của sinh viên theo thang 0-100, dựa trên mức độ đúng về NỘI DUNG và Ý NGHĨA so với đáp án mẫu (chấp nhận cách diễn đạt khác miễn đúng ý).

                                                    Rubric chấm điểm (theo mức độ bao phủ ý đúng so với đáp án mẫu):
                                                    - 90-100: Đúng đầy đủ, bao phủ tất cả ý chính của đáp án mẫu.
                                                    - 60-89: Đúng phần lớn, thiếu 1 vài ý phụ hoặc diễn đạt chưa rõ.
                                                    - 30-59: Có ý đúng nhưng thiếu sót nhiều ý chính, hoặc hiểu sai một phần.
                                                    - 0-29: Sai hoàn toàn hoặc không liên quan tới câu hỏi.

                                                    Yêu cầu output — PHẢI trả đủ 5 trường, tách bạch rõ ràng, không gộp chung vào feedback:
                                                    - "score": điểm số 0-100.
                                                    - "feedback": nhận xét tổng quan ngắn gọn (1-2 câu).
                                                    - "correctPoints": mảng các ý sinh viên đã trả lời ĐÚNG so với đáp án mẫu (mỗi phần tử là 1 ý ngắn gọn). Mảng rỗng nếu không có ý nào đúng.
                                                    - "missingPoints": mảng các ý còn THIẾU hoặc SAI so với đáp án mẫu (mỗi phần tử là 1 ý ngắn gọn). Mảng rỗng nếu đã đầy đủ.
                                                    - "suggestion": 1 câu gợi ý cụ thể để sinh viên cải thiện câu trả lời (không lặp lại đáp án mẫu nguyên văn).

                                                    Chỉ trả về JSON, không thêm giải thích ngoài JSON: {"score": number, "feedback": "string", "correctPoints": ["string"], "missingPoints": ["string"], "suggestion": "string"}`
                        },
                        {
                            role: 'user', content: `Câu hỏi: ${question}\n\nĐáp án mẫu: ${modelAnswer}\n\nCâu trả lời của sinh viên: ${userAnswer}`
                        }
                    ],
                    response_format: { type: 'json_object' },
                }),
            );
            const text = response.choices[0]?.message?.content;
            if (!text) throw new Error('Response rỗng từ LLM khi chấm tự luận');

            const parsed = JSON.parse(text);
            return GradingResultSchema.parse(parsed);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Chấm tự luận thất bại: ${message}`);
            throw error;
        }
    }
}
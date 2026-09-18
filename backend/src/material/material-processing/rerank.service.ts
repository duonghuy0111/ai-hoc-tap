import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { retryAsync } from 'src/shared/retry.util';
import OpenAI from 'openai';

export interface RerankCandidate {
    id: string;
    content: string;
}

export interface RerankResult {
    id: string;
    score: number;
}

@Injectable()
export class RerankService {
    private readonly logger = new Logger(RerankService.name);
    private readonly client: OpenAI;
    private readonly model = 'gpt-4.1-mini';

    constructor(private readonly configService: ConfigService) {
        this.client = new OpenAI({
            apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
        });
    }

    async rerank(query: string, candidates: RerankCandidate[]): Promise<RerankResult[]> {
        if (candidates.length === 0) return [];

        const items = candidates
            .map((c, i) => `[${i}] (id="${c.id}")\n${c.content.slice(0, 500)}`)
            .join('\n\n---\n\n');

        try {
            const response = await retryAsync(() =>
                this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: 'system', content: `Bạn là hệ thống chấm điểm mức độ liên quan (relevance judge) cho tìm kiếm ngữ nghĩa.
                                                        Nhiệm vụ: Với mỗi chunk được cung cấp, chấm điểm từ 0 đến 10 mức độ đoạn đó TRỰC TIẾP trả lời hoặc liên quan sát sườn đến câu hỏi người dùng.
                                                        - 9-10: Chunk chứa định nghĩa/câu trả lời trực tiếp, rõ ràng cho câu hỏi.
                                                        - 5-8: Chunk liên quan đến chủ đề nhưng không trả lời trực tiếp.
                                                        - 0-4: Chunk hầu như không liên quan.

                                                        Trả về duy nhất JSON theo cấu trúc: {"results": [{"id": "string", "score": number}]}`
                        },
                        {
                            role: 'user', content: `Câu hỏi: "${query}"\n\nDanh sách văn bản ứng viên:\n${items}`
                        }
                    ],
                    response_format: { type: 'json_object' }, 
                }),
            );

            const text = response.choices[0]?.message?.content;
            if (!text) {
                this.logger.warn('Rerank: response rỗng, fallback về thứ tự gốc');
                return [];
            }
            const parsed = JSON.parse(text);
            return parsed.results ?? [];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Rerank thất bại: ${message}`);
            return [];
        }
    }
}
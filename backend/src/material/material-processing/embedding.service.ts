import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
    private readonly logger = new Logger(EmbeddingService.name);
    private readonly ai: GoogleGenAI;
    private readonly model = 'gemini-embedding-001';
    private readonly dimension = 768;

    constructor(private readonly configService: ConfigService) {
        this.ai = new GoogleGenAI({
            apiKey: this.configService.getOrThrow<string>('GEMINI_API_KEY'),
        });
    }

    async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
        if (texts.length === 0) return [];

        try {
            const response = await this.ai.models.embedContent({
                model: this.model,
                contents: texts,
                config: {
                    taskType: 'RETRIEVAL_DOCUMENT',
                    outputDimensionality: this.dimension,
                },
            });

            if (!response.embeddings) {
                this.logger.error('Embedding batch: response không có embeddings');
                return texts.map(() => null);
            }

            return response.embeddings.map((e) => e.values ?? null);
        } catch (error) {
            this.logger.error(`Embedding batch thất bại: ${error.message}`);
            return texts.map(() => null);
        }
    }

    async embedQuery(text: string): Promise<number[]> {
        const response = await this.ai.models.embedContent({
            model: this.model,
            contents: [text],
            config: {
                taskType: 'RETRIEVAL_QUERY',
                outputDimensionality: this.dimension,
            },
        });

        const values = response.embeddings?.[0]?.values;
        if (!values) {
            throw new Error('Không nhận được embedding cho câu hỏi');
        }
        return values;
    }
}
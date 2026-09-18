import OpenAI from 'openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { retryAsync } from 'src/shared/retry.util';

@Injectable()
export class EmbeddingService {
    private readonly logger = new Logger(EmbeddingService.name);
    private readonly client: OpenAI;
    private readonly model = 'text-embedding-3-small';
    private readonly dimension = 768; 

    constructor(private readonly configService: ConfigService) {
        this.client = new OpenAI({
            apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
        });
    }

    async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
        if (texts.length === 0) return [];

        const MAX_BATCH_SIZE = 100; 
        const results: (number[] | null)[] = [];
        for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
            const subBatch = texts.slice(i, i + MAX_BATCH_SIZE);
            const response = await retryAsync(() =>
                this.client.embeddings.create({
                    model: this.model,
                    input: subBatch,
                    dimensions: this.dimension,
                }),
            );
            const sortedData = [...response.data].sort((a, b) => a.index - b.index);
            results.push(...sortedData.map((d) => d.embedding ?? null));
        }
        return results;
    }

    async embedQuery(text: string): Promise<number[]> {
        const response = await retryAsync(() =>
            this.client.embeddings.create({
                model: this.model,
                input: text,
                dimensions: this.dimension,
            }),
        );
        const values = response.data[0]?.embedding;
        if (!values) throw new Error('Không nhận được embedding cho câu hỏi');
        return values;
    }
}
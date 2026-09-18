import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { EmbeddingService } from "src/material/material-processing/embedding.service";
import { RerankService } from "src/material/material-processing/rerank.service";
import { AnswerGenerationService } from "./answer-generation.service";


export interface SimilarChunk {
    id: string;
    content: string;
    chunkIndex: number;
    page: number | null;
    similarity: number;
    rerankScore?: number;
}
export interface AskResult {
    answer: string;
    sources: SimilarChunk[];
    hasEnoughContext: boolean;
}


@Injectable()
export class RagService {

    private readonly RERANK_THRESHOLD = 5;
    private readonly SIMILARITY_THRESHOLD = 0.5;

    constructor(
        private readonly prisma: PrismaService,
        private readonly embeddingService: EmbeddingService,
        private readonly rerankService: RerankService,
        private readonly answerGenerationService: AnswerGenerationService,
    ) { }

    async searchSimilarChunks(
        subjectId: string,
        query: string,
        topK = 5,
    ): Promise<SimilarChunk[]> {
        const candidateK = Math.max(topK * 3, 15);

        const queryEmbedding = await this.embeddingService.embedQuery(query);
        const vectorLiteral = `[${queryEmbedding.join(',')}]`;

        const candidates = await this.prisma.$queryRaw<SimilarChunk[]>`
            SELECT mc.id, mc.content, mc."chunkIndex", mc.page,
                1 - (mc.embedding <=> ${vectorLiteral}::vector ) as similarity
            FROM "MaterialChunk" mc
            JOIN "Material" m ON mc."materialId" = m.id
            WHERE m."subjectId"  = ${subjectId}
                AND mc.embedding IS NOT NULL
            ORDER BY mc.embedding <=> ${vectorLiteral}::vector
            LIMIT ${candidateK}
        `;

        if (candidates.length === 0) return [];

        const rerankResults = await this.rerankService.rerank(
            query,
            candidates.map((c) => ({ id: c.id, content: c.content })),
        );

        if (rerankResults.length === 0) {
            return candidates.slice(0, topK);
        }

        const scoreMap = new Map(rerankResults.map((r) => [r.id, r.score]));

        const sorted = candidates
            .map((c) => ({ ...c, rerankScore: scoreMap.get(c.id) }))
            .sort((a, b) => (b.rerankScore ?? -1) - (a.rerankScore ?? -1));

        return sorted.slice(0, topK);
    }

    async askQuestion(subjectId: string, query: string): Promise<AskResult> {

        await this.prisma.chatMessage.create({
            data: { subjectId, role: 'user', content: query },
        });

        const chunks = await this.searchSimilarChunks(subjectId, query, 5);

        const relevantChunks = chunks.filter((c) =>
            c.rerankScore !== undefined
                ? c.rerankScore >= this.RERANK_THRESHOLD
                : c.similarity >= this.SIMILARITY_THRESHOLD,
        );

        let answer = '';
        let hasEnoughContext = true;

        if (relevantChunks.length === 0) {
            answer = 'Tài liệu chưa có thông tin để trả lời câu hỏi này.';
            hasEnoughContext = false;
        } else {
            answer = await this.answerGenerationService.generateAnswer(
                query,
                relevantChunks.map((c) => ({ content: c.content, page: c.page })),
            );
        }

        await this.prisma.chatMessage.create({
            data: { subjectId, role: 'assistant', content: answer },
        });

        return {
            answer,
            sources: relevantChunks,
            hasEnoughContext,
        };
    }
    async getChatHistory(subjectId: string) {
        return this.prisma.chatMessage.findMany({
            where: { subjectId },
            orderBy: { createdAt: 'asc' },
        });
    }
}
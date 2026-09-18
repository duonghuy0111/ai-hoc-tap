import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { promises as fs } from 'fs';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { ImageExtractionService } from './image-extraction.service';
import { VideoExtractionService } from './video-extraction.service';

interface PageText {
    page: number;
    text: string;
}

@Injectable()
export class MaterialProcessingService {

    private readonly logger = new Logger(MaterialProcessingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly chunkingService: ChunkingService,
        private readonly embeddingService: EmbeddingService,
        private readonly imageExtractionService: ImageExtractionService,
        private readonly videoExtractionService: VideoExtractionService,
    ) { }

    async process(materialId: string) {
        const material = await this.prisma.material.findUnique({
            where: { id: materialId },
        });
        if (!material) return;

        try {

            let fullText: string;
            let pages: { page: number | null; text: string }[];

            if (material.fileType === 'image') {
                const mimeType = this.getMimeTypeFromPath(material.filePath);

                fullText = await this.imageExtractionService.extractText(material.filePath, mimeType);
                pages = [{ page: 1, text: fullText }];
            } else if (material.fileType === 'video') {
                fullText = await this.videoExtractionService.extractTextFromVideo(material.filePath);
                pages = [{ page: null, text: fullText }];
            } else {
                pages = await this.extractText(material.filePath);
                fullText = pages.map((p) => p.text).join('\n\n');
            }

            const chunks: { content: string; page: number | null }[] = [];
            for (const p of pages) {
                const pageChunks = this.chunkingService.chunkText(p.text);
                for (const content of pageChunks) {
                    chunks.push({ content, page: p.page });
                }
            }
            this.logger.log(`Sinh ra ${chunks.length} chunk cho material ${materialId}`);

            if (chunks.length > 0) {
                await this.prisma.materialChunk.createMany({
                    data: chunks.map((c, index) => ({
                        materialId,
                        content: c.content,
                        chunkIndex: index,
                        page: c.page,
                    })),
                });
            }

            await this.prisma.material.update({
                where: {
                    id: materialId,
                },
                data: {
                    status: 'ready',
                    extractedText: fullText,
                },
            });
        } catch (error) {
            this.logger.error(`Extract/chunk thất bại cho material ${materialId}: ${error}`);
            await this.prisma.material.update({
                where: { id: materialId },
                data: {
                    status: 'failed',
                },
            });
            return;
        }
        try {
            await this.embedMaterialChunks(materialId);
        } catch (error) {
            this.logger.error(`Embedding thất bại cho material ${materialId}: ${error}`);
            await this.prisma.material.update({
                where: { id: materialId },
                data: { status: 'ready_embedding_failed' },
            });
        }
    }

    private getMimeTypeFromPath(filePath: string): string {
        const ext = filePath.toLowerCase().split('.').pop();
        if (ext === 'png') return 'image/png';
        return 'image/jpeg';
    }

    async embedMaterialChunks(materialId: string) {
        const savedChunks = await this.prisma.materialChunk.findMany({
            where: { materialId },
            orderBy: { chunkIndex: 'asc' },
        });
        if (savedChunks.length === 0) return;

        const texts = savedChunks.map((c) => c.content);
        const embeddings = await this.embeddingService.embedBatch(texts);

        const updateTasks = savedChunks.map((chunk, i) => {
            const embedding = embeddings[i];
            if (!embedding) {
                this.logger.warn(`Chunk ${savedChunks[i].id} không có embedding (API lỗi)`);
                return Promise.resolve();
            }
            const vectorLiteral = `[${embedding.join(',')}]`;
            return this.prisma.$executeRaw`
                UPDATE "MaterialChunk"
                SET embedding = ${vectorLiteral}::vector
                WHERE id = ${chunk.id}`;
        });
        const BATCH_SIZE = 20;
        for (let i = 0; i < updateTasks.length; i += BATCH_SIZE) {
            await Promise.all(updateTasks.slice(i, i + BATCH_SIZE));
        }
        this.logger.log(`Đã embedding xong cho material ${materialId}`);
    }

    private async extractText(filePath: string): Promise<PageText[]> {
        const buffer = await fs.readFile(filePath);

        const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
        }).promise;

        const pages: PageText[] = [];
        for (let page = 1; page <= pdf.numPages; page++) {
            const currentPage = await pdf.getPage(page);
            const textContent = await currentPage.getTextContent();

            let pageText = textContent.items.map((item: any) => item.str).join(" ");
            pageText = pageText.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();

            if (pageText.length > 0) {
                pages.push({ page, text: pageText });
            }
        }
        return pages;
    }

    async reprocess(materialId: string) {
        const material = await this.prisma.material.findUnique({ where: { id: materialId } });
        if (!material)
            return;
        if (material.status === 'ready_embedding_failed') {
            this.logger.log(`Material ${materialId} chỉ lỗi embedding - chỉ embed lại, không extract lại`);
            try {
                await this.embedMaterialChunks(materialId);
                await this.prisma.material.update({ where: { id: materialId }, data: { status: 'ready' } });
            } catch (error) {
                this.logger.error(`Vẫn lỗi embedding: ${error}`);
            }
            return;
        }
        this.logger.log(`Xóa chunk cũ và re-process material ${materialId}`);
        await this.prisma.materialChunk.deleteMany({ where: { materialId } });
        await this.process(materialId);
    }

    async reprocessAllForUser(userId: string) {
        const materials = await this.prisma.material.findMany({
            where: { subject: { userId } },
            select: { id: true },
        });
        this.logger.log(`Bắt đầu reprocess ${materials.length} material của user ${userId}`);

        for (const m of materials) {
            await this.reprocess(m.id);
        }

        this.logger.log(`Hoàn tất reprocess ${materials.length} material`);
    }

}
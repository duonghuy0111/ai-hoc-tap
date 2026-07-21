import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { promises as fs } from 'fs';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class MaterialProcessingService {

    private readonly logger = new Logger(MaterialProcessingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly chunkingService: ChunkingService,
        private readonly embeddingService: EmbeddingService,
    ) { }

    async process(materialId: string) {
        try {
            const material = await this.prisma.material.findUnique({
                where: { id: materialId },
            });
            if (!material) return;

            const text = await this.extractText(material.filePath);

            console.log("===== PDFJS =====");
            console.log(text.substring(0, 1000));

            // Chunking

            const chunks = this.chunkingService.chunkText(text);
            this.logger.log(`Sinh ra ${chunks.length} chunk cho material ${materialId}`);

            // Lưu chunk vào DB
            if (chunks.length > 0) {
                await this.prisma.materialChunk.createMany({
                    data: chunks.map((content, index) => ({
                        materialId,
                        content,
                        chunkIndex: index,
                        page: null,
                    })),
                });
            }

            await this.prisma.material.update({
                where: {
                    id: materialId,
                },
                data: {
                    status: 'ready',
                    extractedText: text,
                },
            });

            // Embedding API + lưu vector
            // chạy sau khi material đã 'ready' - vì nếu embedding lỗi --> material vẫn dùng được
            await this.embedMaterialChunks(materialId);

        } catch (error) {
            console.error(error);
            await this.prisma.material.update({
                where: { id: materialId },
                data: {
                    status: 'failed',
                },
            });
        }

    }
    async embedMaterialChunks(materialId: string) {
        const savedChunks = await this.prisma.materialChunk.findMany({
            where: { materialId },
            orderBy: { chunkIndex: 'asc' },
        });
        if (savedChunks.length === 0) return;

        const texts = savedChunks.map((c) => c.content);
        const embeddings = await this.embeddingService.embedBatch(texts);

        for (let i = 0; i < savedChunks.length; i++) {
            const embedding = embeddings[i];
            if (!embedding) {
                this.logger.warn(`Chunk ${savedChunks[i].id} không có embedding (API lỗi)`);
                continue; // giữ nguyên embedding = null, để retry sau
            }
            const vectorLiteral = `[${embedding.join(',')}]`;
            await this.prisma.$executeRaw`
                UPDATE "MaterialChunk"
                SET embedding = ${vectorLiteral}::vector
                WHERE id = ${savedChunks[i].id}`;
        }
        this.logger.log(`Đã embedding xong cho material ${materialId}`);
    }
    private async extractText(
        filePath: string
    ): Promise<string> {
        const buffer = await fs.readFile(filePath);

        const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
        }).promise;
        let fullText = "";
        for (let page = 1; page <= pdf.numPages; page++) {
            const currentPage = await pdf.getPage(page);
            const textContent = await currentPage.getTextContent();

            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n\n";
        }
        fullText = fullText.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
        return fullText;

    }

}


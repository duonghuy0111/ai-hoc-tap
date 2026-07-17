import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { promises as fs } from 'fs';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { ChunkingService } from './chunking.service';

@Injectable()
export class MaterialProcessingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly chunkingService: ChunkingService,
    ) { }
    async process(materialId: string) {
        try {
            const material = await this.prisma.material.findUnique({
                where: { id: materialId },
            });
            if (!material) return;
            const text = await this.extractText(material.filePath,);
            console.log("===== PDFJS =====");
            console.log(text.substring(0, 1000));

            const chunks = this.chunkingService.chunkText(text);
            console.log(`----Chunking: sinh ra ${chunks.length} chunk-----`);

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


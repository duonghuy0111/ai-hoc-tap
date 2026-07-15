import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { promises as fs } from 'fs';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

@Injectable()
export class MaterialProcessingService {
    constructor(private readonly prisma: PrismaService,) { }
    async process(materialId: string) {
        try {
            const material = await this.prisma.material.findUnique({
                where: { id: materialId },
            });
            if (!material) return;
            const text = await this.extractText(material.filePath,);
            console.log("===== PDFJS =====");
            console.log(text.substring(0, 1000));

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


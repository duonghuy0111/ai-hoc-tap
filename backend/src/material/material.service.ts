import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { SummaryGenerationService } from './summary-generation.service';

@Injectable()
export class MaterialService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly summaryGenerationService: SummaryGenerationService,
    ) { }

    async create(data: {
        title: string;
        filePath: string;
        subjectId: string;
        fileType: string
    }) {
        return this.prisma.material.create({
            data,
        });
    }

    async findById(id: string) {
        return this.prisma.material.findUnique({
            where: { id },
        });
    }
    async findOne(userId: string, materialId: string) {
        const material = await this.prisma.material.findFirst({
            where: {
                id: materialId,
                subject: {
                    userId,
                },
            },
        });

        if (!material) {
            throw new NotFoundException('Material không tồn tại!');
        }
        return material;
    }

    async findAllBySubject(subjectId: string) {
        return this.prisma.material.findMany({
            where: { subjectId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getOrCreateSummary(userId: string, materialId: string): Promise<{ content: string; cached: boolean }> {
        const material = await this.prisma.material.findFirst({
            where: { id: materialId },
            include: { summary: true },
        });
        if (!material) {
            throw new NotFoundException('Không tìm thấy tài liệu');
        }

        if (material.summary) {
            return { content: material.summary.content, cached: true };
        }

        if (!material.extractedText) {
            throw new BadRequestException('Tài liệu chưa có nội dung để tóm tắt');
        }

        const content = await this.summaryGenerationService.generateSummary(
            material.extractedText,
            material.title,
        );

        await this.prisma.summary.create({
            data: { materialId, content },
        });
        return { content, cached: false };
    }


}
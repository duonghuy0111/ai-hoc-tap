import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class MaterialService {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: {
        title: string;
        filePath: string;
        subjectId: string;
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


}
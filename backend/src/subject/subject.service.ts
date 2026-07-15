import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';


@Injectable()
export class SubjectService {
    constructor(private readonly prisma: PrismaService,) { }
    async create(userId: string, dto: CreateSubjectDto,) {
        return this.prisma.subject.create({
            data: {
                ...dto,
                userId,
            },
        });
    }
    async findAll(userId: string) {
        return this.prisma.subject.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async findOne(userId: string, id: string,) {
        console.log('findOne userId =', userId);
        console.log('findOne subjectId =', id);

        const subject = await this.prisma.subject.findFirst({
            where: {
                id,
                userId,
            },
        });
        console.log('Subject found = ', subject);
        
        if (!subject) {
            throw new NotFoundException('Không tìm thấy môn học',)
        };
        return subject;
    }
    async remove(userId: string, id: string) {
        const subject = await this.findOne(userId, id);

        await this.prisma.subject.delete({
            where: {
                id: subject.id,
            },
        });
        return {
            message: 'Đã xóa môn học',
        };
    }

    async update(userId: string, id: string, dto: UpdateSubjectDto,) {
        await this.findOne(userId, id);
        return this.prisma.subject.update({
            where: {
                id,
            },
            data: dto,
        });
    }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ActivityLogService } from 'src/activity-log/activity-log.service';


@Injectable()
export class SubjectService {
    private readonly logger = new Logger(SubjectService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly activityLogService: ActivityLogService,

    ) { }

    async create(userId: string, dto: CreateSubjectDto,) {
        const subject = await this.prisma.subject.create({ data: { ...dto, userId } });
        await this.activityLogService.log(userId, 'subject.create', {
            entityType: 'Subject', entityId: subject.id, metadata: { name: subject.name },
        });
        return subject;
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
        const subject = await this.prisma.subject.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!subject) {
            this.logger.warn(`Không tìm thấy subject ${id} cho user ${userId}`);
            throw new NotFoundException('Không tìm thấy môn học');
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

        await this.activityLogService.log(userId, 'subject.delete', {
            entityType: 'Subject', entityId: subject.id, metadata: { name: subject.name },
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

import { BadRequestException, Get, HttpCode, HttpStatus, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { Express } from 'express';
import { MaterialService } from './material.service';
import { SubjectService } from 'src/subject/subject.service';
import { MaterialProcessingService } from './material-processing/material-processing.service';
import path from 'node:path';
import * as fs from 'fs';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivityLogService } from 'src/activity-log/activity-log.service';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'video/mp4', 'video/quicktime',];


@ApiTags('Material')
@ApiBearerAuth('access-token')
@Controller()
export class MaterialController {

    constructor(
        private readonly materialService: MaterialService,
        private readonly subjectService: SubjectService,
        private readonly materialProcessingService: MaterialProcessingService,
        private readonly activityLogService: ActivityLogService,
    ) { }


    @HttpCode(HttpStatus.ACCEPTED)
    @Post('/subjects/:subjectId/materials')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: path.join(process.cwd(), 'uploads'),
                filename(req, file, callback) {
                    const fixedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                    const safeName = fixedName.replace(/[/\\?%*:|"<>]/g, '-');
                    const unique = Date.now() + "-" + safeName;
                    callback(null, unique);
                },
            }),
            fileFilter(req, file, callback) {
                if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                    return callback(
                        new BadRequestException('Chỉ được upload PDF, JPG hoặc PNG, mp4, hoặc MOV'),
                        false,
                    );
                }
                callback(null, true);
            },
            limits: {
                fileSize: 300 * 1024 * 1024,
            }
        }),
    )


    async upload(
        @CurrentUser() user,
        @Param('subjectId') subjectId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn file để tải lên',);
        }
        try {
            await this.subjectService.findOne(user.userId, subjectId);
        } catch (error) {
            if (file) {
                fs.unlinkSync(file.path);
            }
            throw error;
        }

        const fixedTitle = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const fileType = file.mimetype === 'application/pdf' ? 'pdf' : file.mimetype.startsWith('video/') ? 'video' : 'image';

        const material = await this.materialService.create({
            title: fixedTitle,
            filePath: file.path,
            subjectId,
            fileType,
        });

        await this.activityLogService.log(user.userId, 'material.upload', {
            entityType: 'Material', entityId: material.id, metadata: { title: fixedTitle, fileType },
        });

        setImmediate(async () => {
            try {
                await this.materialProcessingService.process(material.id);
            } catch (error) {
                console.error(error);
            }
        });
        return {
            id: material.id,
            status: material.status,
        };
    }

    @Get('/subjects/:subjectId/materials')
    @UseGuards(JwtAuthGuard)
    async findAllBySubject(
        @CurrentUser() user,
        @Param('subjectId') subjectId: string,
    ) {
        await this.subjectService.findOne(user.userId, subjectId);
        return this.materialService.findAllBySubject(subjectId);
    }

    @Get('/materials/:id')
    @UseGuards(JwtAuthGuard)
    async findOne(
        @CurrentUser() user,
        @Param('id') id: string,
    ) {
        return this.materialService.findOne(user.userId, id);
    }

    @Post('/materials/:id/reprocess')
    @UseGuards(JwtAuthGuard)
    async reprocessOne(
        @CurrentUser() user,
        @Param('id') id: string,
    ) {
        await this.materialService.findOne(user.userId, id);
        await this.materialProcessingService.reprocess(id);
        return { message: `Đã reprocess material ${id}` };
    }

    @Post('/materials/reprocess-all')
    @UseGuards(JwtAuthGuard)
    async reprocessAll(
        @CurrentUser() user,
    ) {
        await this.materialProcessingService.reprocessAllForUser(user.userId);
        return { message: 'Đã reprocess toàn bộ material của bạn' };
    }

    @Get('/materials/:id/summary')
    @UseGuards(JwtAuthGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async getSummary(
        @CurrentUser() user,
        @Param('id') id: string,
    ) {
        await this.materialService.findOne(user.userId, id);
        return this.materialService.getOrCreateSummary(user.userId, id);
    }


}
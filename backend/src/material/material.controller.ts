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

@Controller()
export class MaterialController {

    constructor(
        private readonly materialService: MaterialService,
        private readonly subjectService: SubjectService,
        private readonly materialProcessingService: MaterialProcessingService,
    ) { }

    @HttpCode(HttpStatus.ACCEPTED)
    @Post('/subjects/:subjectId/materials')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({ // chỉ định nơi lưu trữ
                destination: path.join(process.cwd(), 'uploads'), // mọi file đều lưu vào uploads/

                filename(req, file, callback) { // đặt tên file
                    const unique = Date.now() + "-" + file.originalname;
                    callback(null, unique);
                },
            }),

            // chỉ cho upload PDF
            fileFilter(req, file, callback) {
                if (file.mimetype !== 'application/pdf') {
                    return callback(
                        new BadRequestException('Chỉ được upload PDF'),
                        false,
                    );
                }
                callback(null, true);
            },
            // giới hạn kích thước
            limits: {
                fileSize: 10 * 1024 * 1024,
            }
        }),
    )
    // Nhận file 
    async upload(
        @CurrentUser() user,
        @Param('subjectId') subjectId: string,
        @UploadedFile() file: Express.Multer.File,


    ) {
        try {
            await this.subjectService.findOne(user.userId, subjectId);
        } catch (error) {
            if (file) {
                fs.unlinkSync(file.path);
            }
            throw error;
        }

        const material = await this.materialService.create({
            title: file.originalname,
            filePath: file.path,
            subjectId,
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
    @Get('/materials/:id')
    @UseGuards(JwtAuthGuard)
    async findOne(
        @CurrentUser() user,
        @Param('id') id: string,
    ) {
        return this.materialService.findOne(user.userId, id);
    }


}

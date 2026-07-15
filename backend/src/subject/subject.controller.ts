import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SubjectService } from './subject.service';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectController {
    constructor(private readonly subjectService: SubjectService,) { }
    @Post()
    create(
        @CurrentUser() user,
        @Body() dto: CreateSubjectDto,
    ) {
        return this.subjectService.create(
            user.userId,
            dto,
        );
    }

    @Get()
    findAll(
        @CurrentUser() user,
    ) {
        return this.subjectService.findAll(
            user.userId,
        );
    }

    @Get(':id')
    findOne(
        @CurrentUser() user,
        @Param('id') id: string,
    ) {
        return this.subjectService.findOne(
            user.userId,
            id,
        );
    }

    @Delete(':id')
    remove(
        @CurrentUser() user,
        @Param('id') id: string,
    ) {
        return this.subjectService.remove(
            user.userId,
            id,
        );
    }

    @Patch(':id')
    update(
        @CurrentUser() user,
        @Param('id') id: string,
        @Body() dto: UpdateSubjectDto,
    ) {
        return this.subjectService.update(
            user.userId,
            id,
            dto,
        );
    }
}

import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "src/auth/current-user.decorator";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { SubjectService } from "src/subject/subject.service";
import { QuizService } from "./quiz.service";
import { GenerateQuizDto } from "./dto/generate-quiz.dto";
import { SubmitQuizDto } from "./dto/submit-quiz.dto";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ActivityLogService } from "src/activity-log/activity-log.service";


@ApiTags('Quiz')
@ApiBearerAuth('access-token')
@Controller('subjects/:subjectId/quizzes')
@UseGuards(JwtAuthGuard)
export class QuizController {
    constructor(
        private readonly quizService: QuizService,
        private readonly subjectService: SubjectService,
        private readonly activityLogService: ActivityLogService,
    ) { }

    @Post('generate')
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    async generate(
        @CurrentUser() user,
        @Param('subjectId') subjectId: string,
        @Body() dto: GenerateQuizDto,
    ) {
        await this.subjectService.findOne(user.userId, subjectId);
        const quiz = await this.quizService.generateFromMaterial(subjectId, dto.materialId, dto.numberOfQuestions ?? 5, dto.questionType ?? 'mcq');
        await this.activityLogService.log(user.userId, 'quiz.generate', {
            entityType: 'Quiz', entityId: quiz?.id, metadata: { subjectId, materialId: dto.materialId },
        });
        return quiz;
    }

    @Get()
    async findAll(
        @CurrentUser() user,
        @Param('subjectId') subjectId: string,
    ) {
        await this.subjectService.findOne(user.userId, subjectId);
        return this.quizService.findAllBySubject(subjectId);
    }

    @Get(':quizId')
    async findOne(
        @CurrentUser() user,
        @Param('subjectId') subjectId: string,
        @Param('quizId') quizId: string,
    ) {
        await this.subjectService.findOne(user.userId, subjectId);
        return this.quizService.findOne(subjectId, quizId);
    }

    @Post(':quizId/submit')
    async submit(
        @CurrentUser() user,
        @Param('subjectId') subjectId: string,
        @Param('quizId') quizId: string,
        @Body() dto: SubmitQuizDto,
    ) {
        await this.subjectService.findOne(user.userId, subjectId);

        const result = await this.quizService.submitAttempt(
            user.userId,
            subjectId,
            quizId,
            dto.answers,
        );
        await this.activityLogService.log(user.userId, 'quiz.submit', {
            entityType: 'Quiz',
            entityId: quizId,
            metadata: { score: result.score },
        });
        return result;
    }

}


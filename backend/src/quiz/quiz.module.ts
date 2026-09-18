import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { SubjectModule } from "src/subject/subject.module";
import { QuizController } from "./quiz.controller";
import { QuizService } from "./quiz.service";
import { QuizGenerationService } from "./quiz-generation.service";
import { EssayGradingService } from "./essay-grading.service";

@Module({
    imports: [PrismaModule, SubjectModule],
    controllers: [QuizController],
    providers: [QuizService, QuizGenerationService, EssayGradingService],
})
export class QuizModule { }
import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "src/auth/current-user.decorator";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { SubjectService } from "src/subject/subject.service";
import { RagService } from "./rag.service";
import { AskQuestionDto } from "./dto/ask-question.dto";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";


@ApiTags('RAG')
@ApiBearerAuth('access-token')
@Controller('subjects/:subjectId')
@UseGuards(JwtAuthGuard)
export class RagController {
    constructor(
        private readonly ragService: RagService,
        private readonly subjectService: SubjectService,
    ) { }

    @Post('test-search')
    async testSearch(
        @CurrentUser() user,
        @Param('subjectId') subjectId: string,
        @Body() dto: AskQuestionDto,
    ) {
        await this.subjectService.findOne(user.userId, subjectId);
        return this.ragService.searchSimilarChunks(subjectId, dto.query);
    }

    @Post('ask')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async ask(
        @CurrentUser() user,
        @Param('subjectId') subjectId: string,
        @Body() dto: AskQuestionDto,
    ) {
        await this.subjectService.findOne(user.userId, subjectId);
        return this.ragService.askQuestion(subjectId, dto.query);
    }

    @Get('chat-history')
    async getChatHistory(
        @CurrentUser() user,
        @Param('subjectId') subjectId: string,
    ) {
        await this.subjectService.findOne(user.userId, subjectId);
        return this.ragService.getChatHistory(subjectId);
    }
}
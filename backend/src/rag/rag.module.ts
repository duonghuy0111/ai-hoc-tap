import { Module } from "@nestjs/common";
import { PrismaModule } from "prisma/prisma.module";
import { SubjectModule } from "src/subject/subject.module";
import { RagService } from "./rag.service";
import { RagController } from "./rag.controller";
import { MaterialModule } from "src/material/material.module";
import { RerankService } from "src/material/material-processing/rerank.service";
import { AnswerGenerationService } from "./answer-generation.service";

@Module({
    imports: [PrismaModule, MaterialModule, SubjectModule],
    controllers: [RagController],
    providers: [RagService, RerankService, AnswerGenerationService],
})
export class RagModule { }
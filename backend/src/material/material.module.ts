import { Module } from '@nestjs/common';
import { MaterialController } from './material.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { SubjectModule } from 'src/subject/subject.module';
import { MaterialProcessingService } from './material-processing/material-processing.service';
import { MaterialService } from './material.service';
import { ChunkingService } from './material-processing/chunking.service';
@Module({
  imports: [PrismaModule, SubjectModule],
  controllers: [MaterialController],
  providers: [MaterialService, MaterialProcessingService, ChunkingService],
})
export class MaterialModule { }

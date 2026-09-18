import { Module } from '@nestjs/common';
import { MaterialController } from './material.controller';
import { SubjectModule } from 'src/subject/subject.module';
import { MaterialProcessingService } from './material-processing/material-processing.service';
import { MaterialService } from './material.service';
import { ChunkingService } from './material-processing/chunking.service';
import { EmbeddingService } from './material-processing/embedding.service';
import { ConfigModule } from '@nestjs/config';
import { SummaryGenerationService } from './summary-generation.service';
import { ImageExtractionService } from './material-processing/image-extraction.service';
import { VideoExtractionService } from './material-processing/video-extraction.service';
@Module({
  imports: [SubjectModule, ConfigModule],
  controllers: [MaterialController],
  providers: [MaterialService, MaterialProcessingService, ChunkingService, EmbeddingService, SummaryGenerationService, ImageExtractionService, VideoExtractionService],
  exports: [EmbeddingService],
})
export class MaterialModule { }

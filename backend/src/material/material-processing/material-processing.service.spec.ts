import { Test, TestingModule } from '@nestjs/testing';
import { MaterialProcessingService } from './material-processing.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { PrismaService } from 'prisma/prisma.service';
import { ImageExtractionService } from './image-extraction.service';
import { VideoExtractionService } from './video-extraction.service';

describe('MaterialProcessingService', () => {
  let service: MaterialProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaterialProcessingService,
        {
          provide: PrismaService,
          useValue: {
            material: { update: jest.fn(), findUnique: jest.fn() },
            materialChunk: { createMany: jest.fn(), findMany: jest.fn() },
            $executeRaw: jest.fn(),
          },
        },
        {
          provide: ChunkingService,
          useValue: { chunkText: jest.fn().mockReturnValue(['chunk 1', 'chunk 2']) },
        },
        {
          provide: EmbeddingService,
          useValue: { embedBatch: jest.fn().mockResolvedValue([[0.1, 0.2]]) },
        },
        {
          provide: ImageExtractionService,
          useValue: { extractFromImage: jest.fn() },
        },
        {
          provide: VideoExtractionService,
          useValue: { extractFromVideo: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MaterialProcessingService>(MaterialProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { MaterialService } from './material.service';
import { PrismaService } from 'prisma/prisma.service';
import { SummaryGenerationService } from './summary-generation.service';

describe('MaterialService', () => {
  let service: MaterialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaterialService,
        {
          provide: PrismaService,
          useValue: {
            material: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            summary: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        }, {
          provide: SummaryGenerationService,
          useValue: {
            generateSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MaterialService>(MaterialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

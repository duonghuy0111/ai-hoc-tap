import { Test, TestingModule } from '@nestjs/testing';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';
import { SubjectService } from 'src/subject/subject.service';
import { MaterialProcessingService } from './material-processing/material-processing.service';
import { ActivityLogService } from 'src/activity-log/activity-log.service';
import { BadRequestException } from '@nestjs/common';

describe('MaterialController', () => {
  let controller: MaterialController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialController],
      providers: [
        {
          provide: MaterialService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: SubjectService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: MaterialProcessingService,
          useValue: { process: jest.fn() },
        },
        {
          provide: ActivityLogService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<MaterialController>(MaterialController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('không có file upload -> ném BadRequestException', async () => {
    const user = { userId: 'user-1' };

    await expect(
      controller.upload(
        user,
        'subject-1',
        undefined as unknown as Express.Multer.File,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

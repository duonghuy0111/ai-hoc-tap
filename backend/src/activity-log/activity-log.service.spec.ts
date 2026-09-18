import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogService } from './activity-log.service';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('ActivityLogService', () => {
    let service: ActivityLogService;
    let prisma: {
        activityLog: {
            create: jest.Mock;
            findMany: jest.Mock;
            count: jest.Mock;
        };
    };

    beforeEach(async () => {
        prisma = {
            activityLog: {
                create: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<ActivityLogService>(ActivityLogService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('ghi log thành công thì gọi prisma.activityLog.create đúng dữ liệu', async () => {
        prisma.activityLog.create.mockResolvedValue({});

        await service.log('user-1', 'subject.create', {
            entityType: 'Subject',
            entityId: 'subj-1',
        });

        expect(prisma.activityLog.create).toHaveBeenCalledWith({
            data: {
                userId: 'user-1',
                action: 'subject.create',
                entityType: 'Subject',
                entityId: 'subj-1',
                metadata: Prisma.JsonNull,
            },
        });
    });

    it('log() không được throw ra ngoài khi DB lỗi (không phá luồng nghiệp vụ chính)', async () => {
        prisma.activityLog.create.mockRejectedValue(new Error('DB tạm thời không kết nối được'));

        await expect(service.log('user-1', 'auth.login')).resolves.toBeUndefined();
    });

    it('findAllForUser trả về đúng danh sách, tổng số và giới hạn limit tối đa 100', async () => {
        prisma.activityLog.findMany.mockResolvedValue([{ id: 'log-1' }]);
        prisma.activityLog.count.mockResolvedValue(1);

        const result = await service.findAllForUser('user-1', 1, 500);

        expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            orderBy: { createdAt: 'desc' },
            skip: 0,
            take: 100,
        });
        expect(result).toEqual({ items: [{ id: 'log-1' }], total: 1, page: 1, limit: 100 });
    });
});
import { Test, TestingModule } from '@nestjs/testing';
import { ReminderService } from './reminder.service';
import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';

describe('ReminderService', () => {
    let service: ReminderService;
    let prisma: {
        studyTopic: {
            findMany: jest.Mock;
        };
        reminderLog: {
            createMany: jest.Mock;
        };
    };
    let emailService: {
        sendReviewReminder: jest.Mock;
    };
    let pushService: {
        sendToUser: jest.Mock;
    };

    beforeEach(async () => {
        prisma = {
            studyTopic: {
                findMany: jest.fn(),
            },
            reminderLog: {
                createMany: jest.fn(),
            },
        };

        emailService = {
            sendReviewReminder: jest.fn(),
        };

        pushService = {
            sendToUser: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReminderService,
                {
                    provide: PrismaService,
                    useValue: prisma,
                },
                {
                    provide: EmailService,
                    useValue: emailService,
                },
                {
                    provide: PushService,
                    useValue: pushService,
                },
            ],
        }).compile();

        service = module.get<ReminderService>(ReminderService);
    });

    it('should handle email sending failure without crashing', async () => {
        prisma.studyTopic.findMany.mockResolvedValue([
            {
                id: 'topic-1',
                title: 'Test topic',
                masteryScore: 50,
                subject: {
                    user: {
                        id: 'user-1',
                        email: 'test@example.com',
                    },
                },
            },
        ]);

        emailService.sendReviewReminder.mockRejectedValue(
            new Error('SMTP error'),
        );

        pushService.sendToUser.mockResolvedValue(true);

        await expect(service.checkAndSendReminders()).resolves.not.toThrow();

        expect(emailService.sendReviewReminder).toHaveBeenCalledWith(
            'test@example.com',
            'Test topic',
            50,
        );

        expect(prisma.reminderLog.createMany).not.toHaveBeenCalled();
    });
    it('should continue processing other topics when one topic fails', async () => {
        prisma.studyTopic.findMany.mockResolvedValue([
            {
                id: 'topic-1',
                title: 'Failed topic',
                masteryScore: 40,
                subject: {
                    user: {
                        id: 'user-1',
                        email: 'user1@example.com',
                    },
                },
            },
            {
                id: 'topic-2',
                title: 'Successful topic',
                masteryScore: 80,
                subject: {
                    user: {
                        id: 'user-2',
                        email: 'user2@example.com',
                    },
                },
            },
        ]);

        emailService.sendReviewReminder
            .mockRejectedValueOnce(new Error('SMTP error'))
            .mockResolvedValueOnce(true);

        pushService.sendToUser
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true);

        prisma.reminderLog.createMany.mockResolvedValue({ count: 2 });

        await expect(service.checkAndSendReminders()).resolves.not.toThrow();

        expect(emailService.sendReviewReminder).toHaveBeenCalledTimes(2);

        expect(emailService.sendReviewReminder).toHaveBeenNthCalledWith(
            1,
            'user1@example.com',
            'Failed topic',
            40,
        );

        expect(emailService.sendReviewReminder).toHaveBeenNthCalledWith(
            2,
            'user2@example.com',
            'Successful topic',
            80,
        );

        expect(prisma.reminderLog.createMany).toHaveBeenCalledTimes(1);
    });
    it('should not send reminder for topics that are not due', async () => {
        prisma.studyTopic.findMany.mockResolvedValue([]);

        await expect(service.checkAndSendReminders()).resolves.not.toThrow();

        expect(emailService.sendReviewReminder).not.toHaveBeenCalled();
        expect(pushService.sendToUser).not.toHaveBeenCalled();
        expect(prisma.reminderLog.createMany).not.toHaveBeenCalled();
    });
});


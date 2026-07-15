import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()

// extends PrismaClient: nghĩa là PrismaService có toàn bộ các hàm của prisma
// implements OnModuleInit: nghĩa là NestJS khởi động module, nó sẽ gọi await this.$connect(); để kết nối đến PostgresSQL
export class PrismaService extends PrismaClient implements OnModuleInit {
    async onModuleInit() {
        await this.$connect();
    }
}
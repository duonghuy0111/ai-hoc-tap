import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // chỉ cần import 1 lần trong AppModule, sau đó mọi module đều có thể inject PrismaService
@Module({
    providers: [PrismaService],
    exports: [PrismaService], // material inject prisma 
})
export class PrismaModule { }
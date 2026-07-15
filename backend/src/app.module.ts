import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';
import { SubjectModule } from './subject/subject.module';
import { MaterialModule } from './material/material.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, //Các module khác có thể dùng ConfigService mà k cần import lại ConfigModule
    }),
    AuthModule,
    PrismaModule,
    SubjectModule,
    MaterialModule,
  ],
  controllers: [AppController],
  providers: [AppService],

})
export class AppModule { }

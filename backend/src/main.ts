import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Chỉ giữ field có trong DTO
      forbidNonWhitelisted: true, // Không chỉ bỏ mà còn báo lỗi
      transform: true, // 
    }),
  );

  await app.listen(process.env.PORT ?? 3000);

}
bootstrap();

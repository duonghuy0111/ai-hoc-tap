import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { type StringValue } from 'ms';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({ // Vì JWT_SECRET chỉ có sau khi ConfigService đọc file .env.registerAsync() cho phép lấy cấu hình 1 cách động
      imports: [ConfigModule],
      inject: [ConfigService],

      // 1. Lấy JWT_SECRET từ .env | 2. Lấy thời gian hết hạn(15m) từ .env | 3. Trả về cấu hình cho JwtModule
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<StringValue>('JWT_EXPIRES_IN'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
  ],
  exports: [JwtModule], // giúp các provider trong AuthModule có thể sử dụng JwtService mà không cần đăng ký lại
})
export class AuthModule { }

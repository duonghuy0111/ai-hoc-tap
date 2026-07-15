import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async register(registerDto: RegisterDto) {
        const { name, email, password } = registerDto;

        // Kiểm tra email đã tồn tại 
        const existingUser = await this.prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (existingUser) {
            throw new ConflictException('Email đã tồn tại');
        }

        // Hash password 
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo User
        const user = await this.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        // Không trả password về Client
        return {
            message: 'Đăng ký thành công',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        };
    }
    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const user = await this.prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            throw new UnauthorizedException(
                'Email hoặc mật khẩu không đúng',
            );
        }
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password,
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException(
                'Email hoặc mật khẩu không đúng',
            );
        }
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);

        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: this.configService.getOrThrow<StringValue>('REFRESH_EXPIRES_IN'),
        });

        return {
            accessToken: accessToken,
            refreshToken: refreshToken,
        };
    }
}

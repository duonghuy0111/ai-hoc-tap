import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
import { ActivityLogService } from 'src/activity-log/activity-log.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly activityLogService: ActivityLogService,
    ) { }

    async register(registerDto: RegisterDto) {
        const { name, email, password } = registerDto;

        const existingUser = await this.prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (existingUser) {
            throw new ConflictException('Email đã tồn tại');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        await this.activityLogService.log(user.id, 'auth.register');
        return {
            message: 'Đăng ký thành công', user,
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
        await this.activityLogService.log(user.id, 'auth.login');
        const tokens = this.issueTokens(user.id, user.email, user.role);
        return {
            ...tokens,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        };
    }
    async refresh(refreshToken: string) {
        let payload: { sub: string; email: string; role: string; type: string };
        try {

            payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.getOrThrow<string>('REFRESH_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
        }
        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('Token không phải refresh token');
        }

        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user) {
            throw new UnauthorizedException('Người dùng không tồn tại');
        }
        return this.issueTokens(user.id, user.email, user.role);
    }
    private issueTokens(userId: string, email: string, role: string) {
        const accessToken = this.jwtService.sign(
            { sub: userId, email, role, type: 'access' },
        );
        const refreshToken = this.jwtService.sign(
            { sub: userId, email, role, type: 'refresh' },
            {
                secret: this.configService.getOrThrow<string>('REFRESH_SECRET'),
                expiresIn: this.configService.getOrThrow<StringValue>('REFRESH_EXPIRES_IN')
            },
        );  
        return { accessToken, refreshToken };
    }

}

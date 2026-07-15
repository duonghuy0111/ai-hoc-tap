import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { emitWarning } from "process";

@Injectable()
// extends... -> nghĩa là sử dụng Strategy JWT của thư viện passport-jwt
export class JwtStrategy extends PassportStrategy(Strategy) {
    // constructor -> mục đích là đọc jwt_secret từ .env
    constructor(private readonly configService: ConfigService) {
        super({
            // Lấy JWT từ header Authorization: Bearer <token>
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

            // Không bỏ qua thời gian hết hạn
            ignoreExpiration: false,

            // JWT_SECRET lấy từ file .env
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
        });
    }
    async validate(payload: {
        sub: string,
        email: string,
        role: string,
    }) {
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}
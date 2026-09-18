import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

export interface ActiveUserData {
    userId: string;
    email: string;
    role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

            ignoreExpiration: false,

            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
        });
    }
    async validate(payload: {
        sub: string,
        email: string,
        role: string,
        type?: string,
    }): Promise<ActiveUserData> {
        if (payload.type === 'refresh') {
            throw new UnauthorizedException('Không thể dùng refresh token để xác thực request');
        }
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}
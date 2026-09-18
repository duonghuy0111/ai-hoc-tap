import { Get, Request, UseGuards, Controller, Body, Post, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ActiveUserData } from './jwt.strategy';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('Auth')
@Controller('auth') 
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) { }

    @Post('register') 
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto); 
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: { user: ActiveUserData }) {
        return req.user;
    }

    @Post('login') 
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto); 
    }
    @Post('refresh')
    refresh(@Body() refreshDto: RefreshDto) {
        return this.authService.refresh(refreshDto.refreshToken);
    }

}

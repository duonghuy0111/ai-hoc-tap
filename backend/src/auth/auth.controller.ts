import { Get, Request, UseGuards, Controller, Body, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';



@Controller('auth') // mọi route trong controller sẽ bắt đầu bằng /auth
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register') // tạo endpoint POST/auth/register

    // @Body() -> lấy dữ liệu JSON từ request body
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto); // chuyển việc xử lý sang service
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }

    @Post('login') // tạo endpoint POST/auth/login
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto); // chuyển việc xử lý sang service
    }

}

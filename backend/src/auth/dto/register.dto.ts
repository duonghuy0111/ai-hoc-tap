import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

export class RegisterDto {
    @IsString()
    @IsNotEmpty() //Không được để trống
    name: string;

    @IsEmail() //Chỉ chấp nhận email
    email: string;

    @IsString()
    @MinLength(6) //Không được dưới 6 kí tự
    password: string;

}
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
    @IsString()
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    @Transform(({ value }) => value?.trim().toLowerCase())
    email!: string;

    @IsString()
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    password!: string;
}
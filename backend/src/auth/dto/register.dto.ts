import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
    @IsString({ message: 'Tên phải là chuỗi ký tự' })
    @Transform(({ value }) => value?.trim()) 
    @IsNotEmpty({ message: 'Tên không được để trống' }) 
    name!: string;

    @IsString({ message: 'Email phải là chuỗi ký tự' })
    @IsEmail({}, { message: 'Email không đúng định dạng' })
    @Transform(({ value }) => value?.trim().toLowerCase()) 
    email!: string;


    @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    password!: string;

}
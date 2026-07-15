import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSubjectDto {

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description: string;

}
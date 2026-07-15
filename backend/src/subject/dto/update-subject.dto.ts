import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateSubjectDto {

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description: string;

}
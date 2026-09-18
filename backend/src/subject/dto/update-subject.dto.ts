import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateSubjectDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

}
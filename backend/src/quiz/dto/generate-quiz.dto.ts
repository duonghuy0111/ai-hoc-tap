import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GenerateQuizDto {
    @IsString()
    materialId!: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(3)
    @Max(10)
    numberOfQuestions?: number = 5;

    @IsOptional()
    @IsIn(['mcq', 'essay'])
    questionType?: 'mcq' | 'essay' = 'mcq';
}
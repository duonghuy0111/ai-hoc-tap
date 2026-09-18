import { IsArray, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAnswerDto {
    @IsString()
    questionId!: string;

    @IsString()
    selected!: string;
}

export class SubmitQuizDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'Bài nộp phải có ít nhất 1 câu trả lời' })
    @ValidateNested({ each: true })
    @Type(() => SubmitAnswerDto)
    answers!: SubmitAnswerDto[];
}
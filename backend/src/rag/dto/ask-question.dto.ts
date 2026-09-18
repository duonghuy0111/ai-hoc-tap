import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";
export class AskQuestionDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    @MaxLength(1000)
    query!: string;
}
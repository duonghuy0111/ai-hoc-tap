import { IsNotEmpty, IsObject, IsString } from "class-validator";

class PushKeysDto {
    @IsNotEmpty()
    @IsString()
    p256dh!: string;

    @IsNotEmpty()
    @IsString()
    auth!: string;
}
export class SubscribePushDto {
    @IsNotEmpty()
    @IsString()
    endpoint!: string;

    @IsObject()
    keys!: PushKeysDto;
}
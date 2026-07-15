import { createParamDecorator, ExecutionContext } from "@nestjs/common";

// createParamDecorator: -> dùng để tự tạo Decorator
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        // ctx.switchToHttp() -> chúng ta đang xử lý request HTTP
        const request = ctx.switchToHttp().getRequest();

        // object được jwtstrategy.validate() trả về
        return request.user;
    },
);
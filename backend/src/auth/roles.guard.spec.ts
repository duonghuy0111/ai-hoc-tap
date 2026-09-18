import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
    let guard: RolesGuard;
    let mockReflector: { getAllAndOverride: jest.Mock };

    function mockContext(user?: { role: string }): ExecutionContext {
        return {
            switchToHttp: () => ({ getRequest: () => ({ user }) }),
            getHandler: () => ({}),
            getClass: () => ({}),
        } as unknown as ExecutionContext;
    }

    beforeEach(() => {
        mockReflector = { getAllAndOverride: jest.fn() };
        guard = new RolesGuard(mockReflector as unknown as Reflector);
    });

    it('route không gắn @Roles() -> cho qua, không cần kiểm tra role', () => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined);

        expect(guard.canActivate(mockContext({ role: 'user' }))).toBe(true);
    });

    it('route gắn @Roles([]) rỗng -> cho qua', () => {
        mockReflector.getAllAndOverride.mockReturnValue([]);

        expect(guard.canActivate(mockContext({ role: 'user' }))).toBe(true);
    });

    it('user có đúng role yêu cầu -> cho qua', () => {
        mockReflector.getAllAndOverride.mockReturnValue(['admin']);

        expect(guard.canActivate(mockContext({ role: 'admin' }))).toBe(true);
    });

    it('user KHÔNG có role yêu cầu -> ném ForbiddenException', () => {
        mockReflector.getAllAndOverride.mockReturnValue(['admin']);

        expect(() => guard.canActivate(mockContext({ role: 'user' }))).toThrow(ForbiddenException);
    });

    it('không có user trong request (trường hợp không nên xảy ra vì đã qua JwtAuthGuard) -> vẫn chặn an toàn', () => {
        mockReflector.getAllAndOverride.mockReturnValue(['admin']);

        expect(() => guard.canActivate(mockContext(undefined))).toThrow(ForbiddenException);
    });

    it('hỗ trợ nhiều role hợp lệ cùng lúc, ví dụ @Roles("admin", "moderator")', () => {
        mockReflector.getAllAndOverride.mockReturnValue(['admin', 'moderator']);

        expect(guard.canActivate(mockContext({ role: 'moderator' }))).toBe(true);
        expect(() => guard.canActivate(mockContext({ role: 'user' }))).toThrow(ForbiddenException);
    });
});

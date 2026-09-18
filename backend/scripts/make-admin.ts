import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('Cách dùng: npx ts-node scripts/make-admin.ts <email>');
        process.exit(1);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.error(`Không tìm thấy user với email "${email}". User phải đăng ký trước qua /auth/register.`);
        process.exit(1);
    }

    if (user.role === 'admin') {
        console.log(`User "${email}" đã là admin từ trước, không cần làm gì thêm.`);
        return;
    }

    await prisma.user.update({ where: { email }, data: { role: 'admin' } });
    console.log(`Đã nâng quyền "${email}" thành admin. User cần đăng nhập lại (login lại) để JWT token mới chứa đúng role="admin".`);
}

main()
    .catch((error) => {
        console.error('Lỗi khi nâng quyền admin:', error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

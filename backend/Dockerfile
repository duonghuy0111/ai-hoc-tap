# ============ STAGE 1: BUILD ============
# Cài đầy đủ devDependencies để build (TypeScript -> JavaScript) và generate Prisma Client.
FROM node:22-slim AS build

WORKDIR /app

# openssl cần thiết để Prisma Client hoạt động đúng trên Debian slim.
# python3/make/g++ cần thiết để npm cài được "bcrypt" (native binding, không
# phải "bcryptjs") - thiếu 3 gói này, "npm ci" sẽ lỗi ngay khi cố biên dịch
# bcrypt từ source trên image slim (image này không có sẵn công cụ build).
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client TRƯỚC khi build, vì PrismaService (dùng ở mọi module)
# import PrismaClient từ '@prisma/client' - cần chạy generate trước để package
# này có đủ type/code khớp đúng schema, nếu không build sẽ lỗi thiếu type.
RUN npx prisma generate

RUN npm run build

# Backup Prisma Client đã generate đúng (từ bước trên) TRƯỚC khi "npm ci
# --omit=dev" xóa sạch node_modules và cài lại từ đầu.
RUN cp -r node_modules/@prisma/client /tmp/prisma-client-backup && cp -r node_modules/.prisma /tmp/dot-prisma-backup

# Cài lại chỉ production dependencies cho stage sau (loại bỏ devDependencies
# như @types/*, eslint, jest... giúp image cuối nhẹ hơn đáng kể).
RUN npm ci --omit=dev

# QUAN TRỌNG: "npm ci" ở trên xóa mất Prisma Client đã generate (vì npm không
# biết đó là artifact cần giữ). KHÔNG generate lại bằng "npx prisma generate"
# ở đây, vì schema có thêm generator "prisma-dbml-generator" - một package
# CHỈ dùng lúc dev (sinh tài liệu DBML tham khảo), đã bị loại bỏ bởi lệnh
# --omit=dev phía trên, nên gọi lại generate sẽ lỗi "generator not found".
# Thay vào đó, khôi phục lại đúng client đã generate & build đúng từ trước.
#
# LƯU Ý VỀ "rm -rf" TRƯỚC "cp -r": "npm ci --omit=dev" đã tự tạo lại
# node_modules/@prisma/client (bản rỗng, chưa generate). Nếu chỉ chạy "cp -r
# backup node_modules/@prisma/client" mà không xóa đích trước, vì thư mục
# đích ĐÃ TỒN TẠI, "cp -r" sẽ copy LỒNG vào bên trong (tạo ra
# node_modules/@prisma/client/prisma-client-backup/...) thay vì ghi đè nội
# dung ở cấp gốc - khiến bản rỗng cũ vẫn còn nguyên, gây lỗi "did not
# initialize yet" dù lệnh cp không hề báo lỗi gì (đây là lỗi rất khó nhận ra).
RUN rm -rf node_modules/@prisma/client node_modules/.prisma \
    && cp -r /tmp/prisma-client-backup node_modules/@prisma/client \
    && cp -r /tmp/dot-prisma-backup node_modules/.prisma

# ============ STAGE 2: PRODUCTION ============
# Image cuối cùng chỉ chứa những gì cần để CHẠY server, không chứa source
# TypeScript hay devDependencies -> nhẹ hơn nhiều so với build image ở trên.
FROM node:22-slim AS production

WORKDIR /app

# ffmpeg là binary hệ điều hành thật - "fluent-ffmpeg" trong package.json chỉ là
# lớp gọi (wrapper) tới binary này, KHÔNG tự cài ffmpeg qua npm. Thiếu dòng này,
# server vẫn chạy được nhưng mọi tính năng xử lý video (tách audio, Whisper) sẽ lỗi.
RUN apt-get update -y \
    && apt-get install -y openssl ffmpeg \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./

# Thư mục lưu file upload tạm thời trước khi xử lý - phải tồn tại sẵn,
# nếu không code ghi file (multer diskStorage) sẽ lỗi ENOENT.
RUN mkdir -p uploads

EXPOSE 3000

# Chạy migration thật (không phải "migrate dev") rồi mới start server -
# đảm bảo schema DB luôn khớp code mới nhất mỗi khi container khởi động.
# Lưu ý: entry point thật là dist/src/main.js (không phải dist/main.js) vì
# tsconfig.json không khai rootDir rõ ràng - TypeScript tự suy ra gốc build
# là thư mục cha chung của cả src/ và prisma/, nên giữ nguyên tiền tố "src/"
# trong output. Khác với "nest start" (dùng khi chạy local) tự xử lý việc
# này, gọi "node" trực tiếp cần biết đúng đường dẫn thật.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
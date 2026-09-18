# Hướng dẫn triển khai bằng Docker

## Yêu cầu
- Đã cài [Docker Desktop](https://www.docker.com/products/docker-desktop/) (kèm sẵn Docker Compose v2).

## Kiến trúc container
| Service | Base image | Cổng expose | Vai trò |
|---|---|---|---|
| `db` | `pgvector/pgvector:pg16` | 5432 | PostgreSQL + extension pgvector |
| `backend` | `node:22-slim` (multi-stage) | 3000 | API NestJS |
| `frontend` | `nginx:alpine` (multi-stage) | 5173 → 80 | Giao diện React đã build tĩnh |

## Bước 1 — Chuẩn bị file môi trường
### 1.1. `backend/.env.docker` (file mới, riêng cho Docker)
Đây là điểm dễ nhầm nhất: khi backend chạy **bên trong** Docker, nó không thể kết nối `localhost` để tới database — vì `localhost` lúc này là chính container backend, không phải container database. Docker Compose tự tạo mạng nội bộ và đặt tên các service theo đúng tên khai báo trong `docker-compose.yml`, nên phải trỏ tới host `db` (tên service), không phải `localhost`.
Tạo file `backend/.env.docker` bằng cách copy từ `backend/.env` hiện có, **chỉ sửa đúng dòng `DATABASE_URL`**:

```env
# Trước (dùng khi chạy npm run dev ngoài Docker):
DATABASE_URL="postgresql://postgres:123456@localhost:5432/ai_hoc_tap"

# Sau (dùng khi chạy qua Docker Compose):
DATABASE_URL="postgresql://postgres:123456@db:5432/ai_hoc_tap"
```
Giữ nguyên toàn bộ các biến còn lại (`JWT_SECRET`, `OPENAI_API_KEY`, `EMAIL_USER`...) giống hệt file `.env` gốc.

### 1.2. Biến môi trường cho frontend (khai báo lúc chạy `docker compose`, không phải file riêng)

Frontend dùng biến `VITE_API_URL` và `VITE_VAPID_PUBLIC_KEY` — 2 biến này **phải có giá trị ngay lúc build** (không phải lúc container chạy), vì Vite nhúng thẳng giá trị vào file JavaScript tĩnh khi build, khác hẳn cách backend đọc biến môi trường lúc runtime.

Tạo file `.env` ở **thư mục gốc** `ai-hoc-tap/` (ngang hàng `docker-compose.yml`):

```env
VITE_API_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=<dán đúng giá trị VAPID public key của bạn>
```
## Bước 2 — Build và chạy toàn bộ hệ thống

Tại thư mục gốc `ai-hoc-tap/` (nơi có `docker-compose.yml`):

```bash
docker compose up --build
```

Lần đầu chạy sẽ mất vài phút để build image (cài dependencies, generate Prisma Client, build frontend). Các lần sau, Docker sẽ dùng cache nên nhanh hơn nhiều — chỉ cần:

```bash
docker compose up
```

## Bước 3 — Kiểm tra hệ thống đã chạy đúng

- Frontend: mở `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/api-docs`
- Database: chạy `docker exec -it ai-hoc-tap-db psql -U postgres -d ai_hoc_tap` nếu muốn kiểm tra trực tiếp

## Các lệnh hữu ích khác

```bash
# Chạy nền (không chiếm terminal)
docker compose up -d --build

# Xem log của 1 service cụ thể (hữu ích khi debug lỗi)
docker compose logs -f backend

# Dừng toàn bộ hệ thống
docker compose down

# Dừng và xóa luôn dữ liệu database (dùng khi muốn làm lại từ đầu)
# CẢNH BÁO: lệnh này xóa VĨNH VIỄN toàn bộ dữ liệu (user, môn học, tài liệu,
# lịch sử quiz...) vì nó xóa luôn named volume `pgdata`. Backup trước bằng
# `scripts/backup.sh` (hoặc `.ps1`) nếu còn dữ liệu cần giữ - xem mục
# "Backup / Restore database" bên dưới.
docker compose down -v
```

## Backup / Restore database

Container Postgres lưu dữ liệu vào named volume `pgdata`, nên dữ liệu vẫn còn
sau khi `docker compose down` (không kèm `-v`) hoặc restart máy. Nhưng volume
này **không phải backup** — nếu volume bị xóa (`docker compose down -v`) hoặc
ổ đĩa hỏng, dữ liệu mất vĩnh viễn. Dùng 2 script dưới đây để có bản sao thật
sự, lưu ở nơi khác (ví dụ commit vào Drive/USB trước khi nộp đồ án).

### Backup

```powershell
# Windows (PowerShell)
.\scripts\backup.ps1
```
```bash
# macOS/Linux hoặc Git Bash trên Windows
./scripts/backup.sh
```

Kết quả: 1 file `.sql` mới trong thư mục `backups/`, đặt tên theo thời điểm
backup (`ai_hoc_tap_20260903_101500.sql`). File này **không được commit lên
Git** (đã thêm vào `.gitignore`) vì chứa dữ liệu thật của người dùng (email,
nội dung tài liệu đã upload...).

### Restore

```powershell
# Windows (PowerShell)
.\scripts\restore.ps1 -BackupFile .\backups\ai_hoc_tap_20260903_101500.sql
```
```bash
# macOS/Linux hoặc Git Bash trên Windows
./scripts/restore.sh ./backups/ai_hoc_tap_20260903_101500.sql
```

Script sẽ hỏi xác nhận trước khi ghi đè (gõ `y` để tiếp tục) vì restore sẽ
**xóa sạch dữ liệu hiện có** trong database rồi nạp lại từ file backup — file
backup được tạo bằng cờ `--clean --if-exists` nên tự chứa lệnh xóa bảng cũ
trước khi tạo lại, không cần thao tác tay.

### Cách hoạt động (để hiểu, không bắt buộc đọc)

Cả 2 script đều chạy `pg_dump`/`psql` **bên trong** container `ai-hoc-tap-db`
(image `pgvector/pgvector:pg16` đã có sẵn 2 lệnh này), rồi dùng `docker cp` để
chuyển file backup ra/vào máy host, thay vì pipe/redirect (`>`) trực tiếp từ
PowerShell — vì PowerShell trên Windows có thể tự thêm BOM vào file khi
redirect, làm sai lệch nội dung file SQL text.

### Giới hạn đã biết (phù hợp mức đồ án)

- Backup thủ công (chạy tay khi cần), chưa có lịch tự động (cron) — với quy
  mô đồ án, chỉ cần backup trước những mốc quan trọng (trước khi đổi schema
  lớn, trước khi nộp bài, trước khi demo) là đủ.
- File backup lưu trên máy chạy Docker, chưa đồng bộ lên cloud/storage khác —
  nếu cần production thật, bước tiếp theo hợp lý là đẩy file backup lên S3/
  Google Drive bằng cron job, nhưng vượt quá phạm vi cần thiết ở đây.

## Xử lý sự cố thường gặp

**Backend báo lỗi kết nối database ngay khi start**
→ Kiểm tra `backend/.env.docker` có đúng host là `db` (không phải `localhost`) chưa. Đây là lỗi phổ biến nhất.

**Frontend gọi API bị lỗi CORS hoặc không kết nối được backend**
→ Kiểm tra biến `VITE_API_URL` lúc build đã đúng địa chỉ backend chưa. Nếu đổi giá trị này, phải build lại (`docker compose up --build`) vì Vite đã nhúng giá trị cũ vào file tĩnh, không tự cập nhật được nữa.

**Tính năng xử lý video (tách audio, phiên âm) không hoạt động khi chạy qua Docker**
→ Image backend đã cài sẵn `ffmpeg` thật trong `Dockerfile` (không chỉ package `fluent-ffmpeg` qua npm). Nếu vẫn lỗi, kiểm tra log bằng `docker compose logs backend` xem có báo `ffmpeg: command not found` không — nếu có, có thể do build cache cũ, chạy `docker compose build --no-cache backend`.

**Refresh trang ở route con (ví dụ `/dashboard`) bị lỗi 404**
→ Đã xử lý sẵn trong `frontend/nginx.conf` (cấu hình `try_files` fallback về `index.html` cho React Router). Nếu vẫn gặp, kiểm tra file này có được copy đúng vào image chưa.

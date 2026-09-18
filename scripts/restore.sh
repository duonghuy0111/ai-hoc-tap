#!/bin/bash
# Restore database từ 1 file backup .sql (do backup.sh tạo ra).
#
# CẢNH BÁO: lệnh này sẽ GHI ĐÈ toàn bộ dữ liệu hiện có trong database, vì file
# backup được tạo bằng --clean --if-exists nên tự chứa lệnh DROP trước khi
# tạo lại từng bảng.
set -e

CONTAINER_NAME="ai-hoc-tap-db"
DB_NAME="ai_hoc_tap"
DB_USER="postgres"

if [ -z "$1" ]; then
  echo "Cách dùng: ./restore.sh <đường-dẫn-file-backup.sql>"
  echo "Ví dụ:     ./restore.sh ../backups/ai_hoc_tap_20260903_101500.sql"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Lỗi: không tìm thấy file '$BACKUP_FILE'"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Lỗi: container '$CONTAINER_NAME' không chạy. Chạy 'docker compose up -d db' trước."
  exit 1
fi

read -p "CẢNH BÁO: thao tác này sẽ GHI ĐÈ toàn bộ dữ liệu hiện có trong '$DB_NAME'. Tiếp tục? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Đã hủy, không có gì bị thay đổi."
  exit 0
fi

FILE_NAME=$(basename "$BACKUP_FILE")
CONTAINER_TMP="/tmp/$FILE_NAME"

echo "Đang restore từ '$BACKUP_FILE' vào container '$CONTAINER_NAME'..."
docker cp "$BACKUP_FILE" "$CONTAINER_NAME:$CONTAINER_TMP"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f "$CONTAINER_TMP"
docker exec "$CONTAINER_NAME" rm "$CONTAINER_TMP"

echo "Restore hoàn tất."

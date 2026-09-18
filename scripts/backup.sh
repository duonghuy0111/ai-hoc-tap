#!/bin/bash
# Backup toàn bộ database Postgres (ai_hoc_tap) đang chạy trong Docker.
#
# Cách hoạt động: chạy pg_dump BÊN TRONG container để ghi file ra /tmp của
# chính container đó, sau đó dùng `docker cp` để lấy file ra máy host. Cách
# này tránh được lỗi encoding/BOM hay gặp khi pipe/redirect qua PowerShell.
#
# Dùng --clean --if-exists để file backup tự chứa lệnh DROP TABLE trước khi
# tạo lại, giúp restore an toàn nhiều lần mà không cần xoá tay database trước.
set -e

CONTAINER_NAME="ai-hoc-tap-db"
DB_NAME="ai_hoc_tap"
DB_USER="postgres"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE_NAME="ai_hoc_tap_${TIMESTAMP}.sql"
LOCAL_PATH="$BACKUP_DIR/$FILE_NAME"
CONTAINER_TMP="/tmp/$FILE_NAME"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Lỗi: container '$CONTAINER_NAME' không chạy. Chạy 'docker compose up -d db' trước."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Đang backup database '$DB_NAME' từ container '$CONTAINER_NAME'..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" --clean --if-exists -f "$CONTAINER_TMP" "$DB_NAME"
docker cp "$CONTAINER_NAME:$CONTAINER_TMP" "$LOCAL_PATH"
docker exec "$CONTAINER_NAME" rm "$CONTAINER_TMP"

echo "Backup thành công: $LOCAL_PATH"
ls -lh "$LOCAL_PATH"

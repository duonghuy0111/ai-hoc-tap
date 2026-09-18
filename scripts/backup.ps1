# Backup toàn bộ database Postgres (ai_hoc_tap) đang chạy trong Docker.
#
# Cách hoạt động: chạy pg_dump BÊN TRONG container để ghi file ra /tmp của
# chính container đó, sau đó dùng `docker cp` để lấy file ra máy host. Cách
# này tránh lỗi PowerShell tự thêm BOM khi dùng '>' hay Out-File để redirect,
# có thể làm hỏng file backup mà không rõ nguyên nhân.
#
# Dùng --clean --if-exists để file backup tự chứa lệnh DROP TABLE trước khi
# tạo lại, giúp restore an toàn nhiều lần mà không cần xoá tay database trước.

$ErrorActionPreference = "Stop"

$ContainerName = "ai-hoc-tap-db"
$DbName = "ai_hoc_tap"
$DbUser = "postgres"

$BackupDir = Join-Path $PSScriptRoot "..\backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$FileName = "ai_hoc_tap_$Timestamp.sql"
$LocalPath = Join-Path $BackupDir $FileName
$ContainerTmpPath = "/tmp/$FileName"

$running = docker ps --format "{{.Names}}" | Select-String -SimpleMatch $ContainerName
if (-not $running) {
    Write-Host "Lỗi: container '$ContainerName' không chạy. Chạy 'docker compose up -d db' trước."
    exit 1
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Host "Đang backup database '$DbName' từ container '$ContainerName'..."
docker exec $ContainerName pg_dump -U $DbUser --clean --if-exists -f $ContainerTmpPath $DbName
docker cp "${ContainerName}:${ContainerTmpPath}" $LocalPath
docker exec $ContainerName rm $ContainerTmpPath

Write-Host "Backup thành công: $LocalPath"
Get-Item $LocalPath | Format-List Name, Length, LastWriteTime

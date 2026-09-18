# Restore database từ 1 file backup .sql (do backup.ps1 tạo ra).
#
# CẢNH BÁO: lệnh này sẽ GHI ĐÈ toàn bộ dữ liệu hiện có trong database, vì file
# backup được tạo bằng --clean --if-exists nên tự chứa lệnh DROP trước khi
# tạo lại từng bảng.
#
# Cách dùng: .\restore.ps1 -BackupFile ..\backups\ai_hoc_tap_20260903_101500.sql

param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

$ContainerName = "ai-hoc-tap-db"
$DbName = "ai_hoc_tap"
$DbUser = "postgres"

if (-not (Test-Path $BackupFile)) {
    Write-Host "Lỗi: không tìm thấy file '$BackupFile'"
    exit 1
}

$running = docker ps --format "{{.Names}}" | Select-String -SimpleMatch $ContainerName
if (-not $running) {
    Write-Host "Lỗi: container '$ContainerName' không chạy. Chạy 'docker compose up -d db' trước."
    exit 1
}

$confirm = Read-Host "CANH BAO: thao tac nay se GHI DE toan bo du lieu hien co trong '$DbName'. Tiep tuc? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Đã hủy, không có gì bị thay đổi."
    exit 0
}

$FileName = Split-Path $BackupFile -Leaf
$ContainerTmpPath = "/tmp/$FileName"

Write-Host "Đang restore từ '$BackupFile' vào container '$ContainerName'..."
docker cp $BackupFile "${ContainerName}:${ContainerTmpPath}"
docker exec $ContainerName psql -U $DbUser -d $DbName -f $ContainerTmpPath
docker exec $ContainerName rm $ContainerTmpPath

Write-Host "Restore hoàn tất."

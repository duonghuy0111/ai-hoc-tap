-- DropIndex
DROP INDEX "MaterialChunk_embedding_idx";
-- Đổi số chiều vector từ 1536 (OpenAI) sang 768 (Gemini text-embedding-004)
-- An toàn vì chưa có dữ liệu embedding nào được lưu
ALTER TABLE "MaterialChunk" ALTER COLUMN embedding TYPE vector(768);
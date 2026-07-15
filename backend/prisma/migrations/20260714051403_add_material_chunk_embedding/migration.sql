ALTER TABLE "MaterialChunk"
ADD COLUMN "embedding" vector(1536);

CREATE INDEX "MaterialChunk_embedding_idx"
ON "MaterialChunk"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
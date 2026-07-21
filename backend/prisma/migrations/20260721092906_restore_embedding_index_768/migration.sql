-- This is an empty migration.
CREATE INDEX "MaterialChunk_embedding_idx" ON "MaterialChunk"
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
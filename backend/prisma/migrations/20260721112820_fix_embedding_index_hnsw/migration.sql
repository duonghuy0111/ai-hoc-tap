DROP INDEX "MaterialChunk_embedding_idx";

CREATE INDEX "MaterialChunk_embedding_idx" ON "MaterialChunk"
USING hnsw (embedding vector_cosine_ops);
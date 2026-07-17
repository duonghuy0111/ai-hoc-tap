CREATE INDEX "MaterialChunk_materialId_idx" ON "MaterialChunk"("materialId");

ALTER TABLE "MaterialChunk" DROP CONSTRAINT "MaterialChunk_materialId_fkey";
ALTER TABLE "MaterialChunk" ADD CONSTRAINT "MaterialChunk_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "Material"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
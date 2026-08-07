-- CreateTable
CREATE TABLE "Anexo" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "imagens" TEXT NOT NULL DEFAULT '[]',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provaId" TEXT,

    CONSTRAINT "Anexo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anexo_provaId_idx" ON "Anexo"("provaId");

-- AddForeignKey
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_provaId_fkey" FOREIGN KEY ("provaId") REFERENCES "Prova"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Prova" ADD COLUMN     "diaId" TEXT;

-- CreateTable
CREATE TABLE "Dia" (
    "id" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Prova" ADD CONSTRAINT "Prova_diaId_fkey" FOREIGN KEY ("diaId") REFERENCES "Dia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

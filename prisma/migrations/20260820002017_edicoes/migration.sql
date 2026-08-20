-- CreateTable
CREATE TABLE "Edicao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dados" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Edicao_pkey" PRIMARY KEY ("id")
);

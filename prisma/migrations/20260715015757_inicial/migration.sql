-- CreateTable
CREATE TABLE "Equipe" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integrante" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "lider" BOOLEAN NOT NULL DEFAULT false,
    "equipeId" TEXT NOT NULL,

    CONSTRAINT "Integrante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prova" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "pontosCumprir" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prova_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraColocacao" (
    "id" TEXT NOT NULL,
    "posicao" INTEGER NOT NULL,
    "pontos" INTEGER NOT NULL,
    "provaId" TEXT NOT NULL,

    CONSTRAINT "RegraColocacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resultado" (
    "id" TEXT NOT NULL,
    "posicao" INTEGER,
    "valor" TEXT,
    "pontos" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provaId" TEXT NOT NULL,
    "equipeId" TEXT NOT NULL,

    CONSTRAINT "Resultado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resultado_provaId_idx" ON "Resultado"("provaId");

-- CreateIndex
CREATE INDEX "Resultado_equipeId_idx" ON "Resultado"("equipeId");

-- AddForeignKey
ALTER TABLE "Integrante" ADD CONSTRAINT "Integrante_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraColocacao" ADD CONSTRAINT "RegraColocacao_provaId_fkey" FOREIGN KEY ("provaId") REFERENCES "Prova"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_provaId_fkey" FOREIGN KEY ("provaId") REFERENCES "Prova"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

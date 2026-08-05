/*
  Warnings:

  - You are about to drop the column `diaId` on the `Prova` table. All the data in the column will be lost.
  - You are about to drop the `Dia` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Prova" DROP CONSTRAINT "Prova_diaId_fkey";

-- AlterTable
ALTER TABLE "Prova" DROP COLUMN "diaId",
ADD COLUMN     "diaData" TEXT,
ADD COLUMN     "diaRotulo" TEXT;

-- DropTable
DROP TABLE "Dia";

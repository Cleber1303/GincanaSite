import { PrismaClient } from "@prisma/client";

// Singleton: no modo dev o Next recarrega o codigo a cada save; sem isso,
// cada reload abriria uma nova conexao e estouraria o limite do banco.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

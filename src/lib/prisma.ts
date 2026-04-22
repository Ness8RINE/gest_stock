import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

function getDbPath(): string {
  // En production Electron, DATABASE_URL est défini par main.ts (chemin AppData)
  // En développement Next.js, on utilise le fichier local dev.db
  if (process.env.DATABASE_URL) {
    // Enlever le préfixe "file:" si présent
    return process.env.DATABASE_URL.replace(/^file:/, "");
  }
  return path.join(process.cwd(), "dev.db");
}

const prismaClientSingleton = () => {
  const adapter = new PrismaBetterSqlite3({ url: `file:${getDbPath()}` });
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

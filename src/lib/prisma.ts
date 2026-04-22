import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import os from "os";
import { existsSync } from "fs";

function getDbPath(): string {
  let dbPath = "./dev.db";
  
  // En production Desktop, main.ts injecte DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL.replace(/^file:/, "");
  }

  // En développement, on cherche AppData
  if (process.env.NODE_ENV !== "production") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    const desktopDbPath = path.join(appData, "GestStock", "geststock.db");
    
    if (existsSync(desktopDbPath)) {
      return desktopDbPath;
    }
  }
  
  return path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
}

const prismaClientSingleton = () => {
  const sqlitePath = getDbPath();
  const url = `file:${sqlitePath}`;

  // On essaie d'abord d'utiliser l'adapter better-sqlite3 car c'est le plus performant
  // Il sera utilisé si le module natif est compatible avec le Node.js courant
  try {
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter });
  } catch (error) {
    // Si l'adapter échoue (ex: version de Node différente), on bascule sur le driver standard de Prisma
    // Cela garantit que l'application démarre toujours, même avec un problème de compilation
    console.error("[PRISMA] Adapter not available, falling back to standard driver:", error);
    return new PrismaClient({
      datasources: {
        db: {
          url: url
        }
      }
    });
  }
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export { getDbPath };
export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

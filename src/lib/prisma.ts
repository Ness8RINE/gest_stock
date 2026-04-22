import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import os from "os";
import { existsSync } from "fs";

function getDbPath(): string {
  let dbPath = "./dev.db";
  
  if (process.env.DATABASE_URL) {
    dbPath = process.env.DATABASE_URL.replace(/^file:/, "");
  }

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

  // Maintenant que better-sqlite3 est recompilé, on peut l'utiliser partout en toute sécurité
  const adapter = new PrismaBetterSqlite3({ url });
  
  return new PrismaClient({ 
    // @ts-ignore
    adapter 
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

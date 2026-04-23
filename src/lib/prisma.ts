import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import os from "os";
import { existsSync } from "fs";

function getDbPath(): string {
  // 1. Priorité absolue : l'URL injectée par Electron (en production)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL.replace(/^file:/, "");
  }

  // 2. En développement, on cherche d'abord la base "réelle" du Desktop dans AppData
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const desktopDbPath = path.join(appData, "GestStock", "geststock.db");
  
  if (existsSync(desktopDbPath)) {
    console.log("[PRISMA] Base Desktop détectée :", desktopDbPath);
    return desktopDbPath;
  }

  // 3. Sinon, on utilise la base locale du projet
  const localDbPath = path.resolve(process.cwd(), "dev.db");
  console.log("[PRISMA] Utilisation de la base locale :", localDbPath);
  return localDbPath;
}

function getAttachmentsPath(): string {
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const attachmentsPath = path.join(appData, "GestStock", "attachments");
  return attachmentsPath;
}

const prismaClientSingleton = () => {
  const sqlitePath = getDbPath();
  const url = `file:${sqlitePath}`;

  try {
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error("[PRISMA] Échec de l'adaptateur, bascule sur le driver standard :", error);
    return new PrismaClient({
      datasourceUrl: url
    } as any);
  }
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export { getDbPath, getAttachmentsPath };
export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

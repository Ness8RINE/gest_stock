import { PrismaClient } from "@prisma/client";
import path from "path";
import os from "os";
import fs from "fs";

async function main() {
  const db1 = path.resolve(process.cwd(), "dev.db");
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const db2 = path.resolve(appData, "GestStock", "geststock.db");

  console.log("--- DIAGNOSTIC DES BASES ---");
  
  if (fs.existsSync(db1)) {
    const p1 = new PrismaClient({ datasourceUrl: "file:" + db1 } as any);
    const count = await p1.product.count();
    console.log(`dev.db (local) : ${count} produits trouvés.`);
    await p1.$disconnect();
  } else {
    console.log("dev.db : Introuvable.");
  }

  if (fs.existsSync(db2)) {
    const p2 = new PrismaClient({ datasourceUrl: "file:" + db2 } as any);
    const count = await p2.product.count();
    console.log(`AppData (desktop) : ${count} produits trouvés.`);
    await p2.$disconnect();
  } else {
    console.log("AppData db : Introuvable.");
  }
}

main();

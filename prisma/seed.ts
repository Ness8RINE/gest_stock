import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  const adminEmail = "admin@stock.com";
  const hashedPassword = await bcrypt.hash("berrahou1948", 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      email: adminEmail,
      name: "Admin EMED",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Seed terminé:", admin.email);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error("❌ Erreur seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

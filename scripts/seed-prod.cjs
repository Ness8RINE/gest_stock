const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const path = require("path");

async function main() {
  const dbPath = process.env.DATABASE_URL.replace(/^file:/, "");
  console.log("🌱 Seeding production database at:", dbPath);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
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

    console.log("✅ Seed terminé avec succès:", admin.email);
  } catch (error) {
    console.error("❌ Erreur lors du seed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

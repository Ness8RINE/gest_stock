import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function wipeProformas() {
  try {
    console.log("Suppression des anciennes proformas...");
    const result = await prisma.document.deleteMany({
      where: {
        type: "PROFORMA"
      }
    });
    console.log(`Supprimé : ${result.count} documents.`);
  } catch (error) {
    console.error("Erreur wipe:", error);
  } finally {
    await prisma.$disconnect();
  }
}

wipeProformas();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const doc = await prisma.document.findFirst({
    where: { reference: "PROF-0002" },
    include: { lines: true }
  });
  console.log(JSON.stringify(doc, null, 2));
}

main();

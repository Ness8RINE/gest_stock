import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkTransfers() {
  const transfers = await prisma.document.findMany({
    where: { type: 'TRANSFER' },
    include: {
      lines: true,
      stockMovements: true
    }
  })

  console.log('Transfers found:', transfers.length)
  for (const t of transfers) {
    console.log(`- Reference: ${t.reference}, ID: ${t.id}`)
    console.log(`  Lines: ${t.lines.length}`)
    console.log(`  Movements: ${t.stockMovements.length}`)
  }
}

checkTransfers()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

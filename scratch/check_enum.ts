import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$queryRaw`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE typname = 'DocumentType';
  `
  console.log('Enum Values in DB:', result)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())

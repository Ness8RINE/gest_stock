import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log("DB URL:", process.env.DATABASE_URL);
  try {
    console.log("Querying User count...");
    const count = await prisma.user.count();
    console.log("Count:", count);
    
    console.log("Querying first 5 users...");
    const users = await prisma.user.findMany({ take: 5 });
    console.log("Users:", users.map(u => u.email));
  } catch (err) {
    console.error("PRISMA ERROR:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();

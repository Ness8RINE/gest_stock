import "dotenv/config";
import path from "path";
import { defineConfig } from "prisma/config";

// En production Electron, DATABASE_URL est défini dynamiquement par main.ts
// En développement, utiliser le fichier local dev.db
const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: dbUrl,
  },
});

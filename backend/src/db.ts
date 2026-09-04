import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — one connection pool for the entire process.
// Previously each service file created its own PrismaClient(), exhausting
// PostgreSQL connection limits under any load.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;

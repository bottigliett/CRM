import { PrismaClient } from '@prisma/client';

// Create Prisma Client directly for MySQL (no adapter needed)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

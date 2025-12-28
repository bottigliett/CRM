import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function importMissingContacts() {
  try {
    // Get user for createdBy
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.findFirst({ where: { id: 2 } });
    }

    if (!user) {
      console.error('No user found in database');
      return;
    }

    console.log('Importing missing contacts...\n');

    // Contact 1: Arianna Aprosio
    const arianna = await prisma.contact.findFirst({
      where: { email: 'arianna28aprosio@gmail.com' }
    });

    if (!arianna) {
      await prisma.contact.create({
        data: {
          name: 'Arianna Aprosio',
          email: 'arianna28aprosio@gmail.com',
          phone: '+39 3318564676',
          address: 'Mendrisio (Svizzera)',
          type: 'COLLABORATION',
        }
      });
      console.log('✓ Imported: Arianna Aprosio');
    } else {
      console.log('- Arianna Aprosio already exists');
    }

    // Contact 2: Gloria Giacobbo
    const gloria = await prisma.contact.findFirst({
      where: { email: 'gloriagiacobbo@gmail.com' }
    });

    if (!gloria) {
      await prisma.contact.create({
        data: {
          name: 'Gloria Giacobbo',
          email: 'gloriagiacobbo@gmail.com',
          address: 'Verona',
          type: 'COLLABORATION',
        }
      });
      console.log('✓ Imported: Gloria Giacobbo');
    } else {
      console.log('- Gloria Giacobbo already exists');
    }

    // Summary
    const total = await prisma.contact.count();
    console.log(`\n=== Summary ===`);
    console.log(`Total contacts in database: ${total}`);

    const byType = await prisma.contact.groupBy({
      by: ['type'],
      _count: true
    });

    console.log('\nBy type:');
    byType.forEach(g => console.log(`  ${g.type}: ${g._count}`));

  } catch (error) {
    console.error('Error importing contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importMissingContacts();

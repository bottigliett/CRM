import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function updateTecnoreteVillafranca() {
  try {
    console.log('Updating Tecnorete Villafranca to CLIENT...\n');

    const contact = await prisma.contact.findUnique({
      where: { id: 200 }
    });

    if (!contact) {
      console.error('❌ Contact with ID 200 not found');
      return;
    }

    console.log('Current data:');
    console.log(`  Name: ${contact.name}`);
    console.log(`  Type: ${contact.type}`);

    const updated = await prisma.contact.update({
      where: { id: 200 },
      data: {
        type: 'CLIENT'
      }
    });

    console.log('\n✓ Updated successfully!');
    console.log(`  Name: ${updated.name}`);
    console.log(`  Type: ${updated.type}`);

    // Summary
    const byType = await prisma.contact.groupBy({
      by: ['type'],
      _count: true
    });

    console.log('\n=== Contacts by type ===');
    byType.forEach(g => console.log(`  ${g.type}: ${g._count}`));

  } catch (error) {
    console.error('Error updating contact:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTecnoreteVillafranca();

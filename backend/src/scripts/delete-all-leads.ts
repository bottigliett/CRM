import prisma from '../config/database';

async function deleteAllLeads() {
  try {
    console.log('🗑️  Deleting all leads and prospects...\n');

    const result = await prisma.contact.deleteMany({
      where: {
        OR: [
          { type: 'LEAD' },
          { type: 'PROSPECT' },
        ],
      },
    });

    console.log(`✅ Deleted ${result.count} leads/prospects successfully\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting leads:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

deleteAllLeads();

import prisma from '../config/database';

async function check() {
  try {
    const leads = await prisma.contact.findMany({
      where: { type: 'LEAD' },
      take: 5,
    });

    console.log('Sample LEAD records:');
    leads.forEach(l => {
      console.log(`  - ${l.name}: funnelStage="${l.funnelStage}"`);
    });

    const stages = await prisma.leadFunnelStage.findMany({
      orderBy: { order: 'asc' },
    });

    console.log('\nFunnel stages:');
    stages.forEach(s => {
      console.log(`  - ${s.name} (order: ${s.order})`);
    });

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

check();

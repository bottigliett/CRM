import prisma from '../config/database';

async function seedFunnelStages() {
  try {
    // Check if stages already exist
    const existingStages = await prisma.leadFunnelStage.findMany();

    if (existingStages.length > 0) {
      console.log('Funnel stages already exist. Skipping seed.');
      await prisma.$disconnect();
      process.exit(0);
    }

    // Create default stages
    const stages = [
      { name: 'daContattare', order: 0, color: '#3b82f6' },
      { name: 'contattati', order: 1, color: '#10b981' },
      { name: 'chiusi', order: 2, color: '#8b5cf6' },
      { name: 'persi', order: 3, color: '#ef4444' },
    ];

    for (const stage of stages) {
      await prisma.leadFunnelStage.create({
        data: stage,
      });
    }

    console.log('✅ Default funnel stages created successfully');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding funnel stages:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedFunnelStages();

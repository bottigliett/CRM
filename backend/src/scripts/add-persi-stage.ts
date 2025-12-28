import prisma from '../config/database';

async function addPersiStage() {
  try {
    // Check if persi stage already exists
    const existing = await prisma.leadFunnelStage.findUnique({
      where: { name: 'persi' }
    });

    if (existing) {
      console.log('Stage "persi" already exists.');
      await prisma.$disconnect();
      process.exit(0);
    }

    // Create persi stage
    await prisma.leadFunnelStage.create({
      data: {
        name: 'persi',
        order: 3,
        color: '#ef4444',
      },
    });

    console.log('✅ Stage "persi" created successfully');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error adding persi stage:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addPersiStage();

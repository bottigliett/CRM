import prisma from '../config/database';

async function fixFunnelStages() {
  try {
    console.log('🔧 Fixing funnel stages for imported leads...\n');

    // Update all LEAD and PROSPECT records that have null funnelStage
    const result = await prisma.contact.updateMany({
      where: {
        AND: [
          {
            OR: [
              { type: 'LEAD' },
              { type: 'PROSPECT' },
            ],
          },
          {
            funnelStage: null,
          },
        ],
      },
      data: {
        funnelStage: 'daContattare',
        funnelPosition: 0,
      },
    });

    console.log(`✅ Updated ${result.count} leads/prospects with default funnel stage 'daContattare'`);

    // Verify
    const leadCount = await prisma.contact.count({
      where: {
        type: 'LEAD',
        funnelStage: 'daContattare',
      },
    });

    const prospectCount = await prisma.contact.count({
      where: {
        type: 'PROSPECT',
        funnelStage: 'daContattare',
      },
    });

    console.log(`\n📊 Current counts:`);
    console.log(`  - LEADs in 'daContattare': ${leadCount}`);
    console.log(`  - PROSPECTs in 'daContattare': ${prospectCount}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixFunnelStages();

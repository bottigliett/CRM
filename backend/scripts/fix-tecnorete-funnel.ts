import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function fixTecnoreteVillafranca() {
  try {
    console.log('Fixing Tecnorete Villafranca funnel stage...\n');

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
    console.log(`  Funnel Stage: ${contact.funnelStage}`);
    console.log(`  Funnel Value: ${contact.funnelValue}`);
    console.log(`  Funnel Position: ${contact.funnelPosition}`);

    const updated = await prisma.contact.update({
      where: { id: 200 },
      data: {
        funnelStage: null,
        funnelValue: null,
        funnelPosition: null,
      }
    });

    console.log('\n✓ Updated successfully!');
    console.log(`  Name: ${updated.name}`);
    console.log(`  Type: ${updated.type}`);
    console.log(`  Funnel Stage: ${updated.funnelStage}`);
    console.log(`  Funnel Value: ${updated.funnelValue}`);
    console.log(`  Funnel Position: ${updated.funnelPosition}`);

    console.log('\n✅ Tecnorete Villafranca is now visible in the contacts list!');

  } catch (error) {
    console.error('Error fixing contact:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTecnoreteVillafranca();

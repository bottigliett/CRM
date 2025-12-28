import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function fixMissingContactData() {
  try {
    console.log('=== FIXING MISSING CONTACT DATA ===\n');

    // Fix Maddalena Dalle Pezze
    console.log('Updating Maddalena Dalle Pezze (ID 74)...');
    await prisma.contact.update({
      where: { id: 74 },
      data: {
        codiceFiscale: 'DLLMDL99E70F861Z'
      }
    });
    console.log('✓ Added CF: DLLMDL99E70F861Z\n');

    // Fix Sara Lonardi
    console.log('Updating Sara Lonardi (ID 101)...');
    await prisma.contact.update({
      where: { id: 101 },
      data: {
        partitaIva: '05096850234'
      }
    });
    console.log('✓ Added P.IVA: 05096850234\n');

    // Fix Sara Salvatore
    console.log('Updating Sara Salvatore (ID 112)...');
    await prisma.contact.update({
      where: { id: 112 },
      data: {
        partitaIva: '09593040968'
      }
    });
    console.log('✓ Added P.IVA: 09593040968\n');

    // Fix Marco Paganotto
    console.log('Updating Marco Paganotto (ID 121)...');
    await prisma.contact.update({
      where: { id: 121 },
      data: {
        partitaIva: '05120520233'
      }
    });
    console.log('✓ Added P.IVA: 05120520233\n');

    console.log('✅ All contacts updated successfully!');

  } catch (error) {
    console.error('Error fixing contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingContactData();

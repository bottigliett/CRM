import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetFinancePreferences() {
  try {
    console.log('🔄 Resetting Finance page preferences...');

    // Elimina tutte le preferences per la pagina Finance
    const result = await prisma.userPagePreference.deleteMany({
      where: {
        pageName: 'finance',
      },
    });

    console.log(`✅ Deleted ${result.count} Finance preferences`);
    console.log('💡 Users will now see the default values (year 2026)');
  } catch (error) {
    console.error('❌ Error resetting Finance preferences:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetFinancePreferences()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

import { TransactionType } from '@prisma/client';
import prisma from '../config/database';

async function seedFinance() {
  console.log('🌱 Seeding Finance data...');

  try {
    // Seed Transaction Categories
    console.log('📊 Creating transaction categories...');

    const categories = [
      // Income categories
      { name: 'Fattura Cliente', type: TransactionType.INCOME, icon: '💰', color: '#10b981' },
      { name: 'Consulenza', type: TransactionType.INCOME, icon: '👨‍💼', color: '#3b82f6' },
      { name: 'Progetto', type: TransactionType.INCOME, icon: '🚀', color: '#8b5cf6' },
      { name: 'Servizio Ricorrente', type: TransactionType.INCOME, icon: '🔄', color: '#06b6d4' },
      { name: 'Altro Ricavo', type: TransactionType.INCOME, icon: '📈', color: '#22c55e' },

      // Expense categories
      { name: 'Affitto Ufficio', type: TransactionType.EXPENSE, icon: '🏢', color: '#ef4444' },
      { name: 'Utenze', type: TransactionType.EXPENSE, icon: '⚡', color: '#f97316' },
      { name: 'Stipendi', type: TransactionType.EXPENSE, icon: '👥', color: '#dc2626' },
      { name: 'Software/Abbonamenti', type: TransactionType.EXPENSE, icon: '💻', color: '#ec4899' },
      { name: 'Marketing', type: TransactionType.EXPENSE, icon: '📣', color: '#f59e0b' },
      { name: 'Formazione', type: TransactionType.EXPENSE, icon: '📚', color: '#a855f7' },
      { name: 'Hardware', type: TransactionType.EXPENSE, icon: '🖥️', color: '#06b6d4' },
      { name: 'Consulenze Esterne', type: TransactionType.EXPENSE, icon: '🤝', color: '#e11d48' },
      { name: 'Spese Bancarie', type: TransactionType.EXPENSE, icon: '🏦', color: '#be123c' },
      { name: 'Tasse', type: TransactionType.EXPENSE, icon: '📋', color: '#991b1b' },
      { name: 'Altro Costo', type: TransactionType.EXPENSE, icon: '📉', color: '#dc2626' },
    ];

    // Check if categories already exist
    const existingCategories = await prisma.transactionCategory.count();
    if (existingCategories === 0) {
      await prisma.transactionCategory.createMany({
        data: categories,
      });
      console.log(`✅ Created ${categories.length} transaction categories`);
    } else {
      console.log(`ℹ️  ${existingCategories} transaction categories already exist, skipping...`);
    }

    // Seed Payment Methods
    console.log('💳 Creating payment methods...');

    const paymentMethods = [
      { name: 'Bonifico Bancario' },
      { name: 'Carta di Credito' },
      { name: 'PayPal' },
      { name: 'Stripe' },
      { name: 'Contanti' },
      { name: 'Assegno' },
      { name: 'RiBa' },
      { name: 'SDD (Addebito Diretto SEPA)' },
    ];

    // Check if payment methods already exist
    const existingMethods = await prisma.paymentMethod.count();
    if (existingMethods === 0) {
      await prisma.paymentMethod.createMany({
        data: paymentMethods,
      });
      console.log(`✅ Created ${paymentMethods.length} payment methods`);
    } else {
      console.log(`ℹ️  ${existingMethods} payment methods already exist, skipping...`);
    }

    console.log('✅ Finance seed completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding finance data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedFinance()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

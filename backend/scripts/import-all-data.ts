import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting full database import...');

  // Step 1: Create payment methods
  console.log('\n📦 Creating payment methods...');
  const paymentMethods = [
    { id: 1, name: 'Bonifico bancario', isActive: true },
    { id: 2, name: 'Carta di credito', isActive: true },
    { id: 3, name: 'Stripe', isActive: true },
    { id: 5, name: 'Contanti', isActive: true },
    { id: 9, name: 'Altro', isActive: true },
  ];
  
  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { id: pm.id },
      update: pm,
      create: pm,
    });
  }
  console.log(`✅ Created ${paymentMethods.length} payment methods`);

  // Step 2: Import finance categories
  console.log('\n📦 Importing finance categories...');
  const financeCategories = [
    // Income categories (active only)
    { id: 1, name: 'Fatture Clienti', type: 'INCOME' as const, color: '#22c55e', icon: '📄', isActive: true },
    { id: 2, name: 'Consulenze', type: 'INCOME' as const, color: '#3b82f6', icon: '💼', isActive: true },
    { id: 3, name: 'Formazione', type: 'INCOME' as const, color: '#8b5cf6', icon: '🎓', isActive: true },
    { id: 4, name: 'Progetti Web', type: 'INCOME' as const, color: '#06b6d4', icon: '🌐', isActive: true },
    { id: 5, name: 'Marketing', type: 'INCOME' as const, color: '#f59e0b', icon: '📈', isActive: true },
    { id: 24, name: 'Altri Ricavi', type: 'INCOME' as const, color: '#64748b', icon: '💰', isActive: true },
    // Expense categories (active only)
    { id: 8, name: 'Utenze', type: 'EXPENSE' as const, color: '#f97316', icon: '💡', isActive: true },
    { id: 9, name: 'Software', type: 'EXPENSE' as const, color: '#8b5cf6', icon: '💻', isActive: true },
    { id: 10, name: 'Hardware', type: 'EXPENSE' as const, color: '#6366f1', icon: '🖥️', isActive: true },
    { id: 11, name: 'Marketing/Pubblicità', type: 'EXPENSE' as const, color: '#ec4899', icon: '📢', isActive: true },
    { id: 12, name: 'Fornitori', type: 'EXPENSE' as const, color: '#14b8a6', icon: '📦', isActive: true },
    { id: 13, name: 'Tasse', type: 'EXPENSE' as const, color: '#dc2626', icon: '🏛️', isActive: true },
    { id: 14, name: 'Stipendi', type: 'EXPENSE' as const, color: '#059669', icon: '👥', isActive: true },
    { id: 15, name: 'Consulenze', type: 'EXPENSE' as const, color: '#7c3aed', icon: '🤝', isActive: true },
    { id: 16, name: 'Viaggi', type: 'EXPENSE' as const, color: '#0ea5e9', icon: '✈️', isActive: true },
    { id: 17, name: 'Formazione', type: 'EXPENSE' as const, color: '#84cc16', icon: '📚', isActive: true },
    { id: 18, name: 'Varie', type: 'EXPENSE' as const, color: '#737373', icon: '📌', isActive: true },
    { id: 25, name: 'Affitto', type: 'EXPENSE' as const, color: '#ef4444', icon: '🏢', isActive: true },
  ];

  for (const cat of financeCategories) {
    await prisma.transactionCategory.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat,
    });
  }
  console.log(`✅ Imported ${financeCategories.length} finance categories`);

  console.log('\n✨ Database import completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

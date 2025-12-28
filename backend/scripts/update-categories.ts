import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

const categories = [
  // INCOME categories (active only)
  { id: 1, name: 'Fatture Clienti', type: 'INCOME', color: '#22c55e', icon: '📄', description: 'Entrate da fatture emesse', isActive: true },
  { id: 2, name: 'Consulenze', type: 'INCOME', color: '#3b82f6', icon: '💼', description: 'Entrate da consulenze', isActive: true },
  { id: 3, name: 'Formazione', type: 'INCOME', color: '#8b5cf6', icon: '🎓', description: 'Entrate da corsi e formazione', isActive: true },
  { id: 4, name: 'Progetti Web', type: 'INCOME', color: '#06b6d4', icon: '🌐', description: 'Entrate da sviluppo web', isActive: true },
  { id: 5, name: 'Marketing', type: 'INCOME', color: '#f59e0b', icon: '📈', description: 'Entrate da servizi marketing', isActive: true },
  { id: 24, name: 'Altri Ricavi', type: 'INCOME', color: '#64748b', icon: '💰', description: 'Altri tipi di entrate', isActive: true },

  // EXPENSE categories (active only)
  { id: 8, name: 'Utenze', type: 'EXPENSE', color: '#f97316', icon: '💡', description: 'Bollette e utenze varie', isActive: true },
  { id: 9, name: 'Software', type: 'EXPENSE', color: '#8b5cf6', icon: '💻', description: 'Licenze software e abbonamenti', isActive: true },
  { id: 10, name: 'Hardware', type: 'EXPENSE', color: '#6366f1', icon: '🖥️', description: 'Acquisto hardware e attrezzature', isActive: true },
  { id: 11, name: 'Marketing/Pubblicità', type: 'EXPENSE', color: '#ec4899', icon: '📢', description: 'Spese pubblicitarie e marketing', isActive: true },
  { id: 12, name: 'Fornitori', type: 'EXPENSE', color: '#14b8a6', icon: '📦', description: 'Pagamenti a fornitori', isActive: true },
  { id: 13, name: 'Tasse', type: 'EXPENSE', color: '#dc2626', icon: '🏛️', description: 'Tasse e imposte', isActive: true },
  { id: 14, name: 'Stipendi', type: 'EXPENSE', color: '#059669', icon: '👥', description: 'Stipendi e compensi', isActive: true },
  { id: 15, name: 'Consulenze', type: 'EXPENSE', color: '#7c3aed', icon: '🤝', description: 'Spese per consulenze esterne', isActive: true },
  { id: 16, name: 'Viaggi', type: 'EXPENSE', color: '#0ea5e9', icon: '✈️', description: 'Spese di viaggio e trasferte', isActive: true },
  { id: 17, name: 'Formazione', type: 'EXPENSE', color: '#84cc16', icon: '📚', description: 'Corsi e formazione professionale', isActive: true },
  { id: 18, name: 'Varie', type: 'EXPENSE', color: '#737373', icon: '📌', description: 'Spese varie e generiche', isActive: true },
  { id: 25, name: 'Affitto', type: 'EXPENSE', color: '#ef4444', icon: '🏢', description: 'Spese per affitto ufficio', isActive: true },
];

async function updateCategories() {
  try {
    console.log('Updating categories...\n');

    // Get all existing categories
    const existingCategories = await prisma.transactionCategory.findMany();
    console.log(`Found ${existingCategories.length} existing categories`);

    // Update or create each category
    let updated = 0;
    let created = 0;

    for (const cat of categories) {
      const existing = existingCategories.find(c => c.name === cat.name && c.type === cat.type);

      if (existing) {
        // Update existing
        await prisma.transactionCategory.update({
          where: { id: existing.id },
          data: {
            color: cat.color,
            icon: cat.icon,
            isActive: cat.isActive,
          },
        });
        updated++;
        console.log(`✓ Updated: ${cat.name} (${cat.type})`);
      } else {
        // Create new
        await prisma.transactionCategory.create({
          data: {
            name: cat.name,
            type: cat.type as 'INCOME' | 'EXPENSE',
            color: cat.color,
            icon: cat.icon,
            isActive: cat.isActive,
          },
        });
        created++;
        console.log(`+ Created: ${cat.name} (${cat.type})`);
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Updated: ${updated}`);
    console.log(`Created: ${created}`);
    console.log(`Total categories: ${categories.length}`);

    // List all active categories
    const allCategories = await prisma.transactionCategory.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    console.log(`\n=== Active Categories ===`);
    const incomeCategories = allCategories.filter(c => c.type === 'INCOME');
    const expenseCategories = allCategories.filter(c => c.type === 'EXPENSE');

    console.log(`\nINCOME (${incomeCategories.length}):`);
    incomeCategories.forEach(c => console.log(`  ${c.icon} ${c.name} - ${c.color}`));

    console.log(`\nEXPENSE (${expenseCategories.length}):`);
    expenseCategories.forEach(c => console.log(`  ${c.icon} ${c.name} - ${c.color}`));

  } catch (error) {
    console.error('Error updating categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCategories();

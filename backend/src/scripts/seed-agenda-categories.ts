import prisma from '../config/database';

const categories = [
  { name: 'Meeting', color: '#fe4303' },
  { name: 'Formazione', color: '#8b5cf6' },
  { name: 'Marketing', color: '#f59e0b' },
  { name: 'Appuntamenti clienti', color: '#ffdb59' },
  { name: 'Call/Chiamate', color: '#b40450' },
  { name: 'Viaggi/Vacanze', color: '#1b8eff' },
  { name: 'Altro', color: '#6b7280' },
  { name: 'Interno', color: '#3b82f6' },
  { name: 'Sviluppo', color: '#3bf7b8' },
];

async function seedAgendaCategories() {
  console.log('🌱 Seeding agenda categories...');

  try {
    // Delete existing categories
    await prisma.eventCategory.deleteMany({});
    console.log('✅ Deleted existing categories');

    // Create new categories
    for (const category of categories) {
      await prisma.eventCategory.create({
        data: {
          name: category.name,
          color: category.color,
          isActive: true,
        },
      });
      console.log(`✅ Created category: ${category.name}`);
    }

    console.log('🎉 Agenda categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding agenda categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAgendaCategories();

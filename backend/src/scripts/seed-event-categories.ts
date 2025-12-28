import prisma from '../config/database';

const defaultCategories = [
  { name: 'Riunione', color: '#3b82f6', icon: 'Users' },
  { name: 'Appuntamento Cliente', color: '#10b981', icon: 'Briefcase' },
  { name: 'Chiamata', color: '#f59e0b', icon: 'Phone' },
  { name: 'Deadline', color: '#ef4444', icon: 'AlertCircle' },
  { name: 'Evento Aziendale', color: '#8b5cf6', icon: 'Building' },
  { name: 'Formazione', color: '#06b6d4', icon: 'GraduationCap' },
  { name: 'Personale', color: '#ec4899', icon: 'User' },
  { name: 'Altro', color: '#6b7280', icon: 'Calendar' },
];

async function seedEventCategories() {
  try {
    console.log('🌱 Seeding event categories...\n');

    let created = 0;
    let skipped = 0;

    for (const category of defaultCategories) {
      // Check if category already exists
      const existing = await prisma.eventCategory.findUnique({
        where: { name: category.name },
      });

      if (existing) {
        console.log(`⏭️  Skipped "${category.name}" (already exists)`);
        skipped++;
        continue;
      }

      // Create category
      await prisma.eventCategory.create({
        data: category,
      });

      console.log(`✅ Created category "${category.name}"`);
      created++;
    }

    console.log('\n📊 Seed Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📝 Total: ${defaultCategories.length}\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedEventCategories();

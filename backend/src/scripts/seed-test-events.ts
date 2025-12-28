import prisma from '../config/database';

async function seedTestEvents() {
  try {
    console.log('🌱 Seeding test events...\n');

    // Get categories
    const categories = await prisma.eventCategory.findMany();
    const riunioneCategory = categories.find(c => c.name === 'Riunione');
    const appuntamentoCategory = categories.find(c => c.name === 'Appuntamento Cliente');
    const chiamataCategory = categories.find(c => c.name === 'Chiamata');
    const deadlineCategory = categories.find(c => c.name === 'Deadline');

    // Get some contacts (if any exist)
    const contacts = await prisma.contact.findMany({ take: 5 });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const testEvents = [
      // Today's events
      {
        title: 'Riunione Team Mattutina',
        description: 'Daily standup meeting con il team di sviluppo',
        startDateTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9:00
        endDateTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00
        categoryId: riunioneCategory?.id,
        location: 'Sala Conferenze A',
        color: riunioneCategory?.color,
        status: 'confirmed',
        createdBy: 1,
      },
      {
        title: 'Chiamata con Cliente ABC',
        description: 'Discussione requisiti nuovo progetto',
        startDateTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11:00
        endDateTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12:00
        categoryId: chiamataCategory?.id,
        contactId: contacts[0]?.id,
        color: chiamataCategory?.color,
        status: 'confirmed',
        createdBy: 1,
      },
      {
        title: 'Pranzo con Partner',
        description: 'Discussione collaborazione',
        startDateTime: new Date(today.getTime() + 13 * 60 * 60 * 1000), // 13:00
        endDateTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 14:00
        categoryId: appuntamentoCategory?.id,
        contactId: contacts[1]?.id,
        location: 'Ristorante Il Gabbiano',
        color: appuntamentoCategory?.color,
        status: 'scheduled',
        createdBy: 1,
      },
      // Tomorrow
      {
        title: 'Presentazione Progetto',
        description: 'Presentazione finale al cliente',
        startDateTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // Tomorrow 10:00
        endDateTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // Tomorrow 12:00
        categoryId: appuntamentoCategory?.id,
        contactId: contacts[2]?.id,
        location: 'Online - Zoom',
        color: appuntamentoCategory?.color,
        status: 'scheduled',
        createdBy: 1,
      },
      // Next week
      {
        title: 'Deadline Consegna Progetto X',
        description: 'Consegna finale del progetto X al cliente',
        startDateTime: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000), // Next week 17:00
        endDateTime: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000), // Next week 18:00
        categoryId: deadlineCategory?.id,
        color: deadlineCategory?.color,
        status: 'scheduled',
        createdBy: 1,
      },
      {
        title: 'Review Codice',
        description: 'Code review settimanale',
        startDateTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // +3 days 14:00
        endDateTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // +3 days 16:00
        categoryId: riunioneCategory?.id,
        color: riunioneCategory?.color,
        status: 'scheduled',
        createdBy: 1,
      },
      // Past event
      {
        title: 'Riunione Retrospettiva',
        description: 'Retrospettiva sprint concluso',
        startDateTime: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 2 days ago 15:00
        endDateTime: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // 2 days ago 16:00
        categoryId: riunioneCategory?.id,
        color: riunioneCategory?.color,
        status: 'completed',
        createdBy: 1,
      },
    ];

    let created = 0;

    for (const eventData of testEvents) {
      await prisma.event.create({
        data: eventData,
      });
      console.log(`✅ Created event "${eventData.title}"`);
      created++;
    }

    console.log('\n📊 Seed Summary:');
    console.log(`   ✅ Created: ${created} events`);
    console.log(`   📝 Total: ${testEvents.length}\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding events:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedTestEvents();

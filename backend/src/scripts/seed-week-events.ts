import prisma from '../config/database';
import { addDays, setHours, setMinutes, startOfWeek } from 'date-fns';

async function seedWeekEvents() {
  console.log('🌱 Seeding week events...');

  try {
    // Get categories
    const categories = await prisma.eventCategory.findMany();
    if (categories.length === 0) {
      console.log('❌ No categories found. Please run seed-agenda-categories first.');
      return;
    }

    // Get first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No user found.');
      return;
    }

    // Get contacts
    const contacts = await prisma.contact.findMany({ take: 5 });

    // Start from Monday of current week
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });

    const events = [
      // Lunedì
      {
        title: 'Riunione Team Morning',
        day: 0,
        hour: 9,
        duration: 60,
        categoryName: 'Meeting',
        location: 'Sala Conferenze',
      },
      {
        title: 'Chiamata Cliente - Progetto Web',
        day: 0,
        hour: 11,
        duration: 30,
        categoryName: 'Call/Chiamate',
        location: 'Online',
      },
      {
        title: 'Appuntamento Nuovo Cliente',
        day: 0,
        hour: 14,
        duration: 90,
        categoryName: 'Appuntamenti clienti',
        location: 'Studio',
      },
      {
        title: 'Revisione Codice',
        day: 0,
        hour: 16,
        duration: 60,
        categoryName: 'Sviluppo',
        location: 'Ufficio',
      },

      // Martedì
      {
        title: 'Corso Formazione React',
        day: 1,
        hour: 9,
        duration: 120,
        categoryName: 'Formazione',
        location: 'Online',
      },
      {
        title: 'Meeting Marketing Strategia',
        day: 1,
        hour: 13,
        duration: 60,
        categoryName: 'Marketing',
        location: 'Sala Riunioni',
      },
      {
        title: 'Call con Fornitore',
        day: 1,
        hour: 15,
        duration: 30,
        categoryName: 'Call/Chiamate',
        location: 'Online',
      },
      {
        title: 'Sviluppo Feature Dashboard',
        day: 1,
        hour: 16,
        duration: 120,
        categoryName: 'Sviluppo',
        location: 'Ufficio',
      },

      // Mercoledì
      {
        title: 'Daily Standup',
        day: 2,
        hour: 9,
        duration: 15,
        categoryName: 'Interno',
        location: 'Ufficio',
      },
      {
        title: 'Demo Progetto Cliente',
        day: 2,
        hour: 10,
        duration: 60,
        categoryName: 'Appuntamenti clienti',
        location: 'Online',
      },
      {
        title: 'Pranzo di Lavoro',
        day: 2,
        hour: 13,
        duration: 90,
        categoryName: 'Appuntamenti clienti',
        location: 'Ristorante Centro',
      },
      {
        title: 'Code Review Team',
        day: 2,
        hour: 15,
        duration: 60,
        categoryName: 'Sviluppo',
        location: 'Online',
      },
      {
        title: 'Planning Sprint',
        day: 2,
        hour: 17,
        duration: 60,
        categoryName: 'Meeting',
        location: 'Sala Riunioni',
      },

      // Giovedì
      {
        title: 'Riunione Progetto E-commerce',
        day: 3,
        hour: 9,
        duration: 90,
        categoryName: 'Meeting',
        location: 'Sala Conferenze',
      },
      {
        title: 'Chiamata Supporto Cliente',
        day: 3,
        hour: 11,
        duration: 30,
        categoryName: 'Call/Chiamate',
        location: 'Online',
      },
      {
        title: 'Workshop UX Design',
        day: 3,
        hour: 14,
        duration: 120,
        categoryName: 'Formazione',
        location: 'Aula Formazione',
      },
      {
        title: 'Testing Applicazione',
        day: 3,
        hour: 16,
        duration: 60,
        categoryName: 'Sviluppo',
        location: 'Ufficio',
      },

      // Venerdì
      {
        title: 'Briefing Settimanale',
        day: 4,
        hour: 9,
        duration: 30,
        categoryName: 'Interno',
        location: 'Sala Riunioni',
      },
      {
        title: 'Presentazione Proposta Commerciale',
        day: 4,
        hour: 10,
        duration: 90,
        categoryName: 'Appuntamenti clienti',
        location: 'Studio Cliente',
      },
      {
        title: 'Call Team Remoto',
        day: 4,
        hour: 14,
        duration: 45,
        categoryName: 'Call/Chiamate',
        location: 'Online',
      },
      {
        title: 'Deploy Produzione',
        day: 4,
        hour: 16,
        duration: 60,
        categoryName: 'Sviluppo',
        location: 'Ufficio',
      },
      {
        title: 'Retrospettiva Sprint',
        day: 4,
        hour: 17,
        duration: 60,
        categoryName: 'Meeting',
        location: 'Sala Riunioni',
      },

      // Sabato
      {
        title: 'Manutenzione Server',
        day: 5,
        hour: 10,
        duration: 120,
        categoryName: 'Sviluppo',
        location: 'Remoto',
      },

      // Domenica
      {
        title: 'Planning Prossima Settimana',
        day: 6,
        hour: 19,
        duration: 30,
        categoryName: 'Interno',
        location: 'Casa',
      },
    ];

    // Delete existing test events
    await prisma.event.deleteMany({
      where: {
        OR: events.map(e => ({ title: e.title })),
      },
    });
    console.log('✅ Deleted existing test events');

    // Create events
    for (const eventData of events) {
      const category = categories.find(c => c.name === eventData.categoryName);
      const eventDate = addDays(monday, eventData.day);
      const startDateTime = setMinutes(setHours(eventDate, eventData.hour), 0);
      const endDateTime = new Date(startDateTime.getTime() + eventData.duration * 60000);

      await prisma.event.create({
        data: {
          title: eventData.title,
          startDateTime,
          endDateTime,
          location: eventData.location,
          categoryId: category?.id,
          color: category?.color || '#3b82f6',
          status: 'scheduled',
          createdBy: user.id,
          assignedTo: user.id,
          contactId: contacts[Math.floor(Math.random() * contacts.length)]?.id,
        },
      });
      console.log(`✅ Created event: ${eventData.title}`);
    }

    console.log('🎉 Week events seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding week events:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedWeekEvents();

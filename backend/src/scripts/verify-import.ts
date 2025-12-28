import prisma from '../config/database';

async function verify() {
  try {
    const counts = {
      total: await prisma.contact.count(),
      clients: await prisma.contact.count({ where: { type: 'CLIENT' }}),
      leads: await prisma.contact.count({ where: { type: 'LEAD' }}),
      prospects: await prisma.contact.count({ where: { type: 'PROSPECT' }}),
      persons: await prisma.contact.count({ where: { type: 'PERSON' }}),
      companies: await prisma.contact.count({ where: { type: 'COMPANY' }}),
      tags: await prisma.contactTag.count(),
      socials: await prisma.contactSocial.count(),
    };

    console.log('\n📊 Import Statistics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total contacts: ${counts.total}`);
    console.log(`  - CLIENTS: ${counts.clients}`);
    console.log(`  - LEADS: ${counts.leads}`);
    console.log(`  - PROSPECTS: ${counts.prospects}`);
    console.log(`  - PERSONS: ${counts.persons}`);
    console.log(`  - COMPANIES: ${counts.companies}`);
    console.log(`\nTotal tags: ${counts.tags}`);
    console.log(`Total social profiles: ${counts.socials}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Show sample contacts with tags and socials
    console.log('📋 Sample contacts with tags:');
    const contactsWithTags = await prisma.contact.findMany({
      where: {
        tags: {
          some: {},
        },
      },
      include: {
        tags: true,
        socials: true,
      },
      take: 3,
    });

    for (const contact of contactsWithTags) {
      console.log(`\n  • ${contact.name} (${contact.type})`);
      console.log(`    Tags: ${contact.tags.map(t => t.tag).join(', ')}`);
      console.log(`    Socials: ${contact.socials.map(s => s.platform).join(', ')}`);
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verify();

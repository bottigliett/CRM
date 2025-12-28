import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function completeTecnoreteData() {
  try {
    console.log('Updating Tecnorete Villafranca with complete data...\n');

    const contact = await prisma.contact.findUnique({
      where: { id: 200 },
      include: { tags: true, socials: true }
    });

    if (!contact) {
      console.error('❌ Contact with ID 200 not found');
      return;
    }

    console.log('Current data:');
    console.log(`  Name: ${contact.name}`);
    console.log(`  Email: ${contact.email || 'N/A'}`);
    console.log(`  Phone: ${contact.phone || 'N/A'}`);
    console.log(`  P.IVA: ${contact.partitaIva || 'N/A'}`);
    console.log(`  Address: ${contact.address || 'N/A'}`);

    // Update contact with complete data
    const updated = await prisma.contact.update({
      where: { id: 200 },
      data: {
        name: 'Immobiliare Villafranca SRL (Alexandru Adam)',
        email: 'vr2oe@tecnorete.it',
        phone: '+39 329 476 5308',
        partitaIva: '04558700235',
        address: 'Via Pace 45',
        city: 'Villafranca di Verona',
        province: 'VR',
        zipCode: '37069',
        country: 'IT',
        type: 'CLIENT',
        priority: 2,
      }
    });

    console.log('\n✓ Contact updated!');
    console.log(`  Name: ${updated.name}`);
    console.log(`  Email: ${updated.email}`);
    console.log(`  Phone: ${updated.phone}`);
    console.log(`  P.IVA: ${updated.partitaIva}`);
    console.log(`  Address: ${updated.address}, ${updated.zipCode} ${updated.city} (${updated.province})`);

    // Add tags if they don't exist
    console.log('\n=== Adding tags ===');
    const tagsToAdd = [
      { tag: '#immobiliare', color: '#ef4444' },
      { tag: '#primo cliente', color: '#8b5cf6' },
      { tag: '#social', color: '#8b5cf6' }
    ];

    for (const tagData of tagsToAdd) {
      const existingTag = await prisma.contactTag.findFirst({
        where: {
          contactId: 200,
          tag: tagData.tag
        }
      });

      if (!existingTag) {
        await prisma.contactTag.create({
          data: {
            contactId: 200,
            tag: tagData.tag,
            color: tagData.color
          }
        });
        console.log(`  ✓ Added tag: ${tagData.tag}`);
      } else {
        console.log(`  - Tag already exists: ${tagData.tag}`);
      }
    }

    // Add social if it doesn't exist
    console.log('\n=== Adding socials ===');
    const existingSocial = await prisma.contactSocial.findFirst({
      where: {
        contactId: 200,
        platform: 'instagram'
      }
    });

    if (!existingSocial) {
      await prisma.contactSocial.create({
        data: {
          contactId: 200,
          platform: 'instagram',
          url: 'https://www.instagram.com/tecnoretevillafrancadiverona/',
          username: '@tecnoretevillafrancadiverona'
        }
      });
      console.log('  ✓ Added Instagram profile');
    } else {
      console.log('  - Instagram profile already exists');
    }

    console.log('\n✅ Tecnorete Villafranca data completed successfully!');

  } catch (error) {
    console.error('Error updating contact:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeTecnoreteData();

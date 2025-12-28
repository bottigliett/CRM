import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function completeClientsTagsAndSocials() {
  try {
    console.log('=== COMPLETING CLIENTS TAGS AND SOCIALS ===\n');

    // ========== INDUSTRIALE CREMONA SRL ==========
    console.log('Processing Industriale Cremona SRL (ID 94)...\n');

    // Add tags
    const industrialeTags = [
      { tag: '#cremona', color: '#22c55e' },
      { tag: '#tecnocasa', color: '#22c55e' }
    ];

    for (const tagData of industrialeTags) {
      const existing = await prisma.contactTag.findFirst({
        where: { contactId: 94, tag: tagData.tag }
      });

      if (!existing) {
        await prisma.contactTag.create({
          data: {
            contactId: 94,
            tag: tagData.tag,
            color: tagData.color
          }
        });
        console.log(`  ✓ Added tag: ${tagData.tag}`);
      } else {
        console.log(`  - Tag exists: ${tagData.tag}`);
      }
    }

    // Add Instagram social
    const existingIndustrialeInstagram = await prisma.contactSocial.findFirst({
      where: { contactId: 94, platform: 'instagram' }
    });

    if (!existingIndustrialeInstagram) {
      await prisma.contactSocial.create({
        data: {
          contactId: 94,
          platform: 'instagram',
          url: 'https://www.instagram.com/tecnocasaimpresacremona',
          username: '@tecnocasaimpresacremona'
        }
      });
      console.log('  ✓ Added Instagram profile\n');
    } else {
      console.log('  - Instagram already exists\n');
    }

    // ========== PAGHESOLUTION ==========
    console.log('Processing PagheSolution (ID 56)...\n');

    // Add tags
    const pagheTags = [
      { tag: '#brand', color: '#8b5cf6' },
      { tag: '#consulenza', color: '#f59e0b' },
      { tag: '#finanza', color: '#06b6d4' },
      { tag: '#logo', color: '#f59e0b' },
      { tag: '#sito', color: '#06b6d4' }
    ];

    for (const tagData of pagheTags) {
      const existing = await prisma.contactTag.findFirst({
        where: { contactId: 56, tag: tagData.tag }
      });

      if (!existing) {
        await prisma.contactTag.create({
          data: {
            contactId: 56,
            tag: tagData.tag,
            color: tagData.color
          }
        });
        console.log(`  ✓ Added tag: ${tagData.tag}`);
      } else {
        console.log(`  - Tag exists: ${tagData.tag}`);
      }
    }

    // Add LinkedIn
    const existingLinkedIn = await prisma.contactSocial.findFirst({
      where: { contactId: 56, platform: 'linkedin' }
    });

    if (!existingLinkedIn) {
      await prisma.contactSocial.create({
        data: {
          contactId: 56,
          platform: 'linkedin',
          url: 'https://www.linkedin.com/company/paghesolution/',
          username: 'paghesolution'
        }
      });
      console.log('  ✓ Added LinkedIn profile');
    } else {
      console.log('  - LinkedIn already exists');
    }

    // Add Website
    const existingWebsite = await prisma.contactSocial.findFirst({
      where: { contactId: 56, platform: 'website' }
    });

    if (!existingWebsite) {
      await prisma.contactSocial.create({
        data: {
          contactId: 56,
          platform: 'website',
          url: 'https://paghesolution.it/',
          username: 'paghesolution.it'
        }
      });
      console.log('  ✓ Added Website\n');
    } else {
      console.log('  - Website already exists\n');
    }

    console.log('✅ All clients completed successfully!');

  } catch (error) {
    console.error('Error completing clients:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeClientsTagsAndSocials();

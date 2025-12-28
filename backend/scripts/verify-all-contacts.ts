import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function verifyAllContacts() {
  try {
    console.log('=== CONTACT DATABASE VERIFICATION ===\n');

    // Get all contacts
    const allContacts = await prisma.contact.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`Total contacts in database: ${allContacts.length}\n`);

    // Search for Tecnorete
    console.log('=== SEARCHING FOR TECNORETE ===');
    const tecnorete = allContacts.filter(c =>
      c.name.toLowerCase().includes('tecnorete') ||
      c.name.toLowerCase().includes('villafranca')
    );

    if (tecnorete.length > 0) {
      console.log(`Found ${tecnorete.length} contact(s) matching Tecnorete/Villafranca:\n`);
      tecnorete.forEach(c => {
        console.log(`ID: ${c.id}`);
        console.log(`Name: ${c.name}`);
        console.log(`Email: ${c.email || 'N/A'}`);
        console.log(`Phone: ${c.phone || 'N/A'}`);
        console.log(`Type: ${c.type}`);
        console.log(`VAT: ${c.vatNumber || 'N/A'}`);
        console.log(`Address: ${c.address || 'N/A'}`);
        console.log('---');
      });
    } else {
      console.log('❌ NO contacts found matching Tecnorete or Villafranca\n');
    }

    // Search for Immobiliare
    console.log('\n=== SEARCHING FOR IMMOBILIARE ===');
    const immobiliare = allContacts.filter(c =>
      c.name.toLowerCase().includes('immobiliare')
    );

    if (immobiliare.length > 0) {
      console.log(`Found ${immobiliare.length} contact(s) with "Immobiliare":\n`);
      immobiliare.forEach(c => {
        console.log(`ID: ${c.id}`);
        console.log(`Name: ${c.name}`);
        console.log(`Email: ${c.email || 'N/A'}`);
        console.log(`Type: ${c.type}`);
        console.log(`VAT: ${c.vatNumber || 'N/A'}`);
        console.log('---');
      });
    }

    // Group by type
    console.log('\n=== CONTACTS BY TYPE ===');
    const byType = await prisma.contact.groupBy({
      by: ['type'],
      _count: true
    });

    byType.forEach(g => console.log(`${g.type}: ${g._count}`));

    // Show all contact names for reference
    console.log('\n=== ALL CONTACT NAMES (alphabetical) ===');
    allContacts.forEach((c, idx) => {
      console.log(`${idx + 1}. ${c.name} (${c.type}) - ID: ${c.id}`);
    });

  } catch (error) {
    console.error('Error verifying contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllContacts();

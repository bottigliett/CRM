import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function checkSpecificClients() {
  try {
    // Check Industriale Cremona SRL
    const industriale = await prisma.contact.findUnique({
      where: { id: 94 },
      include: { tags: true, socials: true }
    });

    console.log('=== INDUSTRIALE CREMONA SRL (ID 94) ===');
    if (!industriale) {
      console.log('❌ NOT FOUND\n');
    } else {
      console.log('Name:', industriale.name);
      console.log('Email:', industriale.email || 'N/A');
      console.log('Phone:', industriale.phone || 'N/A');
      console.log('P.IVA:', industriale.partitaIva || 'N/A');
      console.log('Address:', industriale.address || 'N/A');
      console.log('City:', industriale.city || 'N/A');
      console.log('Type:', industriale.type);
      console.log('Tags:', industriale.tags.length, '/', '2 expected');
      industriale.tags.forEach(t => console.log(`  - ${t.tag} (${t.color})`));
      console.log('Socials:', industriale.socials.length, '/', '1 expected');
      industriale.socials.forEach(s => console.log(`  - ${s.platform}: ${s.url}`));
      console.log('');

      // Check what's missing
      const missing = [];
      if (!industriale.email || industriale.email !== 'nicolagervasi04@gmail.com') missing.push('email');
      if (!industriale.phone || industriale.phone !== '3347039702') missing.push('phone');
      if (!industriale.partitaIva || industriale.partitaIva !== 'IT01765290190') missing.push('P.IVA');
      if (!industriale.address || !industriale.address.includes('CORSO VITTORIO EMANUELE')) missing.push('address');
      if (industriale.tags.length < 2) missing.push('tags (2 expected)');
      if (industriale.socials.length < 1) missing.push('socials (Instagram expected)');

      if (missing.length > 0) {
        console.log('⚠️  Missing/incorrect:', missing.join(', '));
      } else {
        console.log('✅ Complete!');
      }
    }

    console.log('\n=== PAGHESOLUTION (ID 56) ===');
    const paghe = await prisma.contact.findUnique({
      where: { id: 56 },
      include: { tags: true, socials: true }
    });

    if (!paghe) {
      console.log('❌ NOT FOUND\n');
    } else {
      console.log('Name:', paghe.name);
      console.log('Email:', paghe.email || 'N/A');
      console.log('Phone:', paghe.phone || 'N/A');
      console.log('P.IVA:', paghe.partitaIva || 'N/A');
      console.log('Address:', paghe.address || 'N/A');
      console.log('City:', paghe.city || 'N/A');
      console.log('Type:', paghe.type);
      console.log('Tags:', paghe.tags.length, '/', '5 expected');
      paghe.tags.forEach(t => console.log(`  - ${t.tag} (${t.color})`));
      console.log('Socials:', paghe.socials.length, '/', '2 expected');
      paghe.socials.forEach(s => console.log(`  - ${s.platform}: ${s.url}`));
      console.log('');

      // Check what's missing
      const missing = [];
      if (!paghe.email || paghe.email !== 'info@paghesolution.it') missing.push('email');
      if (!paghe.phone || paghe.phone !== '3938658960') missing.push('phone');
      if (!paghe.partitaIva || paghe.partitaIva !== 'IT04685780233') missing.push('P.IVA');
      if (!paghe.address || !paghe.address.includes('CARMAGNOLA')) missing.push('address');
      if (paghe.tags.length < 5) missing.push('tags (5 expected)');
      if (paghe.socials.length < 2) missing.push('socials (2 expected: LinkedIn + Website)');

      if (missing.length > 0) {
        console.log('⚠️  Missing/incorrect:', missing.join(', '));
      } else {
        console.log('✅ Complete!');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificClients();

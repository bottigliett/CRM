import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contacts = await prisma.contact.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      partitaIva: true,
      codiceFiscale: true,
    },
    orderBy: { name: 'asc' }
  });

  console.log('=== CONTATTI IN ANAGRAFICA ===\n');
  contacts.forEach((contact) => {
    console.log(`ID: ${contact.id}`);
    console.log(`Nome: ${contact.name}`);
    console.log(`Tipo: ${contact.type}`);
    if (contact.partitaIva) console.log(`P.IVA: ${contact.partitaIva}`);
    if (contact.codiceFiscale) console.log(`CF: ${contact.codiceFiscale}`);
    console.log('---');
  });

  console.log(`\nTotale contatti: ${contacts.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

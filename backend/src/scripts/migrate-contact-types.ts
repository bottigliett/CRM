import prisma from '../config/database';

async function migrateContactTypes() {
  try {
    console.log('🔄 Migrating contact types from old schema to new schema...\n');

    // Get all contacts (using raw query to get old enum values)
    const contacts: any[] = await prisma.$queryRaw`SELECT * FROM contacts`;

    console.log(`Found ${contacts.length} contacts to migrate\n`);

    let migrated = 0;

    for (const contact of contacts) {
      // Determine the new type and contactType based on old type
      let newType: 'LEAD' | 'PROSPECT' | 'CLIENT' = 'LEAD';
      let newContactType: 'PERSON' | 'COMPANY' | null = null;

      const oldType = contact.type as string;

      switch (oldType) {
        case 'LEAD':
          newType = 'LEAD';
          newContactType = null; // Will be determined by other criteria
          break;
        case 'PROSPECT':
          newType = 'PROSPECT';
          newContactType = null;
          break;
        case 'CLIENT':
          newType = 'CLIENT';
          newContactType = null;
          break;
        case 'COMPANY':
          // COMPANY was being used as entity type, default to CLIENT status
          newType = 'CLIENT';
          newContactType = 'COMPANY';
          break;
        case 'PERSON':
          // PERSON was being used as entity type, default to CLIENT status
          newType = 'CLIENT';
          newContactType = 'PERSON';
          break;
        default:
          console.log(`⚠️  Unknown type for ${contact.name}: ${oldType}`);
          continue;
      }

      // If contactType is still null, infer from partita_iva
      if (!newContactType) {
        newContactType = contact.partita_iva ? 'COMPANY' : 'PERSON';
      }

      // Update the contact using raw query to bypass enum validation
      await prisma.$executeRaw`
        UPDATE contacts
        SET type = ${newType}, contact_type = ${newContactType}
        WHERE id = ${contact.id}
      `;

      console.log(`✅ ${contact.name}: type=${newType}, contactType=${newContactType}`);
      migrated++;
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Total contacts: ${contacts.length}`);
    console.log(`   Migrated: ${migrated}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

migrateContactTypes();

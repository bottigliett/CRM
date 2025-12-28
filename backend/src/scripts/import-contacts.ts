import * as fs from 'fs';
import * as path from 'path';
import prisma from '../config/database';

interface ContactData {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  partita_iva: string | null;
  codice_fiscale: string | null;
  address: string | null;
  description: string | null;
  contact_type: 'person' | 'company';
  status: 'lead' | 'prospect' | 'client' | 'inactive' | 'collaborazioni' | 'contatto_utile';
  priority: 'low' | 'medium' | 'high';
  tags: string | null;
  social_profiles: string | null;
}

function mapStatusToType(status: string): 'LEAD' | 'PROSPECT' | 'CLIENT' {
  // Map the old status to new ContactType
  switch (status) {
    case 'lead':
      return 'LEAD';
    case 'prospect':
    case 'inactive':
    case 'collaborazioni':
    case 'contatto_utile':
      return 'PROSPECT';
    case 'client':
      return 'CLIENT';
    default:
      return 'PROSPECT';
  }
}

function mapContactTypeToEntityType(contactType: string): 'PERSON' | 'COMPANY' | undefined {
  if (contactType === 'person') return 'PERSON';
  if (contactType === 'company') return 'COMPANY';
  return undefined;
}

function parseInsertStatements(sql: string): ContactData[] {
  const contacts: ContactData[] = [];

  // Match the INSERT statement with column names
  const insertPattern = /INSERT INTO `leads_contacts`\s*\(([^)]+)\)\s*VALUES/i;
  const match = insertPattern.exec(sql);

  if (!match) {
    console.error('No INSERT statement found in SQL file');
    return contacts;
  }

  const columns = match[1].split(',').map(c => c.trim().replace(/`/g, ''));

  // Extract everything after VALUES until the semicolon
  const valuesStartIndex = match.index + match[0].length;
  const afterValues = sql.substring(valuesStartIndex);
  const valuesEndMatch = afterValues.match(/\);[\s]*[\n\r]+[\s]*(-|ALTER|\/\*)/);

  if (!valuesEndMatch) {
    console.error('Could not find end of VALUES section');
    return contacts;
  }

  const valuesSection = afterValues.substring(0, valuesEndMatch.index! + 2);

  // Parse each row
  const rows: string[] = [];
  let currentRow = '';
  let insideQuotes = false;
  let parenDepth = 0;

  for (let i = 0; i < valuesSection.length; i++) {
    const char = valuesSection[i];
    const prevChar = i > 0 ? valuesSection[i - 1] : '';

    if (char === "'" && prevChar !== '\\') {
      insideQuotes = !insideQuotes;
    }

    if (!insideQuotes) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;

      if (parenDepth === 0 && char === ')') {
        currentRow += char;
        rows.push(currentRow.trim());
        currentRow = '';
        continue;
      }
    }

    if (parenDepth > 0 || insideQuotes) {
      currentRow += char;
    }
  }

  // Parse each row
  for (const row of rows) {
    if (!row.startsWith('(')) continue;

    const rowContent = row.slice(1, -1);
    const values: (string | null)[] = [];
    let currentValue = '';
    insideQuotes = false;

    for (let i = 0; i < rowContent.length; i++) {
      const char = rowContent[i];
      const prevChar = i > 0 ? rowContent[i - 1] : '';

      if (char === "'" && prevChar !== '\\') {
        insideQuotes = !insideQuotes;
        currentValue += char;
        continue;
      }

      if (!insideQuotes && char === ',') {
        let val = currentValue.trim();
        if (val === 'NULL') {
          values.push(null);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          values.push(val.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
        } else {
          values.push(val);
        }
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    // Push last value
    if (currentValue) {
      let val = currentValue.trim();
      if (val === 'NULL') {
        values.push(null);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        values.push(val.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
      } else {
        values.push(val);
      }
    }

    // Map to contactData
    const contactData: any = {};
    columns.forEach((col, idx) => {
      contactData[col] = values[idx];
    });

    try {
      contacts.push({
        id: parseInt(contactData.id || '0'),
        name: contactData.name || '',
        email: contactData.email,
        phone: contactData.phone,
        partita_iva: contactData.partita_iva,
        codice_fiscale: contactData.codice_fiscale,
        address: contactData.address,
        description: contactData.description,
        contact_type: contactData.contact_type as any,
        status: contactData.status as any,
        priority: contactData.priority as any,
        tags: contactData.tags,
        social_profiles: contactData.social_profiles,
      });
    } catch (error) {
      console.error('Error parsing contact:', contactData, error);
    }
  }

  return contacts;
}

async function importContacts() {
  try {
    console.log('📂 Reading leads_contacts.sql file...\n');

    const sqlPath = path.join(__dirname, '../../../leads_contacts.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 Parsing SQL INSERT statements...\n');
    const contacts = parseInsertStatements(sqlContent);
    console.log(`Found ${contacts.length} contacts in SQL file\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        // Map status to ContactType
        const type = mapStatusToType(contact.status);
        const entityType = mapContactTypeToEntityType(contact.contact_type);

        // Parse tags JSON
        let tagsData: any[] = [];
        if (contact.tags) {
          try {
            tagsData = JSON.parse(contact.tags);
          } catch (e) {
            console.log(`⚠️  Could not parse tags for "${contact.name}"`);
          }
        }

        // Parse social profiles JSON
        let socialsData: any[] = [];
        if (contact.social_profiles) {
          try {
            socialsData = JSON.parse(contact.social_profiles);
          } catch (e) {
            console.log(`⚠️  Could not parse social profiles for "${contact.name}"`);
          }
        }

        // Create the contact
        await prisma.contact.create({
          data: {
            name: contact.name,
            type: type,
            contactType: entityType,
            email: contact.email || undefined,
            phone: contact.phone || undefined,
            partitaIva: contact.partita_iva || undefined,
            codiceFiscale: contact.codice_fiscale || undefined,
            address: contact.address || undefined,
            notes: contact.description || undefined,
            tags: {
              create: tagsData.map((tag: any) => ({
                tag: tag.tag_name || tag.tag || 'Senza tag',
                color: tag.tag_color || tag.color || '#3b82f6',
              })),
            },
            socials: {
              create: socialsData.map((social: any) => ({
                platform: social.platform || 'website',
                url: social.profile_url || social.url || '',
                username: social.username || undefined,
              })),
            },
          },
        });

        console.log(`✅ Imported contact "${contact.name}" as ${type} (${entityType || 'N/A'})`);
        imported++;

      } catch (error: any) {
        console.error(`❌ Error importing contact "${contact.name}":`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total: ${contacts.length}\n`);

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

importContacts();

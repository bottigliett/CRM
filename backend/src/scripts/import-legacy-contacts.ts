import prisma from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

interface LegacyContact {
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
  created_by: number;
  assigned_to: number | null;
  last_contact_date: string | null;
  next_followup_date: string | null;
  created_at: string;
  updated_at: string;
  tags: string | null;
  social_profiles: string | null;
}

interface Tag {
  tag_name: string;
  tag_color: string;
}

interface SocialProfile {
  platform: string;
  profile_url: string;
  username: string;
}

// Parse address to extract city and province
function parseAddress(address: string | null): { address: string | null; city: string | null; province: string | null; zipCode: string | null } {
  if (!address) {
    return { address: null, city: null, province: null, zipCode: null };
  }

  // Try to extract city and province from patterns like "Via X - 37069 Villafranca VR"
  const matches = address.match(/(\d{5})\s+([A-Za-z\s]+)\s+([A-Z]{2})/);

  if (matches) {
    const zipCode = matches[1];
    const city = matches[2].trim();
    const province = matches[3];

    return {
      address,
      city,
      province,
      zipCode,
    };
  }

  // If no pattern match, just return the full address
  return {
    address,
    city: null,
    province: null,
    zipCode: null,
  };
}

// Map old status to new type field (commercial status)
function mapContactType(status: string): 'LEAD' | 'PROSPECT' | 'CLIENT' {
  if (status === 'lead') return 'LEAD';
  if (status === 'prospect') return 'PROSPECT';
  if (status === 'client') return 'CLIENT';

  // Default to CLIENT for 'collaborazioni', 'contatto_utile', 'inactive'
  return 'CLIENT';
}

// Map old contact_type to new contactType field (entity type)
function mapEntityType(contact_type: string): 'PERSON' | 'COMPANY' {
  return contact_type === 'company' ? 'COMPANY' : 'PERSON';
}

// Map priority enum to number
function mapPriority(priority: string): number {
  switch (priority) {
    case 'low': return 0;
    case 'medium': return 1;
    case 'high': return 2;
    default: return 1;
  }
}

// Extract INSERT statements from SQL file
function extractInsertData(sqlContent: string): LegacyContact[] {
  const contacts: LegacyContact[] = [];

  // Match the INSERT statement with all VALUES
  const insertRegex = /INSERT INTO `leads_contacts`[\s\S]+?VALUES\s*([\s\S]+);/i;
  const match = insertRegex.exec(sqlContent);

  if (!match) {
    console.error('No INSERT statement found in SQL file');
    return contacts;
  }

  const valuesSection = match[1];

  // Split by "),(" to get individual row data
  const rows = valuesSection.split(/\),\s*\(/);

  for (let i = 0; i < rows.length; i++) {
    let row = rows[i];

    // Clean up first and last rows
    if (i === 0) row = row.replace(/^\(/, '');
    if (i === rows.length - 1) row = row.replace(/\)$/, '');

    try {
      const parsed = parseInsertValues(row);

      if (parsed.length >= 18) {
        contacts.push({
          id: parseInt(parsed[0]),
          name: parsed[1],
          email: parsed[2] === 'NULL' ? null : parsed[2],
          phone: parsed[3] === 'NULL' ? null : parsed[3],
          partita_iva: parsed[4] === 'NULL' ? null : parsed[4],
          codice_fiscale: parsed[5] === 'NULL' ? null : parsed[5],
          address: parsed[6] === 'NULL' ? null : parsed[6],
          description: parsed[7] === 'NULL' ? null : parsed[7],
          contact_type: parsed[8] as 'person' | 'company',
          status: parsed[9] as any,
          priority: parsed[10] as 'low' | 'medium' | 'high',
          created_by: parseInt(parsed[11]),
          assigned_to: parsed[12] === 'NULL' ? null : parseInt(parsed[12]),
          last_contact_date: parsed[13] === 'NULL' ? null : parsed[13],
          next_followup_date: parsed[14] === 'NULL' ? null : parsed[14],
          created_at: parsed[15],
          updated_at: parsed[16],
          tags: parsed[17] === 'NULL' ? null : parsed[17],
          social_profiles: parsed[18] === 'NULL' ? null : parsed[18],
        });
      }
    } catch (error) {
      console.error('Error parsing row:', error);
    }
  }

  return contacts;
}

// Parse SQL INSERT values (handles quoted strings and NULL)
function parseInsertValues(values: string): string[] {
  const result: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < values.length; i++) {
    const char = values[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      current += char;
      continue;
    }

    if ((char === "'" || char === '"') && !inString) {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === stringChar && inString) {
      inString = false;
      stringChar = '';
      continue;
    }

    if (char === ',' && !inString) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current) {
    result.push(current.trim());
  }

  return result;
}

async function importContacts() {
  try {
    console.log('🚀 Starting legacy contacts import...\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, '../../../leads_contacts.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 SQL file loaded');

    // Extract contact data
    const legacyContacts = extractInsertData(sqlContent);
    console.log(`📊 Found ${legacyContacts.length} contacts to import\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const legacy of legacyContacts) {
      try {
        // Check if contact already exists by name (to avoid duplicates)
        const existing = await prisma.contact.findFirst({
          where: { name: legacy.name },
        });

        if (existing) {
          console.log(`⏭️  Skipping duplicate: ${legacy.name}`);
          skipped++;
          continue;
        }

        // Parse address
        const { address, city, province, zipCode } = parseAddress(legacy.address);

        // Map commercial type and entity type
        const type = mapContactType(legacy.status);
        const contactType = mapEntityType(legacy.contact_type);

        // Map priority
        const priority = mapPriority(legacy.priority);

        // Create contact
        const contact = await prisma.contact.create({
          data: {
            name: legacy.name,
            type,
            contactType,
            email: legacy.email,
            phone: legacy.phone,
            address,
            city,
            province,
            zipCode,
            partitaIva: legacy.partita_iva,
            codiceFiscale: legacy.codice_fiscale,
            notes: legacy.description,
            priority,
            status: 'active',
            contactDate: legacy.last_contact_date ? new Date(legacy.last_contact_date) : null,
            // Set default funnel stage for LEAD and PROSPECT types
            funnelStage: (type === 'LEAD' || type === 'PROSPECT') ? 'daContattare' : null,
            funnelPosition: (type === 'LEAD' || type === 'PROSPECT') ? 0 : null,
          },
        });

        // Parse and create tags
        if (legacy.tags) {
          try {
            // Unescape the JSON string (SQL escapes backslashes and quotes)
            const unescapedTags = legacy.tags.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
            const tags: Tag[] = JSON.parse(unescapedTags);

            for (const tag of tags) {
              await prisma.contactTag.create({
                data: {
                  contactId: contact.id,
                  tag: tag.tag_name,
                  color: tag.tag_color,
                },
              });
            }
          } catch (error) {
            console.error(`  ⚠️  Error parsing tags for ${legacy.name}:`, error);
          }
        }

        // Add special status tags for 'collaborazioni' and 'contatto_utile'
        if (legacy.status === 'collaborazioni') {
          await prisma.contactTag.create({
            data: {
              contactId: contact.id,
              tag: '#collaborazioni',
              color: '#10b981',
            },
          });
        }

        if (legacy.status === 'contatto_utile') {
          await prisma.contactTag.create({
            data: {
              contactId: contact.id,
              tag: '#contatto_utile',
              color: '#3b82f6',
            },
          });
        }

        // Parse and create social profiles
        if (legacy.social_profiles) {
          try {
            // Unescape the JSON string (SQL escapes backslashes and quotes)
            const unescapedSocials = legacy.social_profiles.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
            const socials: SocialProfile[] = JSON.parse(unescapedSocials);

            for (const social of socials) {
              await prisma.contactSocial.create({
                data: {
                  contactId: contact.id,
                  platform: social.platform,
                  url: social.profile_url,
                  username: social.username || null,
                },
              });
            }
          } catch (error) {
            console.error(`  ⚠️  Error parsing social profiles for ${legacy.name}:`, error);
          }
        }

        console.log(`✅ Imported: ${legacy.name} (${type})`);
        imported++;

      } catch (error: any) {
        console.error(`❌ Error importing ${legacy.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${legacyContacts.length}`);

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('💥 Fatal error during import:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

importContacts();

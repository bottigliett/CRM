import * as fs from 'fs';
import * as path from 'path';
import prisma from '../config/database';

interface LeadData {
  id: number;
  nome_cliente: string;
  contact_id: number | null;
  servizio: string;
  somma_lavoro: number;
  colonna: 'da_contattare' | 'contattati' | 'chiusi' | 'persi';
  posizione: number;
  descrizione: string | null;
  telefono: string | null;
  email: string | null;
  data_contatto: string | null;
  priorita: 'alta' | 'media' | 'bassa';
  fonte: string | null;
  note: string | null;
  created_by: number;
  assigned_to: number | null;
}

function mapFunnelStage(colonna: string): string {
  const mapping: Record<string, string> = {
    'da_contattare': 'daContattare',
    'contattati': 'contattati',
    'chiusi': 'chiusi',
    'persi': 'persi',
  };
  return mapping[colonna] || 'daContattare';
}

function parseInsertStatements(sql: string): LeadData[] {
  const leads: LeadData[] = [];

  // Match the INSERT statement with column names
  const insertPattern = /INSERT INTO `leads_funnel`\s*\(([^)]+)\)\s*VALUES/i;
  const match = insertPattern.exec(sql);

  if (!match) {
    console.error('No INSERT statement found in SQL file');
    return leads;
  }

  const columns = match[1].split(',').map(c => c.trim().replace(/`/g, ''));

  // Extract everything after VALUES until the first occurrence of ");\n--" or ");\nALTER"
  const valuesStartIndex = match.index + match[0].length;
  const afterValues = sql.substring(valuesStartIndex);
  const valuesEndMatch = afterValues.match(/\);[\s]*[\n\r]+[\s]*(-|ALTER|\/\*)/);

  if (!valuesEndMatch) {
    console.error('Could not find end of VALUES section');
    return leads;
  }

  const valuesSection = afterValues.substring(0, valuesEndMatch.index! + 2); // +2 to include ");"

  // Parse each row - handle quoted strings with commas inside
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

      // Complete row found
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

    const rowContent = row.slice(1, -1); // Remove outer parentheses
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
        // End of value
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

    // Map to leadData
    const leadData: any = {};
    columns.forEach((col, idx) => {
      leadData[col] = values[idx];
    });

    // Convert types
    try {
      leads.push({
        id: parseInt(leadData.id || '0'),
        nome_cliente: leadData.nome_cliente || '',
        contact_id: leadData.contact_id ? parseInt(leadData.contact_id) : null,
        servizio: leadData.servizio || '',
        somma_lavoro: parseFloat(leadData.somma_lavoro || '0'),
        colonna: leadData.colonna as any,
        posizione: parseInt(leadData.posizione || '0'),
        descrizione: leadData.descrizione,
        telefono: leadData.telefono,
        email: leadData.email,
        data_contatto: leadData.data_contatto,
        priorita: leadData.priorita as any,
        fonte: leadData.fonte,
        note: leadData.note,
        created_by: parseInt(leadData.created_by || '2'),
        assigned_to: leadData.assigned_to ? parseInt(leadData.assigned_to) : null,
      });
    } catch (error) {
      console.error('Error parsing lead:', leadData, error);
    }
  }

  return leads;
}

async function importLeads() {
  try {
    console.log('📂 Reading leads_funnel.sql file...\n');

    const sqlPath = path.join(__dirname, '../../../leads_funnel.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 Parsing SQL INSERT statements...\n');
    const leads = parseInsertStatements(sqlContent);
    console.log(`Found ${leads.length} leads in SQL file\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        // Check if contact exists in anagrafica (optional now)
        let linkedContactId: number | undefined = undefined;
        if (lead.contact_id) {
          const existingContact = await prisma.contact.findUnique({
            where: { id: lead.contact_id },
          });
          if (existingContact) {
            linkedContactId = lead.contact_id;
          }
        }

        // Combine descrizione and note
        const notes = [lead.descrizione, lead.note].filter(Boolean).join('\n\n');

        // Create the lead with all available data
        await prisma.contact.create({
          data: {
            name: lead.nome_cliente,
            type: 'LEAD',
            linkedContactId: linkedContactId,
            funnelStage: mapFunnelStage(lead.colonna),
            funnelValue: lead.somma_lavoro,
            funnelPosition: lead.posizione,
            serviceType: lead.servizio,
            leadSource: lead.fonte || undefined,
            contactDate: lead.data_contatto ? new Date(lead.data_contatto) : undefined,
            notes: notes || undefined,
            phone: lead.telefono || undefined,
            email: lead.email || undefined,
          },
        });

        const linkInfo = linkedContactId ? `linked to contact ${linkedContactId}` : 'no contact link';
        console.log(`✅ Imported lead "${lead.nome_cliente}" (${linkInfo})`);
        imported++;

      } catch (error: any) {
        console.error(`❌ Error importing lead "${lead.nome_cliente}":`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total: ${leads.length}\n`);

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

importLeads();

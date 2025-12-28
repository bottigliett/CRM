import prisma from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

// Mapping dello status da MySQL a SQLite
const statusMap: Record<string, 'TODO' | 'IN_PROGRESS' | 'PENDING' | 'COMPLETED'> = {
  'todo': 'TODO',
  'in_progress': 'IN_PROGRESS',
  'pending': 'PENDING',
  'completed': 'COMPLETED',
};

// Categorie di default (da creare se non esistono)
const defaultCategories = [
  { id: 1, name: 'Social Media', color: '#3b82f6', icon: '📱' },
  { id: 2, name: 'Design', color: '#8b5cf6', icon: '🎨' },
  { id: 3, name: 'Amministrazione', color: '#10b981', icon: '📊' },
  { id: 4, name: 'Sviluppo', color: '#f59e0b', icon: '💻' },
  { id: 5, name: 'Marketing', color: '#ef4444', icon: '📈' },
  { id: 6, name: 'Produzione', color: '#ec4899', icon: '🎬' },
  { id: 7, name: 'Altro', color: '#6b7280', icon: '📝' },
];

async function importTaskCategories() {
  console.log('🔄 Creazione categorie task...');

  for (const cat of defaultCategories) {
    try {
      await prisma.taskCategory.upsert({
        where: { id: cat.id },
        update: {
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          isActive: true,
        },
        create: {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          isActive: true,
        },
      });
      console.log(`✅ Categoria creata/aggiornata: ${cat.name}`);
    } catch (error) {
      console.error(`❌ Errore creazione categoria ${cat.name}:`, error);
    }
  }
}

async function parseAndImportTasks() {
  const sqlFile = path.join(__dirname, '../../../tasks.sql');
  const content = fs.readFileSync(sqlFile, 'utf-8');

  // Trova la sezione INSERT INTO tasks
  const insertMatch = content.match(/INSERT INTO `tasks`[^;]+;/s);
  if (!insertMatch) {
    console.error('❌ Non trovato INSERT INTO tasks nel file SQL');
    return;
  }

  // Estrai le righe di dati
  const valuesSection = insertMatch[0].match(/VALUES\s+([\s\S]+);/);
  if (!valuesSection) {
    console.error('❌ Non trovati VALUES nel file SQL');
    return;
  }

  const valuesText = valuesSection[1];

  // Parse manuale dei valori (gestendo virgolette e escape)
  const rows: any[] = [];
  let currentRow: any[] = [];
  let currentValue = '';
  let inQuotes = false;
  let escapeNext = false;

  for (let i = 0; i < valuesText.length; i++) {
    const char = valuesText[i];
    const nextChar = valuesText[i + 1];

    if (escapeNext) {
      currentValue += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === "'" && !escapeNext) {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes) {
      if (char === '(' && currentRow.length === 0) {
        currentRow = [];
        continue;
      }

      if (char === ')' && nextChar === ',' || (char === ')' && nextChar === ';')) {
        // Fine riga
        if (currentValue.trim() === 'NULL') {
          currentRow.push(null);
        } else if (currentValue.trim()) {
          currentRow.push(currentValue.trim());
        }
        rows.push([...currentRow]);
        currentRow = [];
        currentValue = '';
        i++; // Salta la virgola
        continue;
      }

      if (char === ',') {
        if (currentValue.trim() === 'NULL') {
          currentRow.push(null);
        } else {
          currentRow.push(currentValue.trim());
        }
        currentValue = '';
        continue;
      }

      if (char === '\n' || char === '\r') {
        continue;
      }
    }

    currentValue += char;
  }

  console.log(`\n📊 Trovati ${rows.length} task da importare\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const [
        id, title, description, clientId, categoryId, assignedTo, createdBy,
        priority, status, deadline, estimatedHours, actualHours, completedAt,
        createdAt, updatedAt, updatedBy, visibleToClient, isArchived,
        archivedAt, archivedBy
      ] = row;

      // Converti status
      const convertedStatus = statusMap[status] || 'TODO';

      // Map utenti inesistenti all'utente ID 2 (Mario Rossi)
      let finalAssignedTo = parseInt(assignedTo);
      let finalCreatedBy = parseInt(createdBy);
      let finalUpdatedBy = updatedBy ? parseInt(updatedBy) : null;
      let finalArchivedBy = archivedBy ? parseInt(archivedBy) : null;

      const assignedUser = await prisma.user.findUnique({ where: { id: finalAssignedTo } });
      if (!assignedUser) {
        finalAssignedTo = 2; // Riassegna a Mario Rossi
      }

      const creatorUser = await prisma.user.findUnique({ where: { id: finalCreatedBy } });
      if (!creatorUser) {
        finalCreatedBy = 2; // Riassegna a Mario Rossi
      }

      if (finalUpdatedBy) {
        const updaterUser = await prisma.user.findUnique({ where: { id: finalUpdatedBy } });
        if (!updaterUser) {
          finalUpdatedBy = 2;
        }
      }

      if (finalArchivedBy) {
        const archiverUser = await prisma.user.findUnique({ where: { id: finalArchivedBy } });
        if (!archiverUser) {
          finalArchivedBy = 2;
        }
      }

      // Crea il task
      await prisma.task.create({
        data: {
          id: parseInt(id),
          title: title || '',
          description: description || null,
          contactId: clientId ? parseInt(clientId) : null,
          categoryId: parseInt(categoryId),
          assignedTo: finalAssignedTo,
          createdBy: finalCreatedBy,
          priority: priority as any,
          status: convertedStatus,
          deadline: new Date(deadline),
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
          actualHours: actualHours ? parseFloat(actualHours) : 0,
          completedAt: completedAt ? new Date(completedAt) : null,
          createdAt: createdAt ? new Date(createdAt) : new Date(),
          updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
          updatedBy: finalUpdatedBy,
          visibleToClient: visibleToClient === '1',
          isArchived: isArchived === '1',
          archivedAt: archivedAt ? new Date(archivedAt) : null,
          archivedBy: finalArchivedBy,
        },
      });

      imported++;
      if (imported % 10 === 0) {
        console.log(`✅ Importati ${imported} task...`);
      }
    } catch (error: any) {
      errors++;
      console.error(`❌ Errore importazione task:`, error.message);
    }
  }

  console.log(`\n📈 Riepilogo importazione:`);
  console.log(`   ✅ Importati: ${imported}`);
  console.log(`   ⚠️  Saltati: ${skipped}`);
  console.log(`   ❌ Errori: ${errors}`);
}

async function main() {
  try {
    console.log('🚀 Inizio importazione task...\n');

    await importTaskCategories();
    console.log('\n');
    await parseAndImportTasks();

    console.log('\n✨ Importazione completata!');
  } catch (error) {
    console.error('❌ Errore durante l\'importazione:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

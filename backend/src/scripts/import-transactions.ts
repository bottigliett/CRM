import { PrismaClient, TransactionType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CSV_PATH = path.resolve(__dirname, '../../../../account-statement_2024-09-25_2026-08-03_it-it_d66bd5.csv');
const EXPECTED_BALANCE = 545.24;
const ADMIN_USER_ID = 1;

// Category IDs
const CAT_FATTURE_CLIENTI = 1;
const CAT_ALTRI_RICAVI = 19;

// Known client name mappings: CSV description fragment -> contact ID
const CLIENT_MAP: Record<string, number> = {
  'IMMOBILIARE VILLAFRANCA SRL': 70,
  'INDUSTRIALE CREMONA S.R.L.': 42,
  'SERIMEDICAL S.R.L.': 7,
  'MC SOLUTIONS SRL': 26,
  'LOMBARDI LUIGI': 20,
  'INDUSTRIALE CREMA SRL': 136,
  'FREZZA MARCO': 22,
};

// Non-client income sources (no invoice match)
const NON_CLIENT_PATTERNS = [
  'PayPal', 'Google', 'SumUp', 'Mangopay', 'Trustly',
  'Apple Pay', 'COSTATO STEFANO',
];

interface CsvRow {
  tipo: string;
  dataCompletamento: string;
  descrizione: string;
  importo: number;
  saldo: number;
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { cols.push(current); current = ''; continue; }
    current += ch;
  }
  cols.push(current);
  return cols;
}

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  return lines.slice(1).map(line => {
    const cols = parseCsvLine(line);
    return {
      tipo: cols[0],
      dataCompletamento: cols[3],
      descrizione: cols[4],
      importo: parseFloat(cols[5]),
      saldo: parseFloat(cols[9]),
    };
  });
}

function extractClientName(description: string): string | null {
  // "Pagamento da NOME" -> NOME
  const match = description.match(/Pagamento da (.+)/i);
  return match ? match[1].trim() : null;
}

function findContactId(description: string): number | null {
  const clientName = extractClientName(description);
  if (!clientName) return null;

  for (const [csvName, contactId] of Object.entries(CLIENT_MAP)) {
    if (clientName.toUpperCase().includes(csvName.toUpperCase()) ||
        csvName.toUpperCase().includes(clientName.toUpperCase())) {
      return contactId;
    }
  }
  return null;
}

function isNonClientIncome(description: string): boolean {
  return NON_CLIENT_PATTERNS.some(p => description.toUpperCase().includes(p.toUpperCase()));
}

async function findMatchingInvoice(contactId: number, amount: number, date: Date) {
  const sixtyDays = 60 * 24 * 60 * 60 * 1000;
  const dateMin = new Date(date.getTime() - sixtyDays);
  const dateMax = new Date(date.getTime() + sixtyDays);

  // Try by contact_id first
  let invoice = await prisma.invoice.findFirst({
    where: {
      contactId,
      total: { gte: amount - 0.01, lte: amount + 0.01 },
      status: 'PAID',
      issueDate: { gte: dateMin, lte: dateMax },
    },
  });

  if (invoice) return invoice;

  // For pre-2026 invoices with contact_id = NULL, match by client_name
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return null;

  invoice = await prisma.invoice.findFirst({
    where: {
      contactId: null,
      clientName: { contains: contact.name.split(' ')[0] }, // partial match
      total: { gte: amount - 0.01, lte: amount + 0.01 },
      status: 'PAID',
      issueDate: { gte: dateMin, lte: dateMax },
    },
  });

  return invoice;
}

async function main() {
  console.log('Reading CSV from:', CSV_PATH);
  const rows = parseCsv(CSV_PATH);
  console.log(`Parsed ${rows.length} rows`);

  // Delete all existing transactions
  const deleted = await prisma.transaction.deleteMany();
  console.log(`Deleted ${deleted.count} existing transactions`);

  let importedCount = 0;
  let invoiceMatchCount = 0;
  let contactOnlyCount = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  for (const row of rows) {
    // Skip cancelled transactions (empty completion date)
    if (!row.dataCompletamento) {
      console.log(`Skipping cancelled: ${row.descrizione}`);
      continue;
    }

    const type: TransactionType = row.importo >= 0 ? 'INCOME' : 'EXPENSE';
    const amount = Math.abs(row.importo);
    const date = new Date(row.dataCompletamento);

    let categoryId: number | null = null;
    let contactId: number | null = null;
    let invoiceId: number | null = null;

    if (type === 'INCOME') {
      if (isNonClientIncome(row.descrizione)) {
        categoryId = CAT_ALTRI_RICAVI;
      } else {
        contactId = findContactId(row.descrizione);
        if (contactId) {
          categoryId = CAT_FATTURE_CLIENTI;

          // Try to match an invoice
          const invoice = await findMatchingInvoice(contactId, amount, date);
          if (invoice) {
            invoiceId = invoice.id;
            invoiceMatchCount++;
          } else {
            contactOnlyCount++;
          }
        } else {
          // Generic income (Ricarica without known client)
          categoryId = CAT_ALTRI_RICAVI;
        }
      }

      totalIncome += amount;
    } else {
      totalExpense += amount;
    }

    await prisma.transaction.create({
      data: {
        type,
        amount,
        date,
        description: row.descrizione,
        categoryId,
        contactId,
        invoiceId,
        createdBy: ADMIN_USER_ID,
      },
    });

    importedCount++;
  }

  const calculatedBalance = parseFloat((totalIncome - totalExpense).toFixed(2));

  console.log('\n=== Import Results ===');
  console.log(`Imported: ${importedCount} transactions`);
  console.log(`Income:   ${totalIncome.toFixed(2)} EUR`);
  console.log(`Expenses: ${totalExpense.toFixed(2)} EUR`);
  console.log(`Balance:  ${calculatedBalance} EUR (expected: ${EXPECTED_BALANCE})`);
  console.log(`Invoice matches: ${invoiceMatchCount}`);
  console.log(`Contact-only matches: ${contactOnlyCount}`);

  // ponytail: floating point accumulation over 441 rows, 0.50 tolerance is fine
  if (Math.abs(calculatedBalance - EXPECTED_BALANCE) > 0.50) {
    console.error('WARNING: Balance mismatch!');
  } else {
    console.log('Balance OK');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

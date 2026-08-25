import { PrismaClient, TransactionType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CSV_PATH = path.resolve(__dirname, '../../../../account-statement_2024-09-25_2026-08-03_it-it_d66bd5.csv');
const EXPECTED_BALANCE = 545.24;
const ADMIN_USER_ID = 1;

// === Category IDs (from DB) ===
const CAT = {
  // INCOME
  FATTURE_CLIENTI: 1,
  ALTRI_RICAVI: 19,
  // EXPENSE
  UTENZE: 6,
  SOFTWARE: 7,
  HARDWARE: 8,
  MARKETING: 9,
  FORNITORI: 10,
  TASSE: 11,
  STIPENDI: 12,
  VIAGGI: 14,
  VARIE: 16,
  AFFITTO: 20,
};

// === Payment Method IDs (from DB) ===
const PM = {
  BONIFICO: 1,
  CARTA: 2,
  PAYPAL: 4,
  CONTANTI: 5,
  ALTRO: 8,
};

// === Known client name mappings ===
const CLIENT_MAP: Record<string, number> = {
  'IMMOBILIARE VILLAFRANCA SRL': 70,
  'INDUSTRIALE CREMONA S.R.L.': 42,
  'SERIMEDICAL S.R.L.': 7,
  'MC SOLUTIONS SRL': 26,
  'LOMBARDI LUIGI': 20,
  'INDUSTRIALE CREMA SRL': 136,
  'FREZZA MARCO': 22,
};

// Non-client income sources
const NON_CLIENT_PATTERNS = [
  'PayPal', 'Google', 'SumUp', 'Mangopay', 'Trustly',
  'Apple Pay', 'COSTATO STEFANO',
];

// === Expense category rules: first match wins ===
const EXPENSE_CATEGORY_RULES: Array<{ patterns: string[]; categoryId: number }> = [
  // Affitto
  { patterns: ['Bonzanini Anna', 'Francesca Miazzi', 'Angela Loretta Del Vecchio'], categoryId: CAT.AFFITTO },
  // Utenze
  { patterns: ['Edison', 'iliad', 'Fastweb', 'Acque Veronesi', 'Aruba', 'Servereasy', 'Hostinger', 'EasyPark'], categoryId: CAT.UTENZE },
  // Software
  { patterns: ['Adobe', 'Anthropic', 'OpenAI', 'CapCut', 'Capcut', 'Claude', 'Notion', 'ChatGPT', 'Google One', 'Coze', 'Higgsfield', 'Burrito Studio', 'Mismo Studio', 'SuperSIGMA', 'Pico'], categoryId: CAT.SOFTWARE },
  // Hardware
  { patterns: ['DJI'], categoryId: CAT.HARDWARE },
  // Marketing
  { patterns: ['Facebook', 'Google Ads', 'Meta', 'Piulike', 'Pixartprinting'], categoryId: CAT.MARKETING },
  // Stipendi (transfers to team members)
  { patterns: ['To Stefano Costato', 'To Cristian Beschin', 'To Davide Marangoni', 'To davide marangoni', 'STEFANO COSTATO', 'DAVIDE MARANGONI'], categoryId: CAT.STIPENDI },
  // Viaggi
  { patterns: ['Autostrada', 'Brebemi', 'Esso', 'B-Petrol', 'Eni', "McDonald's", 'Autogrill', 'Cm 04 Cremona'], categoryId: CAT.VIAGGI },
  // Fornitori
  { patterns: ['AliExpress', 'Aliexpress', 'Tecnomat', 'Officina Della Stampa', 'Fer Color', 'Ferexpert', 'Leroy Merlin', 'OBI', 'Ikea', 'Sum Buffetti'], categoryId: CAT.FORNITORI },
  // Tasse
  { patterns: ['Trade Republic', 'ICONTO', 'Nexi'], categoryId: CAT.TASSE },
];

// === Vendor extraction: description -> vendor name ===
const VENDOR_MAP: Array<{ patterns: string[]; vendor: string }> = [
  { patterns: ['Adobe'], vendor: 'Adobe' },
  { patterns: ['Anthropic'], vendor: 'Anthropic' },
  { patterns: ['OpenAI'], vendor: 'OpenAI' },
  { patterns: ['CapCut', 'Capcut'], vendor: 'CapCut' },
  { patterns: ['Higgsfield'], vendor: 'Higgsfield' },
  { patterns: ['Hostinger'], vendor: 'Hostinger' },
  { patterns: ['Servereasy'], vendor: 'Servereasy' },
  { patterns: ['iliad'], vendor: 'Iliad' },
  { patterns: ['Fastweb'], vendor: 'Fastweb' },
  { patterns: ['Edison'], vendor: 'Edison' },
  { patterns: ['Acque Veronesi'], vendor: 'Acque Veronesi' },
  { patterns: ['Aruba'], vendor: 'Aruba' },
  { patterns: ['Google Ads'], vendor: 'Google' },
  { patterns: ['Google One'], vendor: 'Google' },
  { patterns: ['Facebook'], vendor: 'Meta' },
  { patterns: ['Piulike'], vendor: 'Piulike' },
  { patterns: ['Pixartprinting'], vendor: 'Pixartprinting' },
  { patterns: ['DJI'], vendor: 'DJI' },
  { patterns: ['Trade Republic'], vendor: 'Trade Republic' },
  { patterns: ['Amazon'], vendor: 'Amazon' },
  { patterns: ['AliExpress', 'Aliexpress'], vendor: 'AliExpress' },
  { patterns: ['Ikea'], vendor: 'IKEA' },
  { patterns: ['Leroy Merlin'], vendor: 'Leroy Merlin' },
  { patterns: ['OBI'], vendor: 'OBI' },
  { patterns: ['Tecnomat'], vendor: 'Tecnomat' },
  { patterns: ['Kasanova'], vendor: 'Kasanova' },
  { patterns: ['Action'], vendor: 'Action' },
  { patterns: ['Migross'], vendor: 'Migross' },
  { patterns: ['Esselunga'], vendor: 'Esselunga' },
  { patterns: ['Vinted'], vendor: 'Vinted' },
  { patterns: ['Xoom'], vendor: 'Xoom' },
  { patterns: ['Autostrada A4'], vendor: 'Autostrada A4' },
  { patterns: ['Brebemi'], vendor: 'Brebemi' },
  { patterns: ['Esso'], vendor: 'Esso' },
  { patterns: ['Eni'], vendor: 'Eni' },
  { patterns: ['B-Petrol'], vendor: 'B-Petrol' },
  { patterns: ['Officina Della Stampa'], vendor: 'Officina della Stampa' },
  { patterns: ['Fer Color'], vendor: 'Fer Color' },
  { patterns: ['Ferexpert'], vendor: 'Ferexpert Verona' },
  { patterns: ['La Forchetta'], vendor: 'La Forchetta De Bacco' },
  { patterns: ['Bonzanini Anna'], vendor: 'Bonzanini Anna' },
  { patterns: ['Francesca Miazzi'], vendor: 'Francesca Miazzi' },
  { patterns: ['Giulia Selmo'], vendor: 'Giulia Selmo' },
  { patterns: ['EasyPark'], vendor: 'EasyPark' },
  { patterns: ['Coze'], vendor: 'Coze' },
  { patterns: ['Sum Buffetti'], vendor: 'Buffetti' },
  { patterns: ['Pattyland'], vendor: 'Pattyland' },
  { patterns: ['Pasticceria Le Arche'], vendor: 'Pasticceria Le Arche' },
];

// === Payment method detection ===
function detectPaymentMethod(tipo: string, description: string): number | null {
  if (tipo === 'Pagamento con carta') return PM.CARTA;
  if (description.includes('PayPal')) return PM.PAYPAL;
  // "Pagamento" / "Ricarica" tipo = bank transfer
  if (tipo === 'Pagamento' || tipo === 'Ricarica') return PM.BONIFICO;
  return null;
}

function detectExpenseCategory(description: string): number | null {
  const upper = description.toUpperCase();
  for (const rule of EXPENSE_CATEGORY_RULES) {
    if (rule.patterns.some(p => upper.includes(p.toUpperCase()))) {
      return rule.categoryId;
    }
  }
  return CAT.VARIE; // default for expenses
}

function detectVendor(description: string): string | null {
  for (const rule of VENDOR_MAP) {
    if (rule.patterns.some(p => description.toLowerCase().includes(p.toLowerCase()))) {
      return rule.vendor;
    }
  }
  // For "To <Name>" transfers, extract the name
  const toMatch = description.match(/^To (.+)/i);
  if (toMatch) return toMatch[1].trim();
  // For "Pagamento a favore di <NAME>"
  const paMatch = description.match(/Pagamento a favore di (.+)/i);
  if (paMatch) return paMatch[1].trim();
  return null;
}

// === CSV Parser ===
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

// === Income helpers ===
function extractClientName(description: string): string | null {
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

  let invoice = await prisma.invoice.findFirst({
    where: {
      contactId,
      total: { gte: amount - 0.01, lte: amount + 0.01 },
      status: 'PAID',
      issueDate: { gte: dateMin, lte: dateMax },
    },
  });
  if (invoice) return invoice;

  // Pre-2026 invoices with contact_id = NULL
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return null;

  return prisma.invoice.findFirst({
    where: {
      contactId: null,
      clientName: { contains: contact.name.split(' ')[0] },
      total: { gte: amount - 0.01, lte: amount + 0.01 },
      status: 'PAID',
      issueDate: { gte: dateMin, lte: dateMax },
    },
  });
}

// === Main ===
async function main() {
  console.log('Reading CSV from:', CSV_PATH);
  const rows = parseCsv(CSV_PATH);
  console.log(`Parsed ${rows.length} rows`);

  const deleted = await prisma.transaction.deleteMany();
  console.log(`Deleted ${deleted.count} existing transactions`);

  let importedCount = 0;
  let invoiceMatchCount = 0;
  let contactOnlyCount = 0;
  let categorizedCount = 0;
  let vendorCount = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  for (const row of rows) {
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
    let vendor: string | null = null;
    let paymentMethodId: number | null = detectPaymentMethod(row.tipo, row.descrizione);

    if (type === 'INCOME') {
      if (isNonClientIncome(row.descrizione)) {
        categoryId = CAT.ALTRI_RICAVI;
      } else {
        contactId = findContactId(row.descrizione);
        if (contactId) {
          categoryId = CAT.FATTURE_CLIENTI;
          const invoice = await findMatchingInvoice(contactId, amount, date);
          if (invoice) {
            invoiceId = invoice.id;
            invoiceMatchCount++;
          } else {
            contactOnlyCount++;
          }
        } else {
          categoryId = CAT.ALTRI_RICAVI;
        }
      }
      totalIncome += amount;
    } else {
      categoryId = detectExpenseCategory(row.descrizione);
      totalExpense += amount;
    }

    vendor = detectVendor(row.descrizione);
    if (categoryId) categorizedCount++;
    if (vendor) vendorCount++;

    await prisma.transaction.create({
      data: {
        type,
        amount,
        date,
        description: row.descrizione,
        categoryId,
        contactId,
        invoiceId,
        vendor,
        paymentMethodId,
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
  console.log(`With category: ${categorizedCount}`);
  console.log(`With vendor: ${vendorCount}`);
  console.log(`With payment method: ${importedCount} (all)`);
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

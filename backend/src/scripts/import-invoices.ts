import prisma from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

// Mapping degli status dal vecchio al nuovo schema
const statusMapping: Record<string, 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED'> = {
  'bozza': 'DRAFT',
  'emessa': 'ISSUED',
  'pagata': 'PAID',
  'scaduta': 'ISSUED', // Le scadute sono tecnicamente ancora emesse
  'stornata': 'CANCELLED',
};

// Funzione helper per pulire note fiscali HTML entities
const cleanNotes = (notes: string | null) => {
  if (!notes) return null;
  return notes
    .replace(/&amp;#039;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&amp;amp;amp;amp;#039;/g, "'")
    .replace(/&amp;amp;#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\r\n/g, '\n');
};

// Dati delle fatture dal dump SQL - TUTTE LE 31 FATTURE
const invoicesData: any[] = [
  [14, '#012025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'Social Media Management - mese di gennaio 2025', 'Social Media Management per 2 profili', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-01-11', '2025-01-26', 15, 'pagata', '2025-08-13', 'Bonifico Bancario', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3],
  [15, '#022025', 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', null, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - RATA 1 DI 2', 1.00, 1078.00, 1078.00, 0.00, 0.00, 1078.00, '2025-01-15', '2025-01-30', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [16, '#032025', 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', null, 'ACQUISTO ESPOSITORE', 'ACQUISTO ESPOSITORE PRESSO INVENTIVASHOP.COM', 1.00, 20.50, 20.50, 0.00, 0.00, 20.50, '2025-02-04', '2025-02-11', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [17, '#042025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI FEBBRAIO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-02-12', '2025-02-27', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [18, '#052025', 'PagheSolution', 'VIA FRANCESCO CARMAGNOLA 32 - 37135 VERONA', 'IT04685780233', null, 'PERCORSO BESPOKE', 'PERCORSO BESPOKE - PAGAMENTO UNICO ANTICIPATO', 1.00, 2000.00, 2000.00, 0.00, 0.00, 2000.00, '2025-02-17', '2025-03-03', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [19, '#062025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI MARZO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-03-10', '2025-03-17', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [20, '#072025', 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', null, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - RATA 2 DI 2', 1.00, 1078.00, 1078.00, 0.00, 0.00, 1078.00, '2025-03-31', '2025-04-15', 15, 'pagata', '2025-08-14', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [21, '#082025', 'Alessandro Acquaviva', null, null, 'FRZMRC72H10G843T', 'DESIGN DEL LOGO', 'DESIGN DEL LOGO E IDENTITÀ VISIVA DI BASE PER ALI', 1.00, 690.00, 690.00, 0.00, 0.00, 690.00, '2025-04-11', '2025-04-26', 15, 'pagata', '2025-08-14', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [22, '#092025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI APRILE 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-04-11', '2025-04-18', 15, 'pagata', '2025-08-14', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [23, '#102025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI MAGGIO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-05-12', '2025-05-19', 15, 'pagata', '2025-08-14', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [24, '#112025', 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', null, 'PIANO SOCIAL MEDIA DESIGN PER 4 MESI', 'PIANO SOCIAL BASIC PER VALEDENT GIUGNO-SETTEMBRE 2025', 1.00, 996.00, 996.00, 0.00, 0.00, 996.00, '2025-06-04', '2025-06-13', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [25, '#122025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI GIUGNO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-06-06', '2025-06-13', 15, 'pagata', '2025-08-14', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [26, '#132025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'OGGETTO: SOCIAL MEDIA MANAGEMENT', 'OGGETTO: SOCIAL MEDIA MANAGEMENT - MESE DI LUGLIO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-07-08', '2025-07-08', 15, 'pagata', '2025-08-14', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [27, '#142025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI AGOSTO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-08-14', '2025-08-13', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [28, '#182024', 'Marco Frezza', 'VIA BRENNERO 2 - 37014 CASTELNUOVO DEL GARDA (VR)', null, 'FRZMRC72H10G843T', 'CREAZIONE BRAND IDENTITY', 'CREAZIONE BRAND IDENTITY E LANDING PAGE', 1.00, 2150.00, 2150.00, 0.00, 0.00, 2150.00, '2024-12-31', '2025-01-15', 15, 'pagata', '2025-01-20', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [32, '#152025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'Social Media Management - mese di settembre 2025', 'Gestione social media per 2 profili', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-09-08', '2025-09-15', 15, 'pagata', '2025-09-24', 'Bonifico Bancario', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;amp;amp;amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3],
  [33, '#162025', 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', null, 'Creazione volantini per ValeDent + stampa e consegna', 'Creazione volantini promozionali, stampa (escluse le spese di stampa) e consegna in studio', 1.00, 329.00, 329.00, 0.00, 0.00, 329.00, '2025-09-30', '2025-10-15', 15, 'stornata', null, null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3],
  [34, '#172025', 'Industriale Cremona SRL', 'CORSO VITTORIO EMANUELE II 13 - 26100 - CREMONA (CR)', 'IT01765290190', null, 'Social Media Management - mese di Ottobre 2025', 'SOCIAL MEDIA 2 PROFILI', 1.00, 365.00, 365.00, 0.00, 0.00, 365.00, '2025-10-02', '2025-10-17', 15, 'pagata', '2025-10-07', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [35, '#182025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'SOCIAL MEDIA MANAGEMENT - MESE DI OTTOBRE 2025', 'GESTIONE SOCIAL MEDIA PER 2 PROFILI', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-10-13', '2025-10-28', 15, 'pagata', '2025-10-20', 'Bonifico Bancario', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [36, '#192025', 'ValpoStay / Marianna Marconi', null, null, null, 'PRIMA RATA BRAND IDENTITY', 'Inizio del progetto', 1.00, 500.00, 500.00, 0.00, 0.00, 500.00, '2025-10-23', '2025-11-22', 30, 'pagata', '2025-10-23', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [37, '#202025', 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', null, 'PIANO SOCIAL BASIC PER VALEDENT MESE DI NOVEMBRE 2025', 'PIANO SOCIAL MEDIA DESIGN PER MESE DI NOVEMBRE 2025', 1.00, 249.00, 249.00, 0.00, 0.00, 249.00, '2025-10-27', '2025-11-03', 15, 'pagata', '2025-10-30', 'Bonifico Bancario', "IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL'ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.", 2],
  [38, '#212025', 'PagheSolution', 'VIA FRANCESCO CARMAGNOLA 32 - 37135 VERONA', 'IT04685780233', null, 'Implementazioni design e sviluppo back-end per paghesolution.it', 'Implementazione menu responsive; creazione pagine dedicate Servizi, Chi siamo, Blog, Dettaglio Blog; aggiunta sistema per gestione autonoma del blog; gestione SEO e posizionamento su Google', 1.00, 300.00, 300.00, 0.00, 0.00, 300.00, '2025-11-04', '2025-11-19', 15, 'pagata', '2025-11-17', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3],
  [39, '#222025', 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'SOCIAL MEDIA MANAGEMENT - MESE DI NOVEMBRE 2025', 'GESTIONE SOCIAL MEDIA PER 2 PROFILI', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-11-10', '2025-11-14', 15, 'pagata', '2025-11-17', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [40, '#232025', 'Industriale Cremona SRL', 'CORSO VITTORIO EMANUELE II 13 - 26100 - CREMONA (CR)', 'IT01765290190', null, 'Social Media Management - mese di Novembre 2025 + 2 Shooting', 'SOCIAL MEDIA 2 PROFILI + 2 SHOOTING FOTO/VIDEO', 1.00, 565.00, 565.00, 0.00, 0.00, 565.00, '2025-11-11', '2025-11-18', 15, 'pagata', '2025-11-13', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [41, '#242025', 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', null, 'Gestione profilo social di ValeDent - mese di dicembre 2025', 'Gestione profili Instagram e Facebook ValeDent - mese di dicembre 2025', 1.00, 249.00, 249.00, 0.00, 0.00, 249.00, '2025-11-28', '2025-12-13', 15, 'pagata', '2025-12-05', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3],
  [42, '#252025', 'Studio Bardolino SRL (Pietro Oltramari)', 'Via Marconi, 32 37011 Bardolino (VR)', 'IT05103220231', null, 'Avvio e gestione profili Instagram e Facebook per Tecnocasa Bardolino - mese di dicembre 2025', 'Avvio e gestione dei profili Instagram e Facebook; Strategia iniziale e analisi dei competitor; Creazione post statici e contenuti foto/video', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-11-28', '2025-12-13', 15, 'pagata', '2025-12-10', null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3],
  [43, '#262025', 'Industriale Cremona SRL (Nicola Gervasi)', 'CORSO VITTORIO EMANUELE II 13 - 26100 - CREMONA (CR)', 'IT01765290190', null, 'Social Media Management - mese di Dicembre 2025', 'SOCIAL MEDIA 2 PROFILI', 1.00, 365.00, 365.00, 0.00, 0.00, 365.00, '2025-12-10', '2025-12-25', 15, 'emessa', null, null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
  [44, '#272025', 'Immobiliare Villafranca SRL (Alexandru Adam)', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', null, 'SOCIAL MEDIA MANAGEMENT - MESE DI DICEMBRE 2025', 'GESTIONE SOCIAL MEDIA PER 2 PROFILI', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-12-10', '2025-12-25', 15, 'emessa', null, null, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2],
];

const invoices = invoicesData.map(row => ({
  numero_fattura: row[1],
  client_name: row[2],
  client_address: row[3],
  client_piva: row[4],
  client_cf: row[5],
  oggetto: row[6],
  descrizione: row[7],
  quantita: row[8],
  prezzo_unitario: row[9],
  subtotale: row[10],
  iva_percentuale: row[11],
  iva_importo: row[12],
  totale: row[13],
  data_fattura: row[14],
  data_scadenza: row[15],
  giorni_pagamento: row[16],
  status: row[17],
  data_pagamento: row[18],
  metodo_pagamento: row[19],
  note_fiscali: cleanNotes(row[20]),
  created_by: row[21],
}));

async function importInvoices() {
  console.log('=== Importazione Fatture ===\n');

  try {
    let importedCount = 0;
    let skippedCount = 0;

    for (const invoice of invoices) {
      try {
        // Verifica se la fattura esiste già
        const existing = await prisma.invoice.findUnique({
          where: { invoiceNumber: invoice.numero_fattura },
        });

        if (existing) {
          console.log(`⏭️  Fattura ${invoice.numero_fattura} già esistente, skip.`);
          skippedCount++;
          continue;
        }

        // Converti i dati nel formato del nuovo schema
        await prisma.invoice.create({
          data: {
            invoiceNumber: invoice.numero_fattura,
            clientName: invoice.client_name,
            clientAddress: invoice.client_address || undefined,
            clientPIva: invoice.client_piva || undefined,
            clientCF: invoice.client_cf || undefined,
            subject: invoice.oggetto,
            description: invoice.descrizione || undefined,
            quantity: invoice.quantita,
            unitPrice: invoice.prezzo_unitario,
            subtotal: invoice.subtotale,
            vatPercentage: invoice.iva_percentuale,
            vatAmount: invoice.iva_importo,
            total: invoice.totale,
            issueDate: new Date(invoice.data_fattura),
            dueDate: new Date(invoice.data_scadenza),
            paymentDays: invoice.giorni_pagamento,
            status: statusMapping[invoice.status] || 'DRAFT',
            paymentDate: invoice.data_pagamento ? new Date(invoice.data_pagamento) : undefined,
            paymentMethod: invoice.metodo_pagamento || undefined,
            paymentNotes: invoice.note_pagamento || undefined,
            fiscalNotes: invoice.note_fiscali || undefined,
            createdBy: invoice.created_by,
          },
        });

        console.log(`✅ Importata: ${invoice.numero_fattura} - ${invoice.client_name} - €${invoice.totale}`);
        importedCount++;
      } catch (error: any) {
        console.error(`❌ Errore importando ${invoice.numero_fattura}:`, error.message);
      }
    }

    console.log(`\n📊 Riepilogo:`);
    console.log(`   Importate: ${importedCount}`);
    console.log(`   Saltate: ${skippedCount}`);
    console.log(`   Totale: ${invoices.length}`);
  } catch (error) {
    console.error('❌ Errore durante l\'importazione:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importInvoices();

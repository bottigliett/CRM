-- Importazione fatture senza associazione clienti (contactId NULL)
-- L'utente selezionerà manualmente i clienti dall'interfaccia

-- Fatture 2024
INSERT INTO invoices (
  invoice_number, contact_id, client_name, client_address, client_piva, client_cf,
  subject, description, quantity, unit_price, subtotal, vat_percentage, vat_amount, total,
  issue_date, due_date, payment_days, status, fiscal_notes, created_by, updated_at
) VALUES
-- Gennaio 2024
('2024/001', NULL, 'Azienda Alpha S.r.l.', 'Via Roma 10, 37100 Verona', '01234567890', NULL,
 'Sviluppo sito web aziendale', 'Progettazione e sviluppo completo sito web responsive con CMS', 1, 4500.00, 4500.00, 0, 0.00, 4500.00,
 '2024-01-15', '2024-02-14', 30, 'PAID', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/002', NULL, 'Studio Legale Rossi', 'Corso Porta Nuova 45, 37122 Verona', '09876543210', NULL,
 'Restyling identità visiva', 'Nuovo logo, biglietti da visita e carta intestata', 1, 2800.00, 2800.00, 0, 0.00, 2800.00,
 '2024-01-28', '2024-02-27', 30, 'PAID', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Febbraio 2024
('2024/003', NULL, 'Beta Solutions Ltd', '123 Oxford Street, London', NULL, NULL,
 'UI/UX Design Mobile App', 'Design interfaccia utente per applicazione mobile iOS/Android', 1, 3200.00, 3200.00, 0, 0.00, 3200.00,
 '2024-02-10', '2024-03-11', 30, 'PAID', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/004', NULL, 'Gamma Consulting', 'Via Mazzini 78, 20123 Milano', '11223344556', NULL,
 'Consulenza marketing digitale', 'Piano strategico social media e content marketing (3 mesi)', 1, 5500.00, 5500.00, 0, 0.00, 5500.00,
 '2024-02-25', '2024-03-26', 30, 'PAID', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Marzo 2024
('2024/005', NULL, 'Delta E-commerce S.p.A.', 'Via Dante 156, 35100 Padova', '22334455667', NULL,
 'Sviluppo piattaforma e-commerce', 'Implementazione sistema di vendita online con catalogo prodotti', 1, 8900.00, 8900.00, 0, 0.00, 8900.00,
 '2024-03-08', '2024-04-07', 30, 'PAID', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/006', NULL, 'Epsilon Tech', 'Via Garibaldi 89, 37100 Verona', '33445566778', NULL,
 'Brand identity startup', 'Creazione completa identità visiva per startup tecnologica', 1, 4200.00, 4200.00, 0, 0.00, 4200.00,
 '2024-03-22', '2024-04-21', 30, 'PAID', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Aprile 2024
('2024/007', NULL, 'Zeta Pharma', 'Viale Europa 234, 36100 Vicenza', '44556677889', NULL,
 'Campagna pubblicitaria digital', 'Creatività e gestione campagne Google Ads e Meta Ads (2 mesi)', 1, 6700.00, 6700.00, 0, 0.00, 6700.00,
 '2024-04-12', '2024-05-12', 30, 'PAID', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Maggio 2024
('2024/008', NULL, 'Eta Real Estate', 'Via Verdi 67, 37122 Verona', '55667788990', NULL,
 'Sito web immobiliare', 'Portale immobiliare con ricerca avanzata e gestione annunci', 1, 7200.00, 7200.00, 0, 0.00, 7200.00,
 '2024-05-05', '2024-06-04', 30, 'PAID', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/009', NULL, 'Theta Events', 'Corso Milano 123, 35100 Padova', '66778899001', NULL,
 'Design materiali evento', 'Locandine, flyer, badge e segnaletica evento aziendale', 1, 2100.00, 2100.00, 0, 0.00, 2100.00,
 '2024-05-20', '2024-06-19', 30, 'PAID', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Giugno 2024
('2024/010', NULL, 'Iota Fashion', 'Via della Moda 45, 20121 Milano', '77889900112', NULL,
 'E-commerce moda online', 'Sviluppo negozio online con lookbook e configuratore taglie', 1, 9500.00, 9500.00, 0, 0.00, 9500.00,
 '2024-06-07', '2024-07-07', 30, 'PAID', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/011', NULL, 'Kappa Sports', 'Via dello Sport 88, 37100 Verona', '88990011223', NULL,
 'App gestione prenotazioni', 'Applicazione mobile per prenotazione campi sportivi', 1, 6800.00, 6800.00, 0, 0.00, 6800.00,
 '2024-06-18', '2024-07-18', 30, 'ISSUED', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Luglio 2024
('2024/012', NULL, 'Lambda Hotels', 'Piazza Bra 12, 37121 Verona', '99001122334', NULL,
 'Restyling sito hotel', 'Nuovo sito con booking engine e gestione disponibilità', 1, 8200.00, 8200.00, 0, 0.00, 8200.00,
 '2024-07-03', '2024-08-02', 30, 'ISSUED', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/013', NULL, 'Mu Restaurant Group', 'Via Cappello 23, 37121 Verona', '00112233445', NULL,
 'Branding catena ristoranti', 'Identità coordinata per 3 ristoranti del gruppo', 1, 5400.00, 5400.00, 0, 0.00, 5400.00,
 '2024-07-19', '2024-08-18', 30, 'ISSUED', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Agosto 2024
('2024/014', NULL, 'Nu Wellness', 'Via Salute 56, 36100 Vicenza', '11223344557', NULL,
 'Sito web centro benessere', 'Portale con sistema prenotazioni e vendita abbonamenti', 1, 4900.00, 4900.00, 0, 0.00, 4900.00,
 '2024-08-08', '2024-09-07', 30, 'ISSUED', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Settembre 2024
('2024/015', NULL, 'Xi Automotive', 'Via Industria 190, 37100 Verona', '22334455668', NULL,
 'Catalogo digitale ricambi', 'Database ricambi auto con ricerca avanzata e gestione ordini', 1, 7600.00, 7600.00, 0, 0.00, 7600.00,
 '2024-09-05', '2024-10-05', 30, 'ISSUED', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/016', NULL, 'Omicron Media', 'Corso Porta Borsari 34, 37121 Verona', '33445566779', NULL,
 'Video promozionali social', 'Produzione 5 video per campagna social media', 1, 3800.00, 3800.00, 0, 0.00, 3800.00,
 '2024-09-22', '2024-10-22', 30, 'DRAFT', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Ottobre 2024
('2024/017', NULL, 'Pi Costruzioni', 'Via Edilizia 99, 35100 Padova', '44556677880', NULL,
 'Sito web azienda edile', 'Showcase progetti con portfolio e form contatti', 1, 3600.00, 3600.00, 0, 0.00, 3600.00,
 '2024-10-10', '2024-11-09', 30, 'DRAFT', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/018', NULL, 'Rho Design Studio', 'Via Creatività 77, 20100 Milano', '55667788991', NULL,
 'Portfolio fotografo', 'Sito web portfolio con gallerie e sistema prenotazioni', 1, 2900.00, 2900.00, 0, 0.00, 2900.00,
 '2024-10-25', '2024-11-24', 30, 'DRAFT', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Novembre 2024
('2024/019', NULL, 'Sigma Logistics', 'Via Trasporti 145, 37100 Verona', '66778899002', NULL,
 'Dashboard gestionale', 'Sistema di tracking spedizioni e gestione magazzino', 1, 11500.00, 11500.00, 0, 0.00, 11500.00,
 '2024-11-06', '2024-12-06', 30, 'DRAFT', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/020', NULL, 'Tau Consulting', 'Piazza Dante 8, 36100 Vicenza', '77889900113', NULL,
 'Branding aziendale', 'Logo, brand guidelines e materiali di comunicazione', 1, 4100.00, 4100.00, 0, 0.00, 4100.00,
 '2024-11-18', '2024-12-18', 30, 'DRAFT', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

-- Dicembre 2024
('2024/021', NULL, 'Upsilon Tech', 'Via Innovazione 234, 20100 Milano', '88990011224', NULL,
 'Landing page prodotto', 'Pagina di atterraggio per lancio nuovo prodotto tech', 1, 2400.00, 2400.00, 0, 0.00, 2400.00,
 '2024-12-02', '2025-01-01', 30, 'DRAFT', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/022', NULL, 'Phi Beauty Salon', 'Via Bellezza 56, 37122 Verona', '99001122335', NULL,
 'Sito web salone bellezza', 'Portale con gallery servizi e prenotazione online', 1, 3200.00, 3200.00, 0, 0.00, 3200.00,
 '2024-12-15', '2025-01-14', 30, 'DRAFT', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP),

('2024/023', NULL, 'Chi Global Trading', '789 Main Street, New York', NULL, NULL,
 'E-commerce internazionale', 'Piattaforma multilingua con gestione valute multiple', 1, 12800.00, 12800.00, 0, 0.00, 12800.00,
 '2024-12-20', '2025-01-19', 30, 'DRAFT', 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.', 1, CURRENT_TIMESTAMP);

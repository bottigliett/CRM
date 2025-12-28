-- Import more invoices with contact associations

-- Studio Bardolino SRL (ID: 125)
INSERT INTO invoices (invoice_number, contact_id, client_name, client_address, client_piva, client_cf, subject, description, quantity, unit_price, subtotal, vat_percentage, vat_amount, total, issue_date, due_date, payment_days, status, created_by, created_at, updated_at, fiscal_notes)
VALUES
('#112025', 125, 'Studio Bardolino SRL', 'Via Bardolino 12, 37011 Bardolino VR', 'IT05103220231', NULL, 'Brand Identity - Gennaio 2025', '[{"id":"1","description":"Logo design","quantity":1,"unitPrice":600},{"id":"2","description":"Business card design","quantity":1,"unitPrice":200}]', 1, 800, 800, 0, 0, 800, '2025-01-08', '2025-02-07', 30, 'ISSUED', 1, datetime('now', '-7 days'), datetime('now', '-7 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Glow Chic (ID: 100)
('#122025', 100, 'Glow Chic', 'Via della Bellezza 5, 37100 Verona', 'IT05139220239', NULL, 'Social Media Management - Dicembre 2024', '[{"id":"1","description":"Gestione Instagram","quantity":1,"unitPrice":500},{"id":"2","description":"Contenuti foto/video","quantity":1,"unitPrice":300}]', 1, 800, 800, 0, 0, 800, '2024-12-10', '2025-01-09', 30, 'PAID', 1, datetime('now', '-35 days'), datetime('now', '-35 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- MC Solutions (another invoice)
('#132025', 63, 'MC Solutions', 'Via Roma 123, 37100 Verona', 'IT04621440231', NULL, 'Shooting Fotografico - Novembre 2024', '[{"id":"1","description":"Servizio fotografico prodotti","quantity":1,"unitPrice":400},{"id":"2","description":"Post-produzione","quantity":1,"unitPrice":200}]', 1, 600, 600, 0, 0, 600, '2024-11-20', '2024-12-20', 30, 'PAID', 1, datetime('now', '-65 days'), datetime('now', '-65 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- PagheSolution (another invoice)
('#142025', 56, 'PagheSolution', 'Via Milano 45, 37100 Verona', 'IT04685780233', NULL, 'Sviluppo Landing Page - Ottobre 2024', '[{"id":"1","description":"Design UI/UX","quantity":1,"unitPrice":500},{"id":"2","description":"Sviluppo frontend","quantity":1,"unitPrice":1000},{"id":"3","description":"Integrazione form","quantity":1,"unitPrice":300}]', 1, 1800, 1800, 0, 0, 1800, '2024-10-25', '2024-11-24', 30, 'PAID', 1, datetime('now', '-85 days'), datetime('now', '-85 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Marco Frezza (another invoice)
('#152025', 58, 'Marco Frezza', NULL, NULL, NULL, 'Consulenza Marketing - Settembre 2024', '[{"id":"1","description":"Strategia social media","quantity":1,"unitPrice":600},{"id":"2","description":"Piano editoriale trimestrale","quantity":1,"unitPrice":400}]', 1, 1000, 1000, 0, 0, 1000, '2024-09-15', '2024-10-15', 30, 'PAID', 1, datetime('now', '-110 days'), datetime('now', '-110 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Valpostay (another invoice)
('#162025', 93, 'Valpostay', NULL, NULL, NULL, 'Sito Web E-commerce - Agosto 2024', '[{"id":"1","description":"Design e-commerce","quantity":1,"unitPrice":1200},{"id":"2","description":"Sviluppo Shopify","quantity":1,"unitPrice":1800},{"id":"3","description":"Configurazione pagamenti","quantity":1,"unitPrice":400}]', 1, 3400, 3400, 0, 0, 3400, '2024-08-20', '2024-09-19', 30, 'PAID', 1, datetime('now', '-140 days'), datetime('now', '-140 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- ValeDent (another invoice)
('#172025', 43, 'ValeDent (Serimedical S.R.L.)', 'Via Verona 78, 37100 Verona', '04559200235', NULL, 'Campagna Google Ads - Luglio 2024', '[{"id":"1","description":"Setup campagna","quantity":1,"unitPrice":400},{"id":"2","description":"Gestione mensile","quantity":1,"unitPrice":600}]', 1, 1000, 1000, 0, 0, 1000, '2024-07-15', '2024-08-14', 30, 'PAID', 1, datetime('now', '-170 days'), datetime('now', '-170 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Mario Rossi Srl (another invoice)
('#182025', 124, 'Mario Rossi Srl', 'Via Piave 10, 37135 Verona', 'IT05052740239', NULL, 'Video Promozionale - Giugno 2024', '[{"id":"1","description":"Riprese video","quantity":2,"unitPrice":300},{"id":"2","description":"Montaggio e editing","quantity":1,"unitPrice":500},{"id":"3","description":"Colonna sonora","quantity":1,"unitPrice":200}]', 1, 1300, 1300, 0, 0, 1300, '2024-06-20', '2024-07-20', 30, 'PAID', 1, datetime('now', '-195 days'), datetime('now', '-195 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Industriale Cremona SRL (another invoice)
('#192025', 94, 'Industriale Cremona SRL', 'Corso Italia 55, 26100 Cremona', 'IT01765290190', NULL, 'Campagna LinkedIn - Maggio 2024', '[{"id":"1","description":"Strategia LinkedIn","quantity":1,"unitPrice":500},{"id":"2","description":"Creazione contenuti","quantity":1,"unitPrice":700}]', 1, 1200, 1200, 0, 0, 1200, '2024-05-15', '2024-06-14', 30, 'PAID', 1, datetime('now', '-225 days'), datetime('now', '-225 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Pippo Baudo Srl (another invoice)
('#202025', 129, 'Pippo Baudo Srl', NULL, NULL, NULL, 'Brochure Aziendale - Aprile 2024', '[{"id":"1","description":"Design brochure","quantity":1,"unitPrice":400},{"id":"2","description":"Copywriting","quantity":1,"unitPrice":300}]', 1, 700, 700, 0, 0, 700, '2024-04-10', '2024-05-10', 30, 'PAID', 1, datetime('now', '-260 days'), datetime('now', '-260 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Alessandro Acquaviva (another invoice)
('#212025', 57, 'Alessandro Acquaviva', NULL, NULL, NULL, 'Social Media Management - Marzo 2024', '[{"id":"1","description":"Gestione mensile social","quantity":1,"unitPrice":450}]', 1, 450, 450, 0, 0, 450, '2024-03-20', '2024-04-19', 30, 'PAID', 1, datetime('now', '-285 days'), datetime('now', '-285 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- MC Solutions (Gennaio 2024 - un anno fa)
('#222024', 63, 'MC Solutions', 'Via Roma 123, 37100 Verona', 'IT04621440231', NULL, 'Restyling Brand Identity - Gennaio 2024', '[{"id":"1","description":"Analisi brand","quantity":1,"unitPrice":500},{"id":"2","description":"Nuovo logo","quantity":1,"unitPrice":800},{"id":"3","description":"Brand guidelines","quantity":1,"unitPrice":400}]', 1, 1700, 1700, 0, 0, 1700, '2024-01-15', '2024-02-14', 30, 'PAID', 1, datetime('now', '-350 days'), datetime('now', '-350 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- PagheSolution (Febbraio 2024)
('#232024', 56, 'PagheSolution', 'Via Milano 45, 37100 Verona', 'IT04685780233', NULL, 'Email Marketing Campaign - Febbraio 2024', '[{"id":"1","description":"Design template email","quantity":3,"unitPrice":150},{"id":"2","description":"Setup automation","quantity":1,"unitPrice":400}]', 1, 850, 850, 0, 0, 850, '2024-02-10', '2024-03-11', 30, 'PAID', 1, datetime('now', '-320 days'), datetime('now', '-320 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.');

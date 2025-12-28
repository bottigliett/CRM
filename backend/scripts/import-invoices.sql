-- Import invoices with contact associations
-- Get user ID 1 (admin) as creator

-- MC Solutions (ID: 63)
INSERT INTO invoices (invoice_number, contact_id, client_name, client_address, client_piva, client_cf, subject, description, quantity, unit_price, subtotal, vat_percentage, vat_amount, total, issue_date, due_date, payment_days, status, created_by, created_at, updated_at, fiscal_notes)
VALUES
('#012025', 63, 'MC Solutions', 'Via Roma 123, 37100 Verona', 'IT04621440231', NULL, 'Social Media Management - Gennaio 2025', '[{"id":"1","description":"Gestione Social Media","quantity":1,"unitPrice":800}]', 1, 800, 800, 0, 0, 800, '2025-01-15', '2025-02-14', 30, 'ISSUED', 1, datetime('now'), datetime('now'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

('#022025', 63, 'MC Solutions', 'Via Roma 123, 37100 Verona', 'IT04621440231', NULL, 'Creazione Contenuti - Dicembre 2024', '[{"id":"1","description":"Shooting fotografico","quantity":2,"unitPrice":150},{"id":"2","description":"Video editing","quantity":1,"unitPrice":300}]', 1, 600, 600, 0, 0, 600, '2024-12-20', '2025-01-19', 30, 'PAID', 1, datetime('now', '-30 days'), datetime('now', '-30 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- PagheSolution (ID: 56)
('#032025', 56, 'PagheSolution', 'Via Milano 45, 37100 Verona', 'IT04685780233', NULL, 'Consulenza Marketing - Gennaio 2025', '[{"id":"1","description":"Consulenza strategica","quantity":1,"unitPrice":1200},{"id":"2","description":"Piano editoriale","quantity":1,"unitPrice":400}]', 1, 1600, 1600, 0, 0, 1600, '2025-01-10', '2025-02-09', 30, 'ISSUED', 1, datetime('now', '-5 days'), datetime('now', '-5 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Marco Frezza (ID: 58)
('#042025', 58, 'Marco Frezza', NULL, NULL, NULL, 'Sviluppo Sito Web - Novembre 2024', '[{"id":"1","description":"Progettazione UI/UX","quantity":1,"unitPrice":500},{"id":"2","description":"Sviluppo frontend","quantity":1,"unitPrice":1500}]', 1, 2000, 2000, 0, 0, 2000, '2024-11-25', '2024-12-25', 30, 'PAID', 1, datetime('now', '-60 days'), datetime('now', '-60 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- ValeDent (ID: 43)
('#052025', 43, 'ValeDent (Serimedical S.R.L.)', 'Via Verona 78, 37100 Verona', '04559200235', NULL, 'Brand Identity - Ottobre 2024', '[{"id":"1","description":"Logo design","quantity":1,"unitPrice":800},{"id":"2","description":"Brand guidelines","quantity":1,"unitPrice":400}]', 1, 1200, 1200, 0, 0, 1200, '2024-10-15', '2024-11-14', 30, 'PAID', 1, datetime('now', '-90 days'), datetime('now', '-90 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Valpostay (ID: 93)
('#062025', 93, 'Valpostay', NULL, NULL, NULL, 'Gestione Social - Dicembre 2024', '[{"id":"1","description":"Social media management","quantity":1,"unitPrice":600}]', 1, 600, 600, 0, 0, 600, '2024-12-01', '2024-12-31', 30, 'PAID', 1, datetime('now', '-45 days'), datetime('now', '-45 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Mario Rossi Srl (ID: 124)
('#072025', 124, 'Mario Rossi Srl', 'Via Piave 10, 37135 Verona', 'IT05052740239', NULL, 'Campagna Pubblicitaria - Settembre 2024', '[{"id":"1","description":"Creatività grafica","quantity":3,"unitPrice":200},{"id":"2","description":"Gestione campagna","quantity":1,"unitPrice":500}]', 1, 1100, 1100, 0, 0, 1100, '2024-09-20', '2024-10-20', 30, 'PAID', 1, datetime('now', '-120 days'), datetime('now', '-120 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Industriale Cremona SRL (ID: 94)
('#082025', 94, 'Industriale Cremona SRL', 'Corso Italia 55, 26100 Cremona', 'IT01765290190', NULL, 'Sito Web Aziendale - Agosto 2024', '[{"id":"1","description":"Sviluppo sito web","quantity":1,"unitPrice":2500},{"id":"2","description":"SEO optimization","quantity":1,"unitPrice":500}]', 1, 3000, 3000, 0, 0, 3000, '2024-08-10', '2024-09-09', 30, 'PAID', 1, datetime('now', '-150 days'), datetime('now', '-150 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Pippo Baudo Srl (ID: 129)
('#092025', 129, 'Pippo Baudo Srl', NULL, NULL, NULL, 'Consulenza Web Marketing - Gennaio 2025', '[{"id":"1","description":"Analisi competitor","quantity":1,"unitPrice":400},{"id":"2","description":"Strategia digitale","quantity":1,"unitPrice":800}]', 1, 1200, 1200, 0, 0, 1200, '2025-01-05', '2025-02-04', 30, 'ISSUED', 1, datetime('now', '-10 days'), datetime('now', '-10 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.'),

-- Alessandro Acquaviva (ID: 57)
('#102025', 57, 'Alessandro Acquaviva', NULL, NULL, NULL, 'Shooting Fotografico - Dicembre 2024', '[{"id":"1","description":"Servizio fotografico","quantity":1,"unitPrice":350}]', 1, 350, 350, 0, 0, 350, '2024-12-15', '2025-01-14', 30, 'ISSUED', 1, datetime('now', '-20 days'), datetime('now', '-20 days'), 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL''ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.

QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.');

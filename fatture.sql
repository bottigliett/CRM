-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Creato il: Dic 26, 2025 alle 20:51
-- Versione del server: 11.8.3-MariaDB-log
-- Versione PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u706045794_crm_mismo`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `fatture`
--

CREATE TABLE `fatture` (
  `id` int(11) NOT NULL,
  `numero_fattura` varchar(50) NOT NULL,
  `client_id` int(11) NOT NULL,
  `client_name` varchar(255) NOT NULL,
  `client_address` text DEFAULT NULL,
  `client_piva` varchar(20) DEFAULT NULL,
  `client_cf` varchar(20) DEFAULT NULL,
  `oggetto` varchar(500) NOT NULL,
  `descrizione` text DEFAULT NULL,
  `quantita` decimal(8,2) NOT NULL DEFAULT 1.00,
  `prezzo_unitario` decimal(10,2) NOT NULL,
  `subtotale` decimal(10,2) NOT NULL,
  `iva_percentuale` decimal(5,2) NOT NULL DEFAULT 0.00,
  `iva_importo` decimal(10,2) NOT NULL DEFAULT 0.00,
  `totale` decimal(10,2) NOT NULL,
  `data_fattura` date NOT NULL,
  `data_scadenza` date NOT NULL,
  `giorni_pagamento` int(3) NOT NULL DEFAULT 30,
  `status` enum('bozza','emessa','pagata','scaduta','stornata') NOT NULL DEFAULT 'bozza',
  `data_pagamento` date DEFAULT NULL,
  `metodo_pagamento` varchar(100) DEFAULT NULL,
  `note_pagamento` text DEFAULT NULL,
  `note_fiscali` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `pdf_path` varchar(500) DEFAULT NULL,
  `pdf_generated_at` datetime DEFAULT NULL,
  `visible_to_client` tinyint(1) DEFAULT 1 COMMENT 'Se visibile al cliente nella dashboard'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dump dei dati per la tabella `fatture`
--

INSERT INTO `fatture` (`id`, `numero_fattura`, `client_id`, `client_name`, `client_address`, `client_piva`, `client_cf`, `oggetto`, `descrizione`, `quantita`, `prezzo_unitario`, `subtotale`, `iva_percentuale`, `iva_importo`, `totale`, `data_fattura`, `data_scadenza`, `giorni_pagamento`, `status`, `data_pagamento`, `metodo_pagamento`, `note_pagamento`, `note_fiscali`, `created_by`, `created_at`, `updated_at`, `pdf_path`, `pdf_generated_at`, `visible_to_client`) VALUES
(14, '#012025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'Social Media Management - mese di gennaio 2025', 'Social Media Management per 2 profili', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-01-11', '2025-01-26', 15, 'pagata', '2025-08-13', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3, '2025-08-13 15:10:04', '2025-08-25 15:02:24', '/modules/fatture/pdf/fattura_14.pdf', '2025-08-25 15:02:24', 1),
(15, '#022025', 43, 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', NULL, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - RATA 1 DI 2', 1.00, 1078.00, 1078.00, 0.00, 0.00, 1078.00, '2025-01-15', '2025-01-30', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 10:20:55', '2025-08-14 10:20:55', NULL, NULL, 1),
(16, '#032025', 43, 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', NULL, 'ACQUISTO ESPOSITORE', 'ACQUISTO ESPOSITORE PRESSO INVENTIVASHOP.COM', 1.00, 20.50, 20.50, 0.00, 0.00, 20.50, '2025-02-04', '2025-02-11', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 10:23:15', '2025-08-14 10:23:15', NULL, NULL, 1),
(17, '#042025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI FEBBRAIO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-02-12', '2025-02-27', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 10:27:16', '2025-08-14 10:27:16', NULL, NULL, 1),
(18, '#052025', 56, 'PagheSolution', 'VIA FRANCESCO CARMAGNOLA 32 - 37135 VERONA', 'IT04685780233', NULL, 'PERCORSO BESPOKE', 'PERCORSO BESPOKE - PAGAMENTO UNICO ANTICIPATO', 1.00, 2000.00, 2000.00, 0.00, 0.00, 2000.00, '2025-02-17', '2025-03-03', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 10:29:29', '2025-08-14 10:29:29', NULL, NULL, 1),
(19, '#062025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI MARZO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-03-10', '2025-03-17', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 10:30:23', '2025-08-14 10:30:23', NULL, NULL, 1),
(20, '#072025', 43, 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', NULL, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - RATA 2 DI 2', 1.00, 1078.00, 1078.00, 0.00, 0.00, 1078.00, '2025-03-31', '2025-04-15', 15, 'pagata', '2025-08-14', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 13:00:44', '2025-08-14 13:00:44', NULL, NULL, 1),
(21, '#082025', 57, 'Alessandro Acquaviva', NULL, NULL, NULL, 'DESIGN DEL LOGO', 'DESIGN DEL LOGO E IDENTITÀ VISIVA DI BASE PER ALI', 1.00, 690.00, 690.00, 0.00, 0.00, 690.00, '2025-04-11', '2025-04-26', 15, 'pagata', '2025-08-14', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 13:02:32', '2025-08-14 13:02:32', NULL, NULL, 1),
(22, '#092025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI APRILE 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-04-11', '2025-04-18', 15, 'pagata', '2025-08-14', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 13:05:01', '2025-08-14 13:05:01', NULL, NULL, 1),
(23, '#102025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI MAGGIO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-05-12', '2025-05-19', 15, 'pagata', '2025-08-14', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 13:05:55', '2025-08-14 13:05:55', NULL, NULL, 1),
(24, '#112025', 43, 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', NULL, 'PIANO SOCIAL MEDIA DESIGN PER 4 MESI', 'PIANO SOCIAL BASIC PER VALEDENT GIUGNO-SETTEMBRE 2025', 1.00, 996.00, 996.00, 0.00, 0.00, 996.00, '2025-06-04', '2025-06-13', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 13:08:13', '2025-08-14 13:08:13', NULL, NULL, 1),
(25, '#122025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI GIUGNO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-06-06', '2025-06-13', 15, 'pagata', '2025-08-14', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 13:10:55', '2025-08-14 13:10:55', NULL, NULL, 1),
(26, '#132025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'OGGETTO: SOCIAL MEDIA MANAGEMENT', 'OGGETTO: SOCIAL MEDIA MANAGEMENT - MESE DI LUGLIO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-07-08', '2025-07-08', 15, 'pagata', '2025-08-14', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 13:32:06', '2025-08-20 15:55:16', '/modules/fatture/pdf/fattura_26.pdf', '2025-08-20 15:55:16', 1),
(27, '#142025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'SOCIAL MEDIA MANAGEMENT', 'SOCIAL MEDIA MANAGEMENT - MESE DI AGOSTO 2025', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-08-14', '2025-08-13', 15, 'pagata', '2025-08-14', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 13:33:11', '2025-09-03 09:58:50', '/modules/fatture/pdf/fattura_27.pdf', '2025-09-03 09:58:50', 1),
(28, '#182024', 58, 'Marco Frezza', 'VIA BRENNERO 2 - 37014 CASTELNUOVO DEL GARDA (VR)', NULL, 'FRZMRC72H10G843T', 'CREAZIONE BRAND IDENTITY', 'CREAZIONE BRAND IDENTITY E LANDING PAGE', 1.00, 2150.00, 2150.00, 0.00, 0.00, 2150.00, '2024-12-31', '2025-01-15', 15, 'pagata', '2025-01-20', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-08-14 13:35:57', '2025-08-14 13:35:57', NULL, NULL, 1),
(32, '#152025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'Social Media Management - mese di settembre 2025', 'Gestione social media per 2 profili', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-09-08', '2025-09-15', 15, 'pagata', '2025-09-24', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;amp;amp;amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3, '2025-09-08 13:08:45', '2025-10-23 16:33:14', '/modules/fatture/pdf/fattura_32.pdf', '2025-10-23 16:33:14', 1),
(33, '#162025', 43, 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', NULL, 'Creazione volantini per ValeDent + stampa e consegna', 'Creazione volantini promozionali, stampa (escluse le spese di stampa) e consegna in studio', 1.00, 329.00, 329.00, 0.00, 0.00, 329.00, '2025-09-30', '2025-10-15', 15, 'stornata', NULL, NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3, '2025-09-30 13:31:41', '2025-10-07 08:29:46', '/modules/fatture/pdf/fattura_33.pdf', '2025-09-30 13:34:26', 1),
(34, '#172025', 94, 'Industriale Cremona SRL', 'CORSO VITTORIO EMANUELE II 13 - 26100 - CREMONA (CR)', 'IT01765290190', NULL, 'Social Media Management - mese di Ottobre 2025', 'SOCIAL MEDIA 2 PROFILI', 1.00, 365.00, 365.00, 0.00, 0.00, 365.00, '2025-10-02', '2025-10-17', 15, 'pagata', '2025-10-07', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-10-02 15:15:20', '2025-11-11 10:16:14', '/modules/fatture/pdf/fattura_34.pdf', '2025-11-11 10:16:14', 1),
(35, '#182025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'SOCIAL MEDIA MANAGEMENT - MESE DI OTTOBRE 2025', 'GESTIONE SOCIAL MEDIA PER 2 PROFILI', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-10-13', '2025-10-28', 15, 'pagata', '2025-10-20', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-10-13 13:27:50', '2025-11-10 14:53:47', '/modules/fatture/pdf/fattura_35.pdf', '2025-11-10 14:53:47', 1),
(36, '#192025', 93, 'ValpoStay / Marianna Marconi', NULL, NULL, NULL, 'PRIMA RATA BRAND IDENTITY', 'Inizio del progetto', 1.00, 500.00, 500.00, 0.00, 0.00, 500.00, '2025-10-23', '2025-11-22', 30, 'pagata', '2025-10-23', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-10-23 09:43:45', '2025-10-23 09:43:52', '/modules/fatture/pdf/fattura_36.pdf', '2025-10-23 09:43:52', 1),
(37, '#202025', 43, 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', NULL, 'PIANO SOCIAL BASIC PER VALEDENT MESE DI NOVEMBRE 2025', 'PIANO SOCIAL MEDIA DESIGN PER MESE DI NOVEMBRE 2025', 1.00, 249.00, 249.00, 0.00, 0.00, 249.00, '2025-10-27', '2025-11-03', 15, 'pagata', '2025-10-30', 'Bonifico Bancario', NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL’ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-10-27 15:53:15', '2025-11-04 14:04:00', '/modules/fatture/pdf/fattura_37.pdf', '2025-11-04 14:04:00', 1),
(38, '#212025', 56, 'PagheSolution', 'VIA FRANCESCO CARMAGNOLA 32 - 37135 VERONA', 'IT04685780233', NULL, 'Implementazioni design e sviluppo back-end per paghesolution.it', 'Implementazione menu responsive; creazione pagine dedicate Servizi, Chi siamo, Blog, Dettaglio Blog; aggiunta sistema per gestione autonoma del blog; gestione SEO e posizionamento su Google', 1.00, 300.00, 300.00, 0.00, 0.00, 300.00, '2025-11-04', '2025-11-19', 15, 'pagata', '2025-11-17', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3, '2025-11-04 14:02:08', '2025-11-18 09:10:34', '/modules/fatture/pdf/fattura_38.pdf', '2025-11-04 14:04:59', 1),
(39, '#222025', 36, 'Tecnorete Villafranca', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'SOCIAL MEDIA MANAGEMENT - MESE DI NOVEMBRE 2025', 'GESTIONE SOCIAL MEDIA PER 2 PROFILI', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-11-10', '2025-11-14', 15, 'pagata', '2025-11-17', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-11-10 14:55:13', '2025-12-10 13:56:40', '/modules/fatture/pdf/fattura_39.pdf', '2025-12-10 13:56:40', 1),
(40, '#232025', 94, 'Industriale Cremona SRL', 'CORSO VITTORIO EMANUELE II 13 - 26100 - CREMONA (CR)', 'IT01765290190', NULL, 'Social Media Management - mese di Novembre 2025 + 2 Shooting', 'SOCIAL MEDIA 2 PROFILI + 2 SHOOTING FOTO/VIDEO', 1.00, 565.00, 565.00, 0.00, 0.00, 565.00, '2025-11-11', '2025-11-18', 15, 'pagata', '2025-11-13', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-11-11 10:18:24', '2025-12-10 13:55:27', '/modules/fatture/pdf/fattura_40.pdf', '2025-12-10 13:55:27', 1),
(41, '#242025', 43, 'ValeDent (Serimedical S.R.L.)', 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', '04559200235', NULL, 'Gestione profilo social di ValeDent - mese di dicembre 2025', 'Gestione profili Instagram e Facebook ValeDent - mese di dicembre 2025', 1.00, 249.00, 249.00, 0.00, 0.00, 249.00, '2025-11-28', '2025-12-13', 15, 'pagata', '2025-12-05', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3, '2025-11-28 10:01:44', '2025-12-06 09:54:08', '/modules/fatture/pdf/fattura_41.pdf', '2025-12-01 16:29:02', 1),
(42, '#252025', 125, 'Studio Bardolino SRL (Pietro Oltramari)', 'Via Marconi, 32 37011 Bardolino (VR)', 'IT05103220231', NULL, 'Avvio e gestione profili Instagram e Facebook per Tecnocasa Bardolino - mese di dicembre 2025', 'Avvio e gestione dei profili Instagram e Facebook; Strategia iniziale e analisi dei competitor; Creazione post statici e contenuti foto/video', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-11-28', '2025-12-13', 15, 'pagata', '2025-12-10', NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 3, '2025-11-28 10:04:00', '2025-12-12 10:13:33', '/modules/fatture/pdf/fattura_42.pdf', '2025-12-12 10:13:33', 1),
(43, '#262025', 94, 'Industriale Cremona SRL (Nicola Gervasi)', 'CORSO VITTORIO EMANUELE II 13 - 26100 - CREMONA (CR)', 'IT01765290190', NULL, 'Social Media Management - mese di Dicembre 2025', 'SOCIAL MEDIA 2 PROFILI', 1.00, 365.00, 365.00, 0.00, 0.00, 365.00, '2025-12-10', '2025-12-25', 15, 'emessa', NULL, NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-12-10 13:56:29', '2025-12-12 14:28:40', '/modules/fatture/pdf/fattura_43.pdf', '2025-12-12 14:28:40', 1),
(44, '#272025', 36, 'Immobiliare Villafranca SRL (Alexandru Adam)', 'Via Pace 45 - 37069 Villafranca VR\r\nPiazza Roma, 23, 37066 Sommacampagna VR', '04558700235', NULL, 'SOCIAL MEDIA MANAGEMENT - MESE DI DICEMBRE 2025', 'GESTIONE SOCIAL MEDIA PER 2 PROFILI', 1.00, 469.00, 469.00, 0.00, 0.00, 469.00, '2025-12-10', '2025-12-25', 15, 'emessa', NULL, NULL, NULL, 'IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL&amp;#039;ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\r\n\r\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.', 2, '2025-12-10 13:57:41', '2025-12-10 14:01:04', '/modules/fatture/pdf/fattura_44.pdf', '2025-12-10 14:01:04', 1);

--
-- Trigger `fatture`
--
DELIMITER $$
CREATE TRIGGER `after_invoice_paid` AFTER UPDATE ON `fatture` FOR EACH ROW BEGIN
    
    IF NEW.status = 'pagata' AND OLD.status != 'pagata' THEN
        
        IF NOT EXISTS (SELECT 1 FROM finance_transactions WHERE invoice_id = NEW.id) THEN
            
            INSERT INTO finance_transactions (
                type,
                category_id,
                amount,
                date,
                description,
                source,
                payment_method_id,
                invoice_id,
                created_by,
                created_at
            ) VALUES (
                'income',
                IFNULL((SELECT id FROM finance_categories WHERE name = 'Fatture Clienti' AND type = 'income' LIMIT 1), 1),
                NEW.totale,
                IFNULL(NEW.data_pagamento, NEW.data_fattura),
                CONCAT('Fattura ', NEW.numero_fattura, ' - ', SUBSTRING(NEW.oggetto, 1, 200)),
                NEW.client_name,
                IFNULL(
                    (SELECT id FROM finance_payment_methods WHERE name = NEW.metodo_pagamento LIMIT 1),
                    (SELECT id FROM finance_payment_methods WHERE name = 'Bonifico Bancario' LIMIT 1)
                ),
                NEW.id,
                NEW.created_by,
                NOW()
            );
        END IF;
    END IF;
END
$$
DELIMITER ;

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `fatture`
--
ALTER TABLE `fatture`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_numero_fattura` (`numero_fattura`),
  ADD KEY `idx_client_id` (`client_id`),
  ADD KEY `idx_data_fattura` (`data_fattura`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_fatture_numero` (`numero_fattura`),
  ADD KEY `idx_fatture_client` (`client_name`(100)),
  ADD KEY `idx_fatture_oggetto` (`oggetto`(100)),
  ADD KEY `idx_fatture_period` (`data_fattura`,`status`),
  ADD KEY `idx_fatture_scadenze` (`data_scadenza`,`status`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `fatture`
--
ALTER TABLE `fatture`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `fatture`
--
ALTER TABLE `fatture`
  ADD CONSTRAINT `fatture_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `leads_contacts` (`id`),
  ADD CONSTRAINT `fatture_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Creato il: Dic 18, 2025 alle 11:55
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
-- Struttura della tabella `leads_funnel`
--

CREATE TABLE `leads_funnel` (
  `id` int(11) NOT NULL,
  `nome_cliente` varchar(255) NOT NULL,
  `contact_id` int(11) DEFAULT NULL,
  `servizio` varchar(255) NOT NULL,
  `somma_lavoro` decimal(10,2) NOT NULL DEFAULT 0.00,
  `colonna` enum('da_contattare','contattati','chiusi','persi') NOT NULL DEFAULT 'da_contattare',
  `posizione` int(11) NOT NULL DEFAULT 0,
  `descrizione` text DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `data_contatto` datetime DEFAULT NULL,
  `data_chiusura` datetime DEFAULT NULL,
  `motivo_perdita` text DEFAULT NULL,
  `priorita` enum('alta','media','bassa') NOT NULL DEFAULT 'media',
  `fonte` varchar(100) DEFAULT NULL COMMENT 'Fonte del lead (web, telefono, referral, etc)',
  `note` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dump dei dati per la tabella `leads_funnel`
--

INSERT INTO `leads_funnel` (`id`, `nome_cliente`, `contact_id`, `servizio`, `somma_lavoro`, `colonna`, `posizione`, `descrizione`, `telefono`, `email`, `data_contatto`, `data_chiusura`, `motivo_perdita`, `priorita`, `fonte`, `note`, `created_by`, `assigned_to`, `created_at`, `updated_at`) VALUES
(20, 'Tecnorete Villafranca', 36, 'Gestione Social', 5628.00, 'chiusi', 1, NULL, NULL, NULL, NULL, NULL, NULL, 'media', 'passaparola', NULL, 2, NULL, '2025-08-06 20:07:34', '2025-08-06 20:07:34'),
(21, 'Cheese Break Bistrot', 45, 'Brand Boost', 1.00, 'persi', 13, 'Contattati via mail. Alcuna risposta. Possibilità: menù, brochure, biglietti e web/social', NULL, NULL, NULL, NULL, NULL, 'media', 'evento', NULL, 2, NULL, '2025-08-06 20:14:29', '2025-09-26 14:16:06'),
(22, 'Mia Forniture', 46, 'Gestione Social + Naming', 1.00, 'contattati', 1, NULL, NULL, NULL, '2025-07-24 00:00:00', NULL, NULL, 'media', 'passaparola', 'In attesa di conferma preventivo. Rimandato a settembre.', 2, NULL, '2025-08-07 16:37:51', '2025-09-26 14:15:37'),
(23, 'Agenzia Immobiliare Santa Croce', 48, 'Social Media, Creazione Brand', 3750.00, 'persi', 1, NULL, NULL, NULL, NULL, NULL, 'Probabilmente si è rivolto a un altro professionista o si è arrangiato; molto indeciso', 'media', 'passaparola', NULL, 3, NULL, '2025-08-08 16:08:05', '2025-08-08 16:08:05'),
(24, 'Manu Creation Home', 51, 'Creazione brand', 1350.00, 'persi', 2, NULL, NULL, NULL, NULL, NULL, 'Troppo costoso per lei', 'media', 'passaparola', NULL, 3, NULL, '2025-08-08 16:08:58', '2025-08-08 16:08:58'),
(25, 'Mantovani Ittici', 49, 'Nuovo sito', 2250.00, 'persi', 3, NULL, NULL, NULL, '2025-03-10 00:00:00', NULL, 'Probabilmente non ha capito il nostro servizio, tant\'è che si è fatto il sito con ChatGPT', 'media', 'passaparola', NULL, 3, NULL, '2025-08-08 16:10:15', '2025-08-08 16:13:37'),
(26, 'Officina18', 52, 'Social Media Presence', 3950.00, 'persi', 4, NULL, NULL, NULL, NULL, NULL, 'Fa da solo', 'media', 'passaparola', NULL, 3, NULL, '2025-08-08 16:11:15', '2025-08-08 16:11:15'),
(27, 'Verona Green Movieland', 53, 'Social Media Presence', 6828.00, 'persi', 5, 'Perso per 500€ in meno', NULL, NULL, NULL, NULL, NULL, 'alta', 'referral', NULL, 3, NULL, '2025-08-08 16:11:57', '2025-08-08 16:11:57'),
(28, 'Tecnorete Pedemonte', 47, 'Social Media Presence', 2356.00, 'persi', 6, NULL, NULL, NULL, '2025-05-19 00:00:00', NULL, 'Voleva lo stesso prezzo di Villafranca', 'media', 'referral', NULL, 3, NULL, '2025-08-08 16:13:03', '2025-08-08 16:13:25'),
(29, 'Tecnocasa Padova Guizza', 54, 'Social Media Presence', 2356.00, 'persi', 7, NULL, NULL, NULL, NULL, NULL, 'Non sappiamo di preciso, sono spariti', 'alta', 'referral', NULL, 3, NULL, '2025-08-08 16:14:27', '2025-08-08 16:14:27'),
(30, 'Zephyra', 55, 'Brand Identity e Web Design', 5900.00, 'persi', 8, NULL, NULL, NULL, NULL, NULL, 'Sparito', 'alta', 'web', NULL, 3, NULL, '2025-08-08 16:15:10', '2025-08-08 16:15:10'),
(31, 'PagheSolution', 56, 'Logo redesign, web design e social media', 2300.00, 'chiusi', 2, NULL, NULL, 'info@paghesolution.it', NULL, '2025-02-17 00:00:00', NULL, 'media', 'passaparola', NULL, 3, NULL, '2025-08-08 16:19:17', '2025-12-10 13:58:22'),
(32, 'ValeDent (Serimedical S.R.L.)', 43, 'Social Media Presence', 3152.00, 'chiusi', 3, NULL, NULL, NULL, NULL, NULL, NULL, 'bassa', 'passaparola', NULL, 3, NULL, '2025-08-08 16:20:50', '2025-08-08 16:20:50'),
(33, 'Alessandro Acquaviva', 57, 'Logo design', 690.00, 'chiusi', 4, NULL, NULL, NULL, NULL, NULL, NULL, 'bassa', 'referral', NULL, 3, NULL, '2025-08-08 16:22:56', '2025-08-08 16:22:56'),
(34, 'Marco Frezza', 58, 'Costruzione webapp e brand identity', 5000.00, 'chiusi', 5, NULL, NULL, NULL, NULL, NULL, NULL, 'alta', 'referral', NULL, 3, NULL, '2025-08-08 16:25:12', '2025-08-08 16:25:12'),
(35, 'Marco Frezza', 58, 'Sviluppo webapp', 4950.00, 'persi', 9, NULL, NULL, NULL, NULL, NULL, 'Probabilmente ha finito i soldi', 'alta', 'referral', NULL, 3, NULL, '2025-08-08 16:25:55', '2025-08-08 16:25:55'),
(36, 'Tecnorete Bussolengo', 60, 'Social Media Presence', 7788.00, 'persi', 10, NULL, NULL, NULL, '2025-08-21 00:00:00', NULL, 'Pacchetto troppo oneroso.', 'bassa', 'referral', 'Non hanno i costi del progetto ben chiari e preferiscono per il momento lasciare in stand-by.', 3, NULL, '2025-08-29 15:33:24', '2025-08-29 15:35:21'),
(37, 'Nicoletta Sartori (Mary Joans Apartment)', 66, 'Creazione Sito Web', 2190.00, 'persi', 11, 'Non ha budget', NULL, NULL, NULL, NULL, NULL, 'alta', 'passaparola', NULL, 2, NULL, '2025-09-22 14:48:32', '2025-09-22 14:48:39'),
(38, 'Immobiliare Vigasio S.R.L. (Giacomo Visciglia)', 73, 'Shooting video per social', 229.00, 'persi', 12, NULL, NULL, NULL, '2025-09-22 00:00:00', NULL, NULL, 'media', 'referral', NULL, 3, NULL, '2025-09-22 15:36:45', '2025-09-26 14:15:53'),
(39, 'ValeDent (Serimedical S.R.L.)', 43, 'Presenza online e offline', 1300.00, 'chiusi', 6, 'Proposta di avanzamento della comunicazione online e offline di ValeDent con un percorso di 4 mesi.', NULL, 'irene.amorelli@serimedical.it', '2025-09-17 00:00:00', '2025-09-30 13:42:02', NULL, 'media', 'passaparola', NULL, 3, NULL, '2025-09-22 15:38:49', '2025-09-30 13:42:02'),
(40, 'The soda jerk', 75, 'Social + sito', 1.00, 'da_contattare', 1, 'Il profilo Instagram non è curato e il sito è vecchio. Andrebbe rifatta una Brand Identity completa. Uno dei 500 top bar del 2024 al mondo', NULL, NULL, NULL, NULL, NULL, 'alta', 'web', NULL, 2, NULL, '2025-09-23 15:39:29', '2025-09-26 14:16:06'),
(41, 'FRZ Lab', 76, 'Brand identity completa + Social + SIto', 1.00, 'da_contattare', 2, 'Lavorano molto male a livello comunicativo. Sarebbe da andare fisicamente. Verificare anche menù ecc', NULL, NULL, NULL, NULL, NULL, 'media', 'referral', NULL, 2, NULL, '2025-09-23 15:41:55', '2025-09-26 14:16:06'),
(42, 'White Monkey', 77, 'Gestione Social + Sito + Brand leggero', 1.00, 'persi', 14, 'Hanno potenzialità perché fanno tanti eventi', NULL, NULL, NULL, NULL, NULL, 'alta', 'referral', NULL, 2, NULL, '2025-09-23 15:42:55', '2025-09-26 14:16:10'),
(43, 'L\'Alchimista', 78, 'SIto web e social', 1.00, 'da_contattare', 3, 'Molto famoso ma scarso sulla comunicazione. Passerei di persona', NULL, NULL, NULL, NULL, NULL, 'alta', 'social', 'Corso porta nuova 73', 2, NULL, '2025-09-23 15:44:51', '2025-09-26 14:16:10'),
(44, 'Fluxin Shop', 79, 'Sito web + Social media', 1.00, 'da_contattare', 4, 'Progetto molto interessante. Sono a Lugagnano', NULL, NULL, NULL, NULL, NULL, 'alta', 'web', NULL, 2, NULL, '2025-09-23 15:46:25', '2025-09-26 14:16:10'),
(45, 'Officina VR', 80, 'Sito web', 1.00, 'da_contattare', 5, 'Da rifare il sito', NULL, NULL, NULL, NULL, NULL, 'media', 'web', NULL, 2, NULL, '2025-09-23 15:53:08', '2025-09-26 14:16:10'),
(47, 'DETAILING GARAGE', 82, 'Sito web + marketing', 1.00, 'contattati', 2, 'Sono interessati, ma lo ho beccato in un brutto momento quindi mi ricontatterà lui domani.', NULL, NULL, '2025-09-29 00:00:00', NULL, NULL, 'alta', 'web', NULL, 2, NULL, '2025-09-23 15:59:29', '2025-11-25 16:18:18'),
(48, 'Pikko gelateria', 83, 'Sito web + social', 1.00, 'da_contattare', 6, 'Potenziale perché è buona', NULL, NULL, NULL, NULL, NULL, 'alta', 'passaparola', NULL, 2, NULL, '2025-09-23 16:00:50', '2025-09-29 13:46:51'),
(49, 'Gelateria California', 85, 'Social + sito', 1.00, 'da_contattare', 7, NULL, NULL, NULL, NULL, NULL, NULL, 'media', 'web', 'I social probabilmente se li seguono da soli, il sito è pure peggio.\r\nHanno 3 gelaterie (Pescantina, Bussolengo, Negrar) però è tutto gestito amatorialmente. Peccato.', 3, NULL, '2025-09-25 09:01:07', '2025-09-29 13:46:51'),
(50, 'Dottor Kamal', 86, 'Cartellonistica + pubblicità', 1.00, 'da_contattare', 12, 'Centro di chirurgia estetica a Sommacampagna', NULL, NULL, '2025-10-02 00:00:00', NULL, NULL, 'bassa', 'referral', 'Contattato, attualmente non interessato ma possibile cliente con l\'anno nuovo.', 2, NULL, '2025-09-25 19:54:15', '2025-10-06 15:20:51'),
(51, 'Relais Rossar', 89, 'Social Media', 1.00, 'da_contattare', 8, 'Gestione social media', NULL, NULL, NULL, NULL, NULL, 'media', 'web', 'Sito fatto da Webmotion davvero fighissimo, ma social gestiti male e con AI', 3, NULL, '2025-09-30 13:56:39', '2025-10-06 15:14:59'),
(52, 'greenvillegraficaestampa', 90, 'Nuovo sito', 1.00, 'da_contattare', 9, NULL, NULL, NULL, NULL, NULL, NULL, 'media', 'web', NULL, 2, NULL, '2025-09-30 13:58:21', '2025-10-06 15:14:59'),
(54, 'ValpoStay', 92, 'Brand Identity Full', 1450.00, 'chiusi', 8, 'Creare un portale che riunisca le strutture ricettive, le cantine, gli eventi e le cose da fare in Valpolicella.', NULL, NULL, '2025-09-30 00:00:00', '2025-10-02 08:47:37', NULL, 'alta', 'passaparola', NULL, 3, NULL, '2025-09-30 15:14:08', '2025-10-02 08:47:37'),
(55, 'Industriale Cremona SRL', 94, 'Social Media Presence', 2500.00, 'chiusi', 7, 'Gestione Instagram e Facebook Tecnocasa Impresa Cremona.', '3338772840', NULL, '2025-10-01 00:00:00', '2025-10-02 08:47:05', NULL, 'media', 'referral', NULL, 3, NULL, '2025-10-01 15:25:35', '2025-10-02 08:47:05'),
(56, 'Immobiliare Zenorini', 95, 'Rifacimento Sito Web', 1.00, 'da_contattare', 10, 'Sito molto vecchio ma hanno soldi. Costruiscono case e fatturato supera i 250k', NULL, NULL, NULL, NULL, NULL, 'alta', 'web', 'contattati, i responsabili sono impegnati in degli interventi quindi tra un paio di giorni li contatto a questo numero. 045 8580688', 2, NULL, '2025-10-01 18:02:20', '2025-10-06 15:43:27'),
(57, 'Principe di Ragada', 98, 'Brand, sito e social', 1.00, 'da_contattare', 11, 'Sartoria di alto livello a Sirmione. Hanno un brand piuttosto debole ma tantissime potenzialità per trasformarlo in qualcosa di premium ed esclusivo.', NULL, NULL, NULL, NULL, NULL, 'media', 'altro', 'Si potrebbe fare il brand \"pro bono\" e poi proporglielo, probabilmente non hanno grossi budget a disposizione ma sarebbe fighissimo lavorarci.', 3, NULL, '2025-10-04 16:25:01', '2025-10-06 15:14:59'),
(58, 'La Stueta', 99, 'Sito web, menù, social', 1.00, 'contattati', 3, 'Ristorante in centro, hanno bisogno di un sito web e di agenzia che segua instagram con piano editoriale, rifaccia i menù e non hanno un sito web', NULL, NULL, '2025-10-06 00:00:00', NULL, NULL, 'alta', 'referral', 'contattato questa mattina, ho fissato un incontro al ristorante per questa sera.', 11, NULL, '2025-10-06 15:11:36', '2025-11-25 16:18:18'),
(59, 'Glow Chic', 100, 'Social + sito', 1600.00, 'contattati', 4, 'Creare un preventivo per la gestione dei social + un sito web monopagina', NULL, NULL, '2025-10-09 00:00:00', NULL, NULL, 'media', 'altro', NULL, 3, NULL, '2025-10-09 10:06:57', '2025-11-25 16:18:18'),
(60, 'Bigger Burger', 106, 'Sito web', 1.00, 'da_contattare', 13, NULL, NULL, NULL, NULL, NULL, NULL, 'media', 'altro', 'Hanno un gran bel brand e sono seguiti sui social ma hanno un sito fatto con Eatbu.', 3, NULL, '2025-10-12 17:14:05', '2025-10-12 17:14:05'),
(61, 'Palma ADV', 111, 'Sito Web', 1.00, 'contattati', 5, 'Sito pessimo, buon fatturato.', NULL, NULL, '2025-10-20 15:25:29', NULL, NULL, 'alta', 'web', 'https://www.palmapubblicitacinema.it/', 2, NULL, '2025-10-19 19:25:26', '2025-11-25 16:18:18'),
(62, 'Fondazione de carneri', 107, 'Sito web', 3450.00, 'persi', 15, NULL, NULL, NULL, '2025-10-15 00:00:00', NULL, 'Aspettano nuovo bando.', 'alta', 'passaparola', NULL, 3, NULL, '2025-10-22 20:41:55', '2025-11-04 17:06:52'),
(63, 'Studio Bardolino SRL (Pietro Oltramari)', 125, 'Gestione Social', 1970.00, 'chiusi', 9, NULL, NULL, NULL, NULL, NULL, NULL, 'media', 'passaparola', NULL, 2, NULL, '2025-11-25 15:13:38', '2025-11-25 15:13:38');

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `leads_funnel`
--
ALTER TABLE `leads_funnel`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_colonna` (`colonna`),
  ADD KEY `idx_posizione` (`posizione`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_assigned_to` (`assigned_to`),
  ADD KEY `idx_somma_lavoro` (`somma_lavoro`),
  ADD KEY `idx_contact_id` (`contact_id`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `leads_funnel`
--
ALTER TABLE `leads_funnel`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `leads_funnel`
--
ALTER TABLE `leads_funnel`
  ADD CONSTRAINT `leads_funnel_contact_fk` FOREIGN KEY (`contact_id`) REFERENCES `leads_contacts` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `leads_funnel_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `leads_funnel_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

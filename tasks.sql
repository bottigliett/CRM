-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Creato il: Dic 24, 2025 alle 16:04
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
-- Struttura della tabella `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `assigned_to` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `priority` enum('P1','P2','P3') DEFAULT 'P2',
  `status` enum('todo','in_progress','pending','completed') DEFAULT 'todo',
  `deadline` date NOT NULL,
  `estimated_hours` decimal(5,2) DEFAULT 0.00,
  `actual_hours` decimal(5,2) DEFAULT 0.00,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  `visible_to_client` tinyint(1) DEFAULT 1 COMMENT 'Se visibile al cliente nella dashboard',
  `is_archived` tinyint(1) DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `archived_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `tasks`
--

INSERT INTO `tasks` (`id`, `title`, `description`, `client_id`, `category_id`, `assigned_to`, `created_by`, `priority`, `status`, `deadline`, `estimated_hours`, `actual_hours`, `completed_at`, `created_at`, `updated_at`, `updated_by`, `visible_to_client`, `is_archived`, `archived_at`, `archived_by`) VALUES
(10, 'Presentazione per Tecnorete/Tecnocasa', '', NULL, 5, 3, 3, 'P1', 'completed', '2025-08-05', 120.00, 0.00, '2025-08-05 15:31:28', '2025-08-03 15:15:04', '2025-08-05 15:31:28', NULL, 1, 0, NULL, NULL),
(11, 'CED settembre', '', 36, 7, 3, 3, 'P1', 'completed', '2025-08-22', 90.00, 0.00, '2025-08-24 14:58:45', '2025-08-03 15:15:59', '2025-08-24 14:58:45', NULL, 1, 0, NULL, NULL),
(12, 'Newsletter Random Stuff', '', NULL, 1, 3, 3, 'P3', 'completed', '2025-08-04', 30.00, 0.00, '2025-08-04 16:26:17', '2025-08-03 15:16:26', '2025-08-04 16:26:17', NULL, 1, 0, NULL, NULL),
(13, 'Casi studio clienti da mettere sul sito', '', NULL, 5, 3, 3, 'P1', 'completed', '2025-08-13', 4.00, 0.00, '2025-08-11 16:09:00', '2025-08-03 15:16:55', '2025-08-11 16:09:00', NULL, 1, 0, NULL, NULL),
(14, 'Strategia per Frilens', '', NULL, 5, 3, 3, 'P1', 'completed', '2025-08-06', 3.00, 0.00, '2025-08-06 15:29:11', '2025-08-03 15:17:25', '2025-08-06 15:29:11', NULL, 1, 0, NULL, NULL),
(16, 'Scrivere a Irene per recensione', '', NULL, 7, 3, 3, 'P3', 'completed', '2025-08-08', 10.00, 0.00, '2025-08-04 14:13:27', '2025-08-03 15:18:32', '2025-08-04 14:13:27', NULL, 1, 0, NULL, NULL),
(21, 'Inviare fattura agosto Tecnorete', '', NULL, 3, 2, 3, 'P1', 'completed', '2025-08-06', 10.00, 0.00, '2025-08-06 15:29:30', '2025-08-05 15:33:02', '2025-08-06 15:29:30', NULL, 1, 0, NULL, NULL),
(22, 'Mockup Portale', 'Inclusa pagina di Login', NULL, 4, 3, 2, 'P1', 'completed', '2025-08-14', 120.00, 0.00, '2025-08-16 14:23:57', '2025-08-06 16:03:57', '2025-08-16 14:23:57', NULL, 1, 0, NULL, NULL),
(23, 'Creazione nuova proposta', 'Creazione nuova proposta, da integrare con il nuovo portale', NULL, 4, 3, 2, 'P1', 'completed', '2025-09-02', 120.00, 0.00, '2025-09-03 09:35:42', '2025-08-06 16:04:58', '2025-09-03 09:35:42', NULL, 1, 0, NULL, NULL),
(25, 'Newsletter Sans-Titre mercoledì', '', NULL, 1, 3, 3, 'P2', 'completed', '2025-08-19', 30.00, 0.00, '2025-08-18 13:09:07', '2025-08-11 09:55:57', '2025-08-18 13:09:07', NULL, 1, 0, NULL, NULL),
(27, 'Post Produzione Reel', '', 36, 1, 2, 2, 'P2', 'completed', '2025-08-13', 30.00, 0.00, '2025-08-13 13:40:26', '2025-08-13 13:40:26', '2025-08-13 13:40:26', NULL, 1, 0, NULL, NULL),
(28, 'Fix - Stampa fatture', '', NULL, 4, 2, 2, 'P2', 'completed', '2025-08-13', 60.00, 0.00, '2025-08-13 15:09:22', '2025-08-13 15:09:22', '2025-08-13 15:09:22', NULL, 1, 0, NULL, NULL),
(29, 'Contattare Studio Squarzoni', '', 59, 3, 2, 2, 'P1', 'completed', '2025-08-13', 5.00, 0.00, '2025-08-13 15:23:57', '2025-08-13 15:18:27', '2025-08-13 15:23:57', NULL, 1, 0, NULL, NULL),
(30, 'Favicon Portale', '', NULL, 2, 3, 2, 'P2', 'completed', '2025-08-14', 15.00, 0.00, '2025-08-14 15:22:43', '2025-08-14 10:36:02', '2025-08-14 15:22:43', NULL, 1, 0, NULL, NULL),
(31, 'CED ValeDent settembre-ottobre', '', 43, 1, 3, 3, 'P1', 'completed', '2025-08-22', 240.00, 0.00, '2025-08-19 09:32:40', '2025-08-16 14:24:27', '2025-08-19 09:32:40', NULL, 1, 0, NULL, NULL),
(33, 'Preparare post per settembre-ottobre', '', 43, 1, 3, 3, 'P1', 'completed', '2025-08-25', 180.00, 0.00, '2025-08-24 17:15:00', '2025-08-19 09:33:08', '2025-08-24 17:15:00', NULL, 1, 0, NULL, NULL),
(38, 'Biglietti da visita MISMO', '', NULL, 2, 2, 2, 'P1', 'completed', '2025-08-27', 30.00, 0.00, '2025-08-27 14:03:32', '2025-08-20 16:34:40', '2025-08-27 14:03:32', NULL, 1, 0, NULL, NULL),
(39, 'Sponsorizzare \"Il potere dell\'home staging\"', 'Sponsorizzare 50', 36, 1, 2, 2, 'P2', 'completed', '2025-08-22', 0.00, 0.00, '2025-08-23 09:58:21', '2025-08-21 14:58:50', '2025-08-23 09:58:21', NULL, 1, 0, NULL, NULL),
(40, 'Contattare Copisteria', '', NULL, 3, 2, 2, 'P1', 'completed', '2025-08-25', 5.00, 0.00, '2025-08-25 14:19:20', '2025-08-25 14:19:20', '2025-08-25 14:19:20', NULL, 1, 0, NULL, NULL),
(41, 'Prova', '', 57, 2, 2, 2, 'P2', 'completed', '2025-08-25', 0.00, 0.00, '2025-08-25 15:38:07', '2025-08-25 15:37:30', '2025-11-04 17:12:01', NULL, 1, 1, '2025-11-04 17:12:01', 2),
(42, 'Test prova', '', 49, 3, 3, 3, 'P1', 'completed', '2025-08-25', 0.00, 0.00, '2025-08-25 15:40:12', '2025-08-25 15:39:46', '2025-11-04 17:11:51', NULL, 1, 1, '2025-11-04 17:11:51', 2),
(43, 'Chiedere recensioni - MC - Ale e Tommy - Acquaviva', '', NULL, 3, 2, 2, 'P2', 'completed', '2025-09-02', 25.00, 0.00, '2025-09-17 10:58:09', '2025-08-26 23:40:21', '2025-09-17 10:58:09', NULL, 1, 0, NULL, NULL),
(44, 'Registrazione Marchio MISMO', '', NULL, 3, 2, 2, 'P3', 'completed', '2025-09-11', 0.00, 0.00, '2025-09-12 12:56:47', '2025-08-26 23:44:23', '2025-09-12 12:56:47', NULL, 1, 0, NULL, NULL),
(47, 'Sistemazione Stile e CSS preventivo.php', '', NULL, 2, 2, 2, 'P1', 'completed', '2025-09-18', 180.00, 0.00, '2025-09-22 15:26:55', '2025-09-01 16:36:04', '2025-09-22 15:26:55', NULL, 1, 0, NULL, NULL),
(49, 'Sistemazione link ai form Google', '', 56, 3, 3, 3, 'P1', 'completed', '2025-09-04', 45.00, 0.00, '2025-09-04 14:01:08', '2025-09-04 14:00:22', '2025-09-04 14:01:08', NULL, 1, 0, NULL, NULL),
(50, 'Controllare ADS Google Mismo', '', NULL, 5, 2, 2, 'P2', 'completed', '2025-09-12', 30.00, 0.00, '2025-09-12 15:59:57', '2025-09-12 11:44:04', '2025-09-12 15:59:57', NULL, 1, 0, NULL, NULL),
(51, 'Aggiornare cookie sotto pagine MISMO', 'Form contatto nella pagina contatti?', NULL, 4, 2, 2, 'P1', 'completed', '2025-12-04', 30.00, 0.00, '2025-12-09 17:16:04', '2025-09-13 17:19:56', '2025-12-09 17:16:04', NULL, 1, 0, NULL, NULL),
(52, 'Aggiornare parole chiave SEO MISMO', '', NULL, 4, 2, 2, 'P2', 'completed', '2025-09-15', 30.00, 0.00, '2025-09-18 14:51:01', '2025-09-13 20:14:16', '2025-09-18 14:51:01', NULL, 1, 0, NULL, NULL),
(53, 'Contattare Frezza - Vincenzo - Rossetti - Lenyn -', '', NULL, 4, 2, 2, 'P2', 'completed', '2025-09-16', 0.00, 0.00, '2025-09-17 10:58:20', '2025-09-16 08:53:47', '2025-09-17 10:58:20', NULL, 1, 0, NULL, NULL),
(55, 'Preventivo Percorso avanzamento Valedent', '', 43, 4, 2, 2, 'P1', 'completed', '2025-09-18', 60.00, 0.00, '2025-09-19 15:18:50', '2025-09-19 15:18:37', '2025-09-19 15:18:50', NULL, 1, 0, NULL, NULL),
(56, 'Chiedere copia contratto locazione', '', NULL, 3, 2, 2, 'P1', 'completed', '2025-09-23', 0.00, 0.00, '2025-09-24 10:25:41', '2025-09-23 21:21:00', '2025-09-24 10:25:41', NULL, 1, 0, NULL, NULL),
(57, 'Conferma indirizzo impresa edile', '', NULL, 4, 2, 2, 'P1', 'completed', '2025-09-23', 0.00, 0.00, '2025-09-26 13:32:50', '2025-09-23 21:21:13', '2025-09-26 13:32:50', NULL, 1, 0, NULL, NULL),
(58, 'Lavorare ad un pre load SERIO per Sito Mismo', 'le pagine interne hanno un caricamento infinito', NULL, 4, 3, 2, 'P3', 'pending', '2025-10-06', 120.00, 0.00, NULL, '2025-09-25 22:03:31', '2025-11-19 16:48:52', NULL, 1, 0, NULL, NULL),
(59, 'Rispondere ad irene', '', NULL, 3, 2, 2, 'P2', 'completed', '2025-09-29', 0.00, 0.00, '2025-09-30 13:35:54', '2025-09-29 15:56:53', '2025-09-30 13:35:54', NULL, 1, 0, NULL, NULL),
(60, 'Piano corretto per Luca', '', NULL, 3, 2, 2, 'P2', 'pending', '2025-10-01', 0.00, 0.00, NULL, '2025-09-29 15:57:47', '2025-10-30 16:26:31', NULL, 1, 0, NULL, NULL),
(61, 'Pratiche Stage Giulia', '', NULL, 3, 3, 2, 'P2', 'completed', '2025-09-29', 0.00, 0.00, '2025-09-30 09:54:48', '2025-09-29 15:58:12', '2025-09-30 09:54:48', NULL, 1, 0, NULL, NULL),
(63, 'Sentire Studio Squarzoni', '', NULL, 2, 2, 2, 'P1', 'completed', '2025-10-01', 0.00, 0.00, '2025-10-02 10:28:04', '2025-09-30 16:08:52', '2025-10-02 10:28:04', NULL, 1, 0, NULL, NULL),
(65, 'Cartelline shooting - documenti', '', NULL, 2, 2, 2, 'P2', 'todo', '2025-12-05', 60.00, 0.00, NULL, '2025-10-02 00:30:51', '2025-11-28 11:39:55', NULL, 1, 0, NULL, NULL),
(66, 'Gadget base per contratto Mismo', '', NULL, 2, 3, 2, 'P3', 'pending', '2025-10-03', 0.00, 0.00, NULL, '2025-10-02 00:31:19', '2025-11-19 16:48:58', NULL, 1, 0, NULL, NULL),
(67, 'Sentire la Giulia per Cremona', '', NULL, 3, 2, 2, 'P2', 'completed', '2025-10-03', 0.00, 0.00, '2025-10-06 16:06:09', '2025-10-02 10:19:04', '2025-10-06 16:06:09', NULL, 1, 0, NULL, NULL),
(68, 'Chiedere alla Francesca la Caparra', '', NULL, 4, 2, 2, 'P2', 'completed', '2025-10-03', 0.00, 0.00, '2025-10-06 16:06:07', '2025-10-02 11:35:37', '2025-10-06 16:06:07', NULL, 1, 0, NULL, NULL),
(69, 'Ordinare LUCE LED', '', NULL, 4, 2, 2, 'P1', 'completed', '2025-10-03', 25.00, 0.00, '2025-10-06 13:24:17', '2025-10-02 16:57:58', '2025-10-06 13:24:17', NULL, 1, 0, NULL, NULL),
(71, 'Aggiungere label Cliente in agenda', '', NULL, 4, 2, 3, 'P1', 'completed', '2025-10-06', 15.00, 0.00, '2025-11-19 16:49:13', '2025-10-05 16:30:15', '2025-11-19 16:49:13', NULL, 1, 0, NULL, NULL),
(72, 'Creare presentazione aziendale da allegare al preventivo', '', NULL, 2, 3, 3, 'P3', 'todo', '2025-10-17', 120.00, 0.00, NULL, '2025-10-09 09:29:07', '2025-10-09 09:29:07', NULL, 1, 0, NULL, NULL),
(73, 'Sentire Paolo di Colibryx S.r.l.', '', 93, 7, 2, 2, 'P2', 'completed', '2025-10-29', 25.00, 0.00, '2025-10-30 09:19:09', '2025-10-29 16:20:43', '2025-10-30 09:19:09', NULL, 1, 0, NULL, NULL),
(75, 'Raccolta analitica PRE PARTENZA Crema e Cremona', '', 94, 1, 2, 2, 'P2', 'completed', '2025-10-31', 60.00, 0.00, '2025-11-03 14:17:20', '2025-10-30 16:26:18', '2025-11-03 14:17:20', NULL, 1, 0, NULL, NULL),
(76, 'Creazione Post Novembre 2025', '', 94, 1, 3, 2, 'P2', 'completed', '2025-11-05', 240.00, 0.00, '2025-11-03 15:40:39', '2025-10-30 16:27:24', '2025-11-03 15:40:39', NULL, 1, 0, NULL, NULL),
(77, 'Sistemazione profili Cremona e Crema', '', 94, 1, 3, 2, 'P2', 'completed', '2025-10-31', 120.00, 0.00, '2025-11-06 11:20:02', '2025-10-30 16:28:05', '2025-11-06 11:20:02', NULL, 1, 0, NULL, NULL),
(78, 'Creazione Linktree Crema e Cremona', '', 94, 7, 2, 2, 'P2', 'completed', '2025-11-03', 60.00, 0.00, '2025-11-03 15:40:25', '2025-11-03 15:40:10', '2025-11-03 15:40:25', NULL, 1, 0, NULL, NULL),
(79, 'Caricare progetti Mismo su Behance', 'PagheSolution, MC, Loki, Ali, Divino Design, ValeDent', NULL, 1, 3, 3, 'P2', 'completed', '2025-12-11', 120.00, 0.00, '2025-12-12 14:54:49', '2025-11-06 11:18:36', '2025-12-12 14:54:49', NULL, 1, 0, NULL, NULL),
(80, 'Schede tecniche per shooting 14/11', '', 94, 5, 3, 3, 'P1', 'completed', '2025-11-06', 90.00, 0.00, '2025-11-07 15:02:47', '2025-11-06 11:19:19', '2025-11-07 15:02:47', NULL, 1, 0, NULL, NULL),
(81, 'Ricerca 10-15 foto stock per blog Paghe', '', 56, 2, 3, 3, 'P1', 'completed', '2025-11-28', 60.00, 0.00, '2025-11-28 10:44:59', '2025-11-06 11:20:49', '2025-11-28 10:44:59', NULL, 1, 0, NULL, NULL),
(82, 'Modificare contatti sito, GMB, social vari', 'Sito, Instagram, Behance, GMB', NULL, 4, 2, 3, 'P1', 'in_progress', '2025-11-07', 30.00, 0.00, NULL, '2025-11-06 11:23:41', '2025-11-28 11:44:42', NULL, 1, 0, NULL, NULL),
(83, 'Creare storie sulla base dei contenuti già creati (somma)', 'Creare delle storie con sondaggi o box domande sulla base di contenuti informativi già pubblicati', 36, 1, 12, 3, 'P1', 'in_progress', '2025-12-16', 180.00, 0.00, NULL, '2025-11-06 11:25:00', '2025-12-19 09:42:48', NULL, 1, 0, NULL, NULL),
(84, 'Creare \"Seguici su Instagram\" per vetrina', '', 36, 2, 3, 3, 'P1', 'completed', '2025-11-07', 60.00, 0.00, '2025-11-11 09:46:06', '2025-11-07 15:03:28', '2025-11-11 09:46:06', NULL, 1, 0, NULL, NULL),
(85, 'Moodboard + schede tecniche pre-shooting', '', 94, 2, 12, 3, 'P1', 'completed', '2025-11-07', 120.00, 0.00, '2025-11-07 15:23:34', '2025-11-07 15:04:43', '2025-11-07 15:23:34', NULL, 1, 0, NULL, NULL),
(86, 'Rifare storie in evidenza crema e cremona', '', 94, 2, 12, 2, 'P1', 'pending', '2025-12-12', 320.00, 0.00, NULL, '2025-11-17 16:53:39', '2025-12-19 12:58:26', NULL, 1, 0, NULL, NULL),
(89, 'Sistemazione CSS mobile Paghe', '', 56, 7, 2, 2, 'P2', 'completed', '2025-11-18', 320.00, 0.00, '2025-11-24 21:22:46', '2025-11-18 16:47:19', '2025-11-24 21:22:46', NULL, 1, 0, NULL, NULL),
(90, 'Montaggio video ale', '', 36, 7, 2, 2, 'P1', 'completed', '2025-11-18', 30.00, 0.00, '2025-11-18 17:12:02', '2025-11-18 16:49:18', '2025-11-18 17:12:02', NULL, 1, 0, NULL, NULL),
(91, 'Pubblicazione Nuovo Sito PagheSolution', '', 56, 7, 2, 2, 'P1', 'completed', '2025-11-20', 60.00, 0.00, '2025-11-20 14:13:33', '2025-11-20 14:12:37', '2025-11-20 14:13:33', NULL, 1, 0, NULL, NULL),
(92, 'Foglio A3 per vetrina Tecnocasa', '', 94, 2, 3, 3, 'P2', 'todo', '2025-12-05', 90.00, 0.00, NULL, '2025-11-22 16:44:09', '2025-11-22 16:44:09', NULL, 1, 0, NULL, NULL),
(93, 'Presentazione Tutorial portale', '', NULL, 2, 3, 2, 'P2', 'completed', '2025-11-25', 0.00, 0.00, '2025-12-12 09:17:22', '2025-11-25 11:52:09', '2025-12-12 09:17:22', NULL, 1, 0, NULL, NULL),
(94, 'Mandare in stampa File copisteria', '', NULL, 2, 2, 2, 'P2', 'todo', '2025-11-26', 0.00, 0.00, NULL, '2025-11-25 11:52:30', '2025-11-25 16:24:37', NULL, 1, 0, NULL, NULL),
(95, 'Contratto + dashboard + fattura a pietro', '', NULL, 3, 2, 2, 'P2', 'completed', '2025-11-28', 0.00, 0.00, '2025-12-11 15:21:32', '2025-11-25 11:52:54', '2025-12-11 15:21:32', NULL, 1, 0, NULL, NULL),
(96, 'Ordinare arredo + bonifico giulia', '', NULL, 4, 2, 2, 'P1', 'completed', '2025-11-25', 0.00, 0.00, '2025-11-27 08:28:08', '2025-11-25 11:54:11', '2025-11-27 08:28:08', NULL, 1, 0, NULL, NULL),
(97, 'Grafiche animate x video Nicola', '', 94, 2, 12, 2, 'P2', 'completed', '2025-11-25', 60.00, 0.00, '2025-11-27 14:35:45', '2025-11-25 11:55:04', '2025-11-27 14:35:45', NULL, 1, 0, NULL, NULL),
(98, 'Sottotitoli video shooting', '', 94, 7, 2, 2, 'P1', 'completed', '2025-12-04', 180.00, 0.00, '2025-12-04 09:54:49', '2025-11-25 11:55:50', '2025-12-04 09:54:49', NULL, 1, 0, NULL, NULL),
(99, 'Contattare valedent - budget marketing', '', NULL, 4, 2, 2, 'P2', 'completed', '2025-11-26', 0.00, 0.00, '2025-12-04 09:57:33', '2025-11-25 13:32:18', '2025-12-04 09:57:33', NULL, 1, 0, NULL, NULL),
(100, 'Post produzione video', '', 94, 1, 2, 2, 'P2', 'completed', '2025-12-04', 720.00, 0.00, '2025-12-04 09:55:04', '2025-11-27 10:38:36', '2025-12-04 09:55:04', NULL, 1, 0, NULL, NULL),
(102, 'Template per catalogo whatsapp/immobili', '', 94, 2, 3, 2, 'P2', 'todo', '2025-11-28', 60.00, 0.00, NULL, '2025-11-28 11:17:24', '2025-11-28 11:17:24', NULL, 1, 0, NULL, NULL),
(103, 'Contattare copisteria + Reklam85 per preventivi', '', NULL, 4, 3, 2, 'P1', 'completed', '2025-11-28', 15.00, 0.00, '2025-12-11 15:21:22', '2025-11-28 11:39:03', '2025-12-11 15:21:22', NULL, 1, 0, NULL, NULL),
(104, 'Sistemare portale (v. note)', 'Da sistemare:\r\n- Anagrafica (dividere rubrica contatti da clienti perché attualmente sono troppi)\r\n- Fatture: aggiungere calcolo automatico trattenute (non visibile al cliente) e aggiungere wallet tasse al Finance Tracker\r\n- Sistemare task manager (vedere insieme) e dividerlo per cliente e non per status (aggiungere Mismo ai clienti) e aggiungere btn Concluso che chiude in automatico il task\r\n- Sistemare barra menu laterale\r\n- Aggiornare categorie Finance Tracker', NULL, 4, 2, 3, 'P2', 'todo', '2025-12-12', 360.00, 0.00, NULL, '2025-11-30 15:48:01', '2025-12-12 14:56:05', NULL, 1, 0, NULL, NULL),
(105, 'Bozza grafica per vetrofanie', '', NULL, 2, 3, 3, 'P1', 'completed', '2025-12-04', 90.00, 0.00, '2025-12-12 10:28:30', '2025-11-30 15:52:15', '2025-12-12 10:28:30', NULL, 1, 0, NULL, NULL),
(106, 'Creazione pagina 404 Paghe', '', 56, 7, 2, 2, 'P1', 'completed', '2025-12-01', 120.00, 0.00, '2025-12-01 16:05:26', '2025-12-01 15:33:35', '2025-12-01 16:05:26', NULL, 1, 0, NULL, NULL),
(107, 'Selezione autore nel blog', '', 56, 7, 2, 2, 'P2', 'completed', '2025-12-01', 60.00, 0.00, '2025-12-01 16:05:34', '2025-12-01 15:36:01', '2025-12-01 16:05:34', NULL, 1, 0, NULL, NULL),
(108, 'Anteprima bozze articoli', '', 56, 7, 2, 2, 'P3', 'completed', '2025-12-01', 20.00, 0.00, '2025-12-01 16:15:56', '2025-12-01 16:12:08', '2025-12-01 16:15:56', NULL, 1, 0, NULL, NULL),
(109, 'Kick-off strategy bardolino + analisi', '', 125, 7, 12, 2, 'P1', 'completed', '2025-12-09', 120.00, 0.00, '2025-12-09 11:07:43', '2025-12-04 09:56:47', '2025-12-09 11:07:43', NULL, 1, 0, NULL, NULL),
(110, 'Programmazione reel shooting novembre', '', 94, 1, 12, 12, 'P2', 'completed', '2025-12-04', 30.00, 0.00, '2025-12-04 11:36:05', '2025-12-04 11:34:44', '2025-12-04 11:36:05', NULL, 1, 0, NULL, NULL),
(111, 'Sistemare client.php portale', 'Lato grafico e durata progetto', NULL, 4, 2, 2, 'P2', 'todo', '2025-12-10', 60.00, 0.00, NULL, '2025-12-10 14:58:45', '2025-12-10 14:58:45', NULL, 1, 0, NULL, NULL),
(112, 'Grafiche + Programmazione post Tecnorete', '', 36, 1, 12, 12, 'P2', 'completed', '2025-12-11', 0.00, 0.00, '2025-12-11 16:24:36', '2025-12-11 16:20:47', '2025-12-11 16:24:36', NULL, 1, 0, NULL, NULL),
(113, 'Mettere nel preventivo pop up che vieta la condivisione', '', NULL, 4, 2, 2, 'P2', 'todo', '2025-12-12', 0.00, 0.00, NULL, '2025-12-12 08:57:57', '2025-12-12 08:57:57', NULL, 1, 0, NULL, NULL),
(114, 'Template Canva per immobili', 'Template di canva. Loro inseriscono solo foto di sfondo e caratteristiche e pubblicano su whatsapp / instagram', 94, 2, 2, 2, 'P2', 'todo', '2025-12-17', 120.00, 0.00, NULL, '2025-12-12 16:10:43', '2025-12-12 16:10:43', NULL, 1, 0, NULL, NULL),
(115, 'Storie instagram per le feste', 'per i profili di tecnorete (Somma e Villa) e tecnocasa (Crema e Cremona)', NULL, 1, 12, 12, 'P2', 'completed', '2025-12-18', 60.00, 0.00, '2025-12-18 11:53:30', '2025-12-18 09:40:07', '2025-12-18 11:53:30', NULL, 1, 0, NULL, NULL),
(116, 'Mini reel metodo di vendita', 'Mini reel per il metodo di vendita di Crema e Cremona', NULL, 1, 12, 12, 'P2', 'pending', '2025-12-19', 0.00, 0.00, NULL, '2025-12-18 09:41:14', '2025-12-19 09:41:58', NULL, 1, 0, NULL, NULL),
(117, 'Post di natale Valedent', '', NULL, 1, 12, 12, 'P1', 'completed', '2025-12-19', 0.00, 0.00, '2025-12-19 16:29:57', '2025-12-19 09:41:35', '2025-12-19 16:29:57', NULL, 1, 0, NULL, NULL),
(118, 'Programmare le storie di Tecnorete', 'programmare le storie di tecnorete e villafranca per il mese di gennaio', NULL, 1, 12, 12, 'P2', 'in_progress', '2025-12-19', 0.00, 0.00, NULL, '2025-12-19 12:58:10', '2025-12-19 12:58:10', NULL, 1, 0, NULL, NULL),
(119, 'Rifare grafica lavora con noi con stile seguici sui social', '', 94, 2, 12, 2, 'P2', 'todo', '2025-12-19', 120.00, 0.00, NULL, '2025-12-19 14:49:15', '2025-12-19 14:49:15', NULL, 1, 0, NULL, NULL),
(120, 'Storia lavora con noi con link al sito', 'Link che c\'è sulle storie di crema: https://crema1.tecnocasaimpresa.it/crema/crema/lavora-con-noi?fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGnZpG_9lhlOzxeVsmrvQG8lSeO7YsGuTdMr5FD8H26seFVNkCR0nH0uVx16AA_aem_gC4v4G0W21RM_0Vw2z35pg', 94, 2, 12, 2, 'P2', 'todo', '2025-12-19', 120.00, 0.00, NULL, '2025-12-19 15:20:23', '2025-12-19 15:20:23', NULL, 1, 0, NULL, NULL);

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_deadline` (`deadline`),
  ADD KEY `idx_assigned` (`assigned_to`),
  ADD KEY `idx_client` (`client_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_archived` (`is_archived`,`archived_at`),
  ADD KEY `fk_updated_by` (`updated_by`),
  ADD KEY `idx_client_status` (`client_id`,`status`),
  ADD KEY `idx_category_status` (`category_id`,`status`),
  ADD KEY `idx_completed_date` (`status`,`completed_at`),
  ADD KEY `idx_status_updated` (`status`,`updated_at`),
  ADD KEY `idx_status_client_category` (`status`,`client_id`,`category_id`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=121;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tasks_client_fk` FOREIGN KEY (`client_id`) REFERENCES `leads_contacts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `task_categories` (`id`),
  ADD CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

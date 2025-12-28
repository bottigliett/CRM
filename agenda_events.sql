-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Creato il: Dic 22, 2025 alle 15:43
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
-- Struttura della tabella `agenda_events`
--

CREATE TABLE `agenda_events` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `start_datetime` datetime NOT NULL,
  `end_datetime` datetime NOT NULL,
  `category_id` int(11) NOT NULL,
  `client_id` int(11) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `is_all_day` tinyint(1) DEFAULT 0,
  `status` enum('scheduled','confirmed','cancelled','completed') DEFAULT 'scheduled',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `reminder_minutes` int(11) DEFAULT 15,
  `created_by` int(11) NOT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `visible_to_client` tinyint(1) DEFAULT 1 COMMENT 'Se visibile al cliente nella dashboard'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `agenda_events`
--

INSERT INTO `agenda_events` (`id`, `title`, `description`, `start_datetime`, `end_datetime`, `category_id`, `client_id`, `location`, `is_all_day`, `status`, `priority`, `reminder_minutes`, `created_by`, `assigned_to`, `created_at`, `updated_at`, `visible_to_client`) VALUES
(88, 'Stefano non c\'è', '', '2025-08-12 09:00:00', '2025-08-12 10:00:00', 25, NULL, '', 1, 'scheduled', 'medium', 15, 3, 3, '2025-08-11 09:55:02', '2025-08-11 09:55:02', 1),
(89, 'Creazione Pagina Post_It e Media', '', '2025-08-11 09:00:00', '2025-08-11 10:00:00', 51, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-08-11 15:45:26', '2025-08-11 15:45:26', 1),
(90, 'Sistemazione Portfolio', '', '2025-08-11 00:00:00', '2025-08-11 00:00:00', 52, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-08-11 15:45:51', '2025-08-11 15:47:19', 1),
(91, 'Fix Inserimento P.IVA anagrafica', '', '2025-08-10 17:00:00', '2025-08-10 19:00:00', 51, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-11 15:46:44', '2025-08-11 15:46:44', 1),
(92, 'Incontro con JP', '', '2025-08-14 15:00:00', '2025-08-14 16:00:00', 22, NULL, '', 0, 'scheduled', 'medium', 15, 3, 3, '2025-08-13 09:41:54', '2025-08-13 09:41:54', 1),
(93, 'Fix: uscita fatture e post-it; finance tracker', '', '2025-08-13 09:00:00', '2025-08-13 10:00:00', 51, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-08-13 09:43:13', '2025-08-13 09:43:13', 1),
(94, 'Inizio brand Frilens+mockup', '', '2025-08-13 09:00:00', '2025-08-14 10:00:00', 52, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-08-13 09:45:29', '2025-08-13 09:45:29', 1),
(95, 'Finita grafica preventivo cliente', '', '2025-09-02 11:15:00', '2025-09-02 12:30:00', 51, NULL, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-08-13 09:46:03', '2025-09-02 10:44:02', 1),
(96, 'Landing page + post campagne', '', '2025-08-22 15:30:00', '2025-08-27 17:30:00', 51, NULL, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-08-13 09:46:59', '2025-08-26 16:04:55', 1),
(97, 'Sentire Ale per shooting di venerdì', '', '2025-08-27 00:00:00', '2025-08-27 00:00:00', 5, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 2, '2025-08-13 09:47:54', '2025-08-28 17:32:38', 1),
(98, 'Post-produzione reel', '', '2025-08-13 09:00:00', '2025-08-13 10:00:00', 51, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-13 09:48:26', '2025-08-13 09:48:26', 1),
(99, 'Contattare Studio Squarzoni', '', '2025-08-13 00:00:00', '2025-08-13 00:00:00', 8, 59, '', 1, 'scheduled', 'urgent', 15, 2, 2, '2025-08-13 15:21:09', '2025-08-13 15:23:35', 1),
(104, 'Fix- Finance tracker & Promemoria mail', '', '2025-08-14 10:00:00', '2025-08-14 12:30:00', 51, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-14 10:08:22', '2025-08-14 10:08:22', 1),
(105, 'Mockup Dashboard portale clienti', '', '2025-08-14 11:00:00', '2025-08-14 12:00:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-14 10:09:25', '2025-08-14 10:09:25', 1),
(106, 'CED Valedent', '', '2025-08-19 09:00:00', '2025-08-19 10:00:00', 51, 43, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-08-16 14:25:24', '2025-08-16 14:25:24', 1),
(107, 'CED Tecnorete settembre', '', '2025-08-24 00:00:00', '2025-08-24 00:00:00', 51, 36, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-08-16 14:25:59', '2025-08-24 14:58:07', 1),
(108, 'Post produzione reel Tecnorete', '', '2025-08-18 09:00:00', '2025-08-18 10:00:00', 51, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-17 15:16:47', '2025-08-17 15:16:47', 1),
(109, 'Mockup frilens', '', '2025-08-18 15:00:00', '2025-08-18 18:00:00', 52, NULL, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-18 16:32:03', '2025-08-18 16:32:14', 1),
(110, 'Post Valedent', '', '2025-08-21 09:00:00', '2025-08-19 10:00:00', 51, 43, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-19 09:36:49', '2025-08-19 09:36:49', 1),
(111, 'Creato BACKUP di emergenza PORTALE -  bks.studiomismo.it', '', '2025-08-19 15:00:00', '2025-08-19 16:30:00', 52, NULL, 'Casa', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-19 14:31:15', '2025-08-19 14:32:09', 1),
(112, 'Riunione Tecnorete Pescantina - 15:30 - Vito', 'Dopo aver visto il nuovo catalogo chiedono incontro, apparentemente interessati.', '2025-08-21 15:30:00', '2025-08-21 16:00:00', 2, 60, 'Piazzale Vittorio Veneto 97, 37012 Bussolengo Veneto, Italia', 0, 'scheduled', 'medium', 30, 2, 2, '2025-08-19 14:37:18', '2025-08-20 15:58:02', 1),
(119, 'Creazione (Admin Utenti) e Dashboard utente', '', '2025-08-19 17:00:00', '2025-08-19 21:00:00', 51, NULL, 'Casa', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-20 15:59:06', '2025-08-20 15:59:06', 1),
(120, 'Fix admin Utenti - Nuove funzioni Dashboard Cliente', '', '2025-08-20 14:30:00', '2025-08-20 18:00:00', 52, NULL, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-20 15:59:51', '2025-08-20 15:59:51', 1),
(123, 'Creazione pagina Note', '', '2025-08-22 16:00:00', '2025-08-22 17:00:00', 52, NULL, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-22 15:15:37', '2025-08-22 15:15:37', 1),
(124, 'Post ValeDent settembre-ottobre', '', '2025-08-24 00:00:00', '2025-08-24 00:00:00', 51, 43, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-22 16:03:11', '2025-08-24 17:15:19', 1),
(125, 'Struttura preventivo + dashboard cliente', '', '2025-08-23 10:00:00', '2025-08-23 11:00:00', 52, NULL, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-23 09:59:16', '2025-08-23 09:59:16', 1),
(126, 'Foto e pubblicazione poster - Vinted', '', '2025-08-23 10:00:00', '2025-08-23 12:00:00', 8, NULL, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-23 10:00:07', '2025-08-23 10:00:07', 1),
(127, 'Post Luigi', '', '2025-08-27 00:00:00', '2025-08-23 00:00:00', 51, 56, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-08-23 15:42:51', '2025-08-23 15:43:22', 1),
(128, 'Post Luigi', '', '2025-08-25 00:00:00', '2025-08-25 00:00:00', 51, 56, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-23 15:44:35', '2025-08-25 13:51:58', 1),
(129, 'Post ValeDent', '', '2025-08-27 09:00:00', '2025-08-23 10:00:00', 51, 43, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-23 15:45:07', '2025-08-23 15:45:07', 1),
(130, 'Inviati post in verifica', '', '2025-08-25 00:00:00', '2025-08-25 00:00:00', 51, 43, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-24 17:15:43', '2025-08-25 13:31:15', 1),
(131, 'Justin non c\'è', '', '2025-09-08 09:00:00', '2025-09-12 10:00:00', 25, NULL, 'Marsa alam', 1, 'scheduled', 'medium', 15, 2, 2, '2025-08-25 12:43:47', '2025-08-25 12:43:47', 1),
(132, 'Contattata copisteria per preventivo - Biglietti + Catalogo', '', '2025-08-25 16:00:00', '2025-08-25 16:10:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-25 14:20:38', '2025-08-25 14:20:38', 1),
(133, 'Incontro con Francesca Lanzini', '', '2025-09-04 11:30:00', '2025-09-04 15:00:00', 2, NULL, 'Viale Sant’Eufemia 200 - Tecnocasa Impresa', 0, 'scheduled', 'urgent', 1440, 2, 2, '2025-08-25 14:55:32', '2025-08-25 14:55:32', 1),
(134, 'Post Tecnorete settembre', '', '2025-08-26 10:00:00', '2025-08-26 15:30:00', 51, 36, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-08-25 16:33:50', '2025-08-26 15:38:21', 1),
(135, 'Programmati post Tecnorete fino al 24/09', '', '2025-08-29 15:00:00', '2025-08-29 16:00:00', 51, 36, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-08-26 13:41:40', '2025-08-29 16:30:41', 1),
(136, 'Fix CSS Task Menager', '', '2025-08-26 16:30:00', '2025-08-26 17:00:00', 52, NULL, 'Casa', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-26 15:05:48', '2025-08-26 15:06:48', 1),
(137, 'Fix Dashboard Admin - Orario Agenda', '', '2025-08-26 17:00:00', '2025-08-26 17:16:00', 52, NULL, 'Casa', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-26 15:14:44', '2025-08-26 15:14:44', 1),
(139, 'BDV Mismo', '', '2025-08-27 00:00:00', '2025-08-27 00:00:00', 51, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-26 16:04:21', '2025-08-26 16:04:29', 1),
(140, 'Programmato post 03/09', '', '2025-08-27 00:00:00', '2025-08-27 00:00:00', 51, 56, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-27 09:28:54', '2025-08-27 12:53:08', 1),
(143, 'Programmati post ValeDent fino al 22/09', '', '2025-08-29 14:45:00', '2025-08-29 15:30:00', 51, 43, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-08-27 16:01:50', '2025-08-29 16:30:29', 1),
(144, 'Stefano no eres a chi', '', '2025-08-28 00:00:00', '2025-08-28 00:00:00', 27, NULL, '', 1, 'scheduled', 'medium', 15, 2, 3, '2025-08-28 12:59:19', '2025-08-29 15:22:24', 1),
(145, 'Inizio Fix Admin utenti - pagina preventivo e nuova pagina Note', '', '2025-08-27 00:00:00', '2025-08-27 00:00:00', 52, NULL, 'Ufficio', 1, 'scheduled', 'medium', 15, 2, 2, '2025-08-28 13:01:42', '2025-08-28 13:02:38', 1),
(146, 'Chiamare Ale per organizzare nuovo shooting', '', '2025-09-02 15:00:00', '2025-09-02 15:30:00', 24, 36, '', 0, 'scheduled', 'medium', 30, 2, 3, '2025-08-28 13:34:47', '2025-09-01 16:55:05', 1),
(147, 'Fix Importante di - Admin utente - Preventivo', '', '2025-08-28 15:00:00', '2025-08-28 18:00:00', 52, NULL, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-28 14:48:24', '2025-08-28 14:48:24', 1),
(148, 'Fix Pagina Note', '', '2025-08-28 17:00:00', '2025-08-28 18:00:00', 52, NULL, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-28 14:56:02', '2025-08-28 14:56:02', 1),
(150, 'Fix problema agenda', '', '2025-08-28 18:30:00', '2025-08-28 19:30:00', 52, NULL, 'Casa', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-28 17:33:34', '2025-08-28 17:33:47', 1),
(151, 'Sentire Vittorio', '', '2025-08-29 09:00:00', '2025-08-29 10:00:00', 27, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-08-28 18:51:43', '2025-08-28 18:51:43', 1),
(152, 'Inizio Gestione Ticket', '', '2025-08-28 22:00:00', '2025-08-28 01:15:00', 52, NULL, 'Casa', 0, 'scheduled', 'medium', 15, 2, 2, '2025-08-28 22:45:45', '2025-08-28 23:16:02', 1),
(153, 'Programmati post ValeDent fino al 15/10', '', '2025-09-22 00:00:00', '2025-09-22 00:00:00', 51, 43, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-29 13:50:07', '2025-09-22 16:00:28', 1),
(154, 'CED Tecnorete ottobre', '', '2025-09-25 00:00:00', '2025-09-25 00:00:00', 51, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-29 14:34:46', '2025-09-24 14:57:42', 1),
(155, 'Ritiro Biglietti da visita', '', '2025-09-02 09:30:00', '2025-09-02 10:00:00', 22, NULL, 'ISSZ', 0, 'scheduled', 'medium', 1440, 2, 2, '2025-08-29 16:12:30', '2025-09-02 09:34:25', 1),
(156, 'Sistemato blog Mismo', '', '2025-08-29 17:30:00', '2025-08-29 18:00:00', 56, NULL, '', 0, 'scheduled', 'medium', 15, 3, 3, '2025-08-29 16:15:37', '2025-08-29 16:15:37', 1),
(157, 'Campagne social Mismo', '', '2025-09-01 09:00:00', '2025-08-02 10:00:00', 5, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-29 16:16:33', '2025-08-29 16:16:33', 1),
(158, 'Iniziare landing Mismo', '', '2025-09-01 00:00:00', '2025-09-02 00:00:00', 57, NULL, '', 1, 'scheduled', 'high', 15, 3, 2, '2025-08-29 16:22:59', '2025-09-01 14:45:49', 1),
(161, 'Fix Importante di - Admin Utenti - ticket - dashboard - fatture', '', '2025-08-29 09:00:00', '2025-08-29 10:00:00', 52, NULL, 'Ufficio', 1, 'scheduled', 'medium', 15, 2, 2, '2025-08-29 16:25:27', '2025-08-29 16:25:27', 1),
(162, 'Sistemare parte legal !!!IMPORTANTISSIMO!!!', '', '2025-09-01 09:00:00', '2025-08-01 10:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-29 16:27:57', '2025-08-29 16:27:57', 1),
(163, 'Sistemata parte Legal e Privacy Policy', '', '2025-08-31 00:00:00', '2025-08-31 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-08-29 16:29:27', '2025-08-31 14:50:03', 1),
(164, 'CED Mismo settembre', '', '2025-08-31 09:00:00', '2025-08-31 10:00:00', 5, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-08-31 17:10:06', '2025-08-31 17:10:06', 1),
(165, 'Campagne social Mismo', '', '2025-09-03 00:00:00', '2025-09-03 00:00:00', 5, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-01 12:53:37', '2025-09-02 17:00:42', 1),
(166, 'DESIGN WEEK', '', '2025-09-01 00:00:00', '2025-09-04 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 2, 2, '2025-09-01 14:45:38', '2025-09-01 14:46:40', 1),
(167, 'Landing Campagne SITO VECCHIO', '', '2025-09-02 11:00:00', '2025-09-02 13:00:00', 52, NULL, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-09-03 14:53:18', '2025-09-03 14:53:18', 1),
(168, 'Landing Campagne SITO VECCHIO', '', '2025-09-03 15:00:00', '2025-09-03 18:00:00', 52, NULL, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-09-03 14:53:43', '2025-09-03 14:53:43', 1),
(169, 'Sistemati link ai Google Form', '', '2025-09-04 15:00:00', '2025-09-04 15:45:00', 51, 56, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-09-04 14:03:14', '2025-09-04 14:03:14', 1),
(171, 'Preparare post per campagne', '', '2025-09-05 09:00:00', '2025-09-05 10:00:00', 5, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-05 09:36:56', '2025-09-05 09:36:56', 1),
(172, 'Inviata fattura settembre Tecnorete', '', '2025-09-09 00:00:00', '2025-09-09 00:00:00', 56, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-05 09:37:24', '2025-09-09 10:18:25', 1),
(173, 'Inserito caso studio ValeDent sul sito + banner cookie e form', '', '2025-09-08 00:00:00', '2025-09-08 00:00:00', 57, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-05 09:38:20', '2025-09-08 16:42:35', 1),
(174, 'Preparato post Bonus Under 35', '', '2025-09-09 00:00:00', '2025-09-09 00:00:00', 51, 56, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-08 16:43:00', '2025-09-09 10:18:14', 1),
(175, 'Contenuti social per tutta la settimana', '', '2025-09-10 00:00:00', '2025-09-10 00:00:00', 5, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-08 16:43:32', '2025-09-09 17:19:32', 1),
(176, 'Grafiche campagne + sistemare WA', '', '2025-09-10 09:00:00', '2025-09-10 10:00:00', 5, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-08 16:43:58', '2025-09-08 16:43:58', 1),
(177, 'Fix: blog, include progetti automatici nel portfolio, aggiunta area merch in blur, aggiornato footer, aggiunto btn newsletter', '', '2025-09-09 09:00:00', '2025-09-09 10:00:00', 57, NULL, '', 1, 'scheduled', 'medium', 15, 3, 3, '2025-09-09 17:20:34', '2025-09-09 17:20:34', 1),
(178, 'Preparata newsletter + post', '', '2025-09-09 09:00:00', '2025-09-09 10:00:00', 5, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-09 17:21:10', '2025-09-09 17:21:10', 1),
(179, 'Editing + programmazione reel Tommaso 11/09', '', '2025-09-10 15:00:00', '2025-09-10 15:30:00', 51, 36, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-09-10 13:26:49', '2025-09-10 13:26:49', 1),
(180, 'Preventivo Mary Joans Apartment', '', '2025-09-11 09:00:00', '2025-09-11 10:00:00', 51, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-10 16:04:25', '2025-09-10 16:04:25', 1),
(181, 'Sistemate pagine Chi siamo e Servizi', '', '2025-09-11 09:00:00', '2025-09-11 10:00:00', 57, NULL, '', 1, 'scheduled', 'medium', 15, 3, 3, '2025-09-11 16:55:19', '2025-09-11 16:55:19', 1),
(182, 'Incontro con Giulia Selmo', '', '2025-09-16 10:30:00', '2025-09-16 11:00:00', 22, NULL, 'In studio da noi', 0, 'scheduled', 'medium', 15, 3, 3, '2025-09-12 10:18:00', '2025-09-12 10:18:00', 1),
(183, 'Creazione e programmazione post 17/09', '', '2025-09-12 09:00:00', '2025-09-12 10:00:00', 51, 56, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-12 12:57:19', '2025-09-12 12:57:19', 1),
(184, 'Sistemato sito e Google ADS', '', '2025-09-12 09:00:00', '2025-09-12 10:00:00', 5, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-12 15:59:48', '2025-09-12 15:59:48', 1),
(185, 'Call Con Francesca Lanzini', '', '2025-09-18 12:30:00', '2025-09-18 13:00:00', 24, NULL, '', 0, 'scheduled', 'high', 60, 2, 3, '2025-09-13 13:59:08', '2025-09-18 10:00:03', 1),
(187, 'Pubblicate campagne MISMO', '', '2025-09-24 00:00:00', '2025-09-24 00:00:00', 5, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-14 14:20:00', '2025-09-24 14:55:54', 1),
(188, 'Inviato preventivo Mary Joans Apartment', '', '2025-09-15 00:00:00', '2025-09-15 00:00:00', 56, 66, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-14 14:20:40', '2025-09-15 13:46:05', 1),
(189, 'Sentire Ale per fissare data shooting', '', '2025-09-15 09:00:00', '2025-09-15 10:00:00', 56, 36, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-14 14:21:23', '2025-09-14 14:21:23', 1),
(190, '10:30 Riunione Valedent', '', '2025-09-17 10:30:00', '2025-09-17 11:30:00', 22, 43, 'Circonvallazione Oriani 6a', 0, 'scheduled', 'medium', 60, 2, 3, '2025-09-15 12:54:43', '2025-09-17 09:21:41', 1),
(191, 'Preparato post del 17/09 e spostato quello del 17 al 24.', '', '2025-09-15 15:45:00', '2025-09-15 16:25:00', 51, 56, '', 0, 'scheduled', 'medium', 15, 3, 3, '2025-09-15 14:23:44', '2025-09-15 14:23:44', 1),
(192, 'Richiesta nuove recensioni - MC - Acquaviva - Irene - Ale', '', '2025-09-15 09:00:00', '2025-09-15 10:00:00', 57, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-09-15 15:59:27', '2025-09-15 15:59:27', 1),
(193, 'Storie in evidenza con servizi', '', '2025-09-16 09:00:00', '2025-09-16 10:00:00', 5, NULL, '', 1, 'scheduled', 'low', 15, 3, 3, '2025-09-15 16:06:31', '2025-09-15 16:06:31', 1),
(194, 'Inizio Stage Giulia', '', '2025-11-06 00:00:00', '2025-11-06 00:00:00', 27, NULL, '', 1, 'scheduled', 'medium', 1440, 2, 3, '2025-09-16 10:27:59', '2025-11-02 17:16:59', 1),
(196, 'Inviato preventivo avanzamento ValeDent', '', '2025-09-18 00:00:00', '2025-09-18 00:00:00', 51, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-17 10:49:44', '2025-09-18 16:08:42', 1),
(199, '16:00 Justin dentista', '', '2025-09-24 16:00:00', '2025-09-24 17:00:00', 27, NULL, '', 0, 'scheduled', 'medium', 1440, 2, 2, '2025-09-18 10:13:42', '2025-09-18 10:13:42', 1),
(200, 'Aggiunta pagina Collaborazioni sul sito + casella mail dedicata', '', '2025-09-18 14:45:00', '2025-09-18 15:00:00', 57, NULL, '', 0, 'scheduled', 'low', 15, 3, 3, '2025-09-18 13:34:34', '2025-09-18 13:34:34', 1),
(202, 'Creazione blocco permessi nuovi admin', '', '2025-09-19 15:00:00', '2025-09-19 17:00:00', 52, NULL, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-09-19 15:15:36', '2025-09-19 15:15:36', 1),
(203, 'Creazione HTML pagina preventivo', '', '2025-09-18 00:00:00', '2025-09-18 00:00:00', 52, NULL, 'Ufficio', 1, 'scheduled', 'medium', 15, 2, 2, '2025-09-19 15:17:14', '2025-09-19 15:17:23', 1),
(204, 'Sistemazione bug sito e contenuti social', '', '2025-09-19 09:00:00', '2025-09-19 10:00:00', 51, NULL, '', 1, 'scheduled', 'medium', 15, 3, 3, '2025-09-19 16:00:24', '2025-09-19 16:00:24', 1),
(205, 'Sollecitato Ale per fattura scaduta', '', '2025-09-22 00:00:00', '2025-09-22 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-19 16:06:38', '2025-09-22 16:01:23', 1),
(206, 'Incontro con Luca Veronesi', '', '2025-09-22 15:00:00', '2025-09-22 16:00:00', 22, 63, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-09-19 16:07:11', '2025-09-22 16:02:04', 1),
(208, 'Inviato preventivo per shooting video Tecnocasa Vigasio', '', '2025-09-22 00:00:00', '2025-09-22 00:00:00', 56, 73, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-22 10:06:58', '2025-09-22 16:01:42', 1),
(209, 'Preventivo avanzamento MC', '', '2025-09-23 00:00:00', '2025-09-23 00:00:00', 51, 63, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-22 14:30:05', '2025-09-23 15:27:45', 1),
(211, 'Programmati post ValeDent ottobre', '', '2025-10-13 00:00:00', '2025-10-13 00:00:00', 51, 43, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-22 16:01:11', '2025-10-12 13:35:27', 1),
(212, 'Sopralluogo ufficio Pescantina', '', '2025-09-25 12:00:00', '2025-09-25 12:30:00', 56, NULL, 'Via Madonna 14 - Pescantina', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-09-23 15:28:31', '2025-09-23 15:28:31', 1),
(214, 'Visita ufficio Pescantina', '', '2025-09-23 14:30:00', '2025-09-23 15:00:00', 56, NULL, 'Via Madonna 14 - Pescantina', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-09-23 15:29:26', '2025-09-23 15:29:26', 1),
(215, 'Approccio con White Monkey', '', '2025-09-24 16:00:00', '2025-09-24 17:00:00', 2, NULL, 'Via Sant\'Egidio, 16, 37121 Verona VR', 0, 'scheduled', 'urgent', 15, 11, 11, '2025-09-24 12:13:52', '2025-09-24 12:27:10', 1),
(216, 'Approccio con Detailing Garage', '', '2025-09-24 15:30:00', '2025-09-24 16:00:00', 2, NULL, 'Via Corrobiolo, 12, 37066 Sommacampagna VR', 0, 'scheduled', 'medium', 15, 11, 11, '2025-09-24 12:18:06', '2025-09-24 12:27:03', 1),
(217, '16:00 Justin dentista', '', '2025-10-01 15:45:00', '2025-10-01 16:45:00', 27, NULL, '', 0, 'scheduled', 'medium', 30, 2, 2, '2025-09-24 14:39:40', '2025-09-30 13:40:48', 1),
(220, 'Ripubblicati post evento SW Custoza', '', '2025-09-26 00:00:00', '2025-09-26 00:00:00', 51, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-25 08:09:11', '2025-09-26 16:56:20', 1),
(221, 'Compilate e inviate pratiche stage Giulia', '', '2025-09-29 00:00:00', '2025-09-29 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-25 08:32:55', '2025-09-29 19:47:24', 1),
(222, 'Preparati post fino al 21 ottobre', '', '2025-09-26 00:00:00', '2025-09-26 00:00:00', 51, 36, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-09-26 10:07:31', '2025-09-26 16:56:34', 1),
(223, 'Incontro ufficio Pescantina', '', '2025-09-29 15:00:00', '2025-09-29 16:00:00', 2, NULL, 'Via Madonna 14 - Pescantina', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-09-26 13:17:42', '2025-09-26 13:17:42', 1),
(225, 'Fix Tempo Login', '', '2025-09-26 16:00:00', '2025-09-26 16:30:00', 52, NULL, 'Casa', 0, 'scheduled', 'medium', 15, 2, 2, '2025-09-26 14:20:49', '2025-09-26 14:20:49', 1),
(226, 'Preparati nuovi post + CED novembre + pubblicato reel', '', '2025-10-20 00:00:00', '2025-10-20 00:00:00', 51, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-26 16:57:34', '2025-10-20 15:58:06', 1),
(227, 'Shooting Tecnorete', '', '2025-10-03 15:00:00', '2025-10-03 18:00:00', 22, 36, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-09-29 10:15:41', '2025-09-29 10:15:41', 1),
(228, '14:30 Acque veronesi', '', '2025-10-02 14:30:00', '2025-10-02 15:00:00', 56, NULL, '', 0, 'scheduled', 'medium', 60, 2, 2, '2025-09-29 15:51:52', '2025-09-29 15:51:52', 1),
(229, 'Firma contratto affitto', '', '2025-09-30 14:00:00', '2025-09-30 14:30:00', 56, NULL, 'Via del Lavoro 95 - Bussolengo', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-09-29 19:48:02', '2025-09-29 19:48:02', 1),
(230, 'Preparare post', '', '2025-10-01 15:00:00', '2025-10-01 15:30:00', 51, 56, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-09-30 16:01:58', '2025-10-01 13:27:03', 1),
(231, 'Inviata fattura Irene e preventivo ValpoStay', '', '2025-09-30 09:00:00', '2025-09-30 10:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-09-30 16:09:48', '2025-09-30 16:09:48', 1),
(232, 'Call con Giulia Crestan', 'https://www.google.com/url?q=https://meet.google.com/drk-zoqo-pas&sa=D&source=calendar&usd=2&usg=AOvVaw0t7_l7fjJ_HPN6ZAyHCULd', '2025-10-02 11:00:00', '2025-10-02 11:30:00', 24, NULL, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-10-01 09:59:03', '2025-10-01 12:48:32', 1),
(233, 'Incontro con Marianna Marconi', '', '2025-09-30 09:30:00', '2025-09-30 11:00:00', 22, NULL, '', 0, 'scheduled', 'medium', 15, 3, 3, '2025-10-01 09:59:47', '2025-10-01 09:59:47', 1),
(234, 'Preparato CED novembre-dicembre', '', '2025-10-20 00:00:00', '2025-10-20 00:00:00', 51, 43, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-10-01 13:31:09', '2025-10-20 14:51:25', 1),
(235, 'Inviato preventivo Cremona', '', '2025-10-01 09:00:00', '2025-10-01 10:00:00', 56, 94, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-01 16:25:10', '2025-10-01 16:25:10', 1),
(236, 'Attivazione utenze Edison e Iliad', '', '2025-10-01 09:00:00', '2025-10-01 10:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-01 16:25:34', '2025-10-01 16:25:34', 1),
(238, 'Sentire muratore Pescantina', '', '2025-10-06 00:00:00', '2025-10-06 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-02 08:45:31', '2025-10-06 09:45:11', 1),
(239, 'Invio Contratto e Fattura a Cremona', '', '2025-10-02 17:00:00', '2025-10-02 18:30:00', 56, 94, '', 0, 'scheduled', 'urgent', 15, 2, 2, '2025-10-02 16:52:39', '2025-10-02 16:52:39', 1),
(240, 'Creazione Contenuti per Shooting Somma', '', '2025-10-02 16:00:00', '2025-10-02 17:00:00', 56, 36, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-10-02 16:53:28', '2025-10-02 16:53:28', 1),
(241, 'Incontro con Brian Prati (Tecnocasa Rovereto)', '', '2025-10-03 09:00:00', '2025-10-03 10:00:00', 22, NULL, 'Centro Direzionale E33 - San Martino B/A', 0, 'scheduled', 'high', 15, 3, 3, '2025-10-02 17:10:23', '2025-10-02 17:10:23', 1),
(242, 'Davide Macchina da Sponda', '', '2025-10-09 08:00:00', '2025-10-09 18:00:00', 27, NULL, '', 0, 'scheduled', 'medium', 1440, 2, 2, '2025-10-03 08:37:25', '2025-10-03 08:37:25', 1),
(243, 'Preparare Call Cremona', '', '2025-10-06 15:00:00', '2025-10-06 17:00:00', 56, NULL, '', 0, 'scheduled', 'urgent', 30, 2, 2, '2025-10-03 08:57:49', '2025-10-03 08:57:49', 1),
(244, 'Installazione fibra Iliad', '', '2025-10-14 15:00:00', '2025-10-14 17:00:00', 56, NULL, '', 0, 'scheduled', 'urgent', 60, 3, 3, '2025-10-05 15:49:35', '2025-10-05 15:49:35', 1),
(245, 'Post produzione reel + foto', '', '2025-10-13 00:00:00', '2025-10-13 00:00:00', 52, 36, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-10-05 15:52:48', '2025-10-13 09:29:15', 1),
(246, 'Call conoscitiva', '', '2025-10-07 11:00:00', '2025-10-07 11:30:00', 24, 94, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-10-05 15:53:32', '2025-10-05 15:53:32', 1),
(247, 'Preparato post 08/10', '', '2025-10-05 17:45:00', '2025-10-05 18:30:00', 51, 56, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-10-05 16:27:21', '2025-10-05 16:27:21', 1),
(248, 'Compilato modulo Edison e preso appuntamento con tecnico Iliad', '', '2025-10-05 09:00:00', '2025-10-05 10:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-05 16:27:49', '2025-10-05 16:27:49', 1),
(249, 'Iniziare ValpoStay', '', '2025-10-09 00:00:00', '2025-10-09 00:00:00', 51, 93, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-10-05 16:29:19', '2025-10-08 09:50:26', 1),
(250, 'Rispondere ad Irene', '', '2025-10-07 00:00:00', '2025-10-07 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-06 09:46:46', '2025-10-07 08:31:59', 1),
(251, 'Inviata fattura Tecnorete', '', '2025-10-13 00:00:00', '2025-10-13 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-06 13:33:59', '2025-10-13 16:08:19', 1),
(252, 'Studiare CED Mismo', '', '2025-10-09 00:00:00', '2025-10-09 00:00:00', 5, NULL, '', 1, 'scheduled', 'medium', 15, 3, 3, '2025-10-06 15:51:22', '2025-10-08 09:50:42', 1),
(253, 'Call con Glow Chic', 'Call', '2025-10-09 11:30:00', '2025-10-06 10:00:00', 22, 100, '', 0, 'scheduled', 'medium', 15, 11, 11, '2025-10-06 15:58:45', '2025-10-06 15:58:45', 1),
(254, 'Call Conoscitiva con Glow Chic', '', '2025-10-09 11:30:00', '2025-10-09 12:00:00', 22, 100, 'Casa', 0, 'scheduled', 'high', 30, 2, 2, '2025-10-06 16:16:41', '2025-10-06 16:16:41', 1),
(255, '10:00 Commercialista Squarzoni', '', '2025-10-14 10:00:00', '2025-10-14 10:30:00', 56, NULL, '', 0, 'scheduled', 'urgent', 1440, 2, 3, '2025-10-07 06:57:24', '2025-10-14 10:22:23', 1),
(256, 'Finita KOS', '', '2025-10-18 00:00:00', '2025-10-18 00:00:00', 5, 94, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-07 09:57:35', '2025-10-18 15:07:25', 1),
(257, 'Inviata risposta a Giulia Easyou', '', '2025-10-13 00:00:00', '2025-10-13 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-09 09:28:34', '2025-10-12 13:27:53', 1),
(258, 'Preparato preventivo per GlowChic', '', '2025-10-13 00:00:00', '2025-10-13 00:00:00', 56, 100, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-09 10:01:24', '2025-10-13 15:39:56', 1),
(259, 'Pagine sottostanti sito Paghe', 'Creare sottopagine con:\r\n- Servizi\r\n- Chi siamo\r\n- Blog (+ riporto in home) e dettaglio articolo', '2025-10-30 00:00:00', '2025-10-30 00:00:00', 51, 56, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-09 14:57:34', '2025-10-29 17:05:52', 1),
(260, 'Preparato preventivo per Fondazione De Carneri', '', '2025-10-13 00:00:00', '2025-10-13 00:00:00', 51, 107, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-10-13 09:29:45', '2025-10-13 16:08:31', 1),
(261, 'Meeting con Marianna', '', '2025-10-15 10:00:00', '2025-10-15 11:30:00', 22, 93, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-10-13 09:30:16', '2025-10-13 09:30:16', 1),
(262, 'Inviata fattura per Immobiliare Cremona', '', '2025-10-13 15:00:00', '2025-10-13 15:15:00', 56, 94, '', 0, 'scheduled', 'urgent', 15, 2, 2, '2025-10-13 10:16:26', '2025-10-13 13:19:09', 1),
(263, 'Pablos Graffiti', '', '2025-10-14 17:30:00', '2025-10-14 18:00:00', 27, NULL, 'Ufficio pescantina', 0, 'scheduled', 'medium', 30, 2, 2, '2025-10-13 10:28:13', '2025-10-13 10:28:13', 1),
(264, 'Preparato post per 15/10', '', '2025-10-14 11:45:00', '2025-10-14 12:20:00', 51, 56, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-10-14 10:21:59', '2025-10-14 10:22:12', 1),
(265, 'Aggiornata presentazione corporate', '', '2025-10-21 10:45:00', '2025-10-21 12:00:00', 51, 56, '', 0, 'scheduled', 'medium', 15, 3, 3, '2025-10-16 08:51:14', '2025-10-21 09:55:50', 1),
(266, 'Preparato CED novembre + definite bozze grafiche', '', '2025-10-25 00:00:00', '2025-10-26 00:00:00', 51, 94, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-10-16 08:51:40', '2025-10-26 16:56:30', 1),
(267, 'Meeting con Marianna', '', '2025-10-23 10:00:00', '2025-10-23 13:00:00', 22, 93, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-10-20 14:52:07', '2025-10-20 14:52:13', 1),
(268, 'Preparare bozza contratto', '', '2025-10-22 09:00:00', '2025-10-22 10:00:00', 56, 93, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-20 14:52:34', '2025-10-20 14:52:34', 1),
(269, 'Preparato post LinkedIn', '', '2025-10-21 10:00:00', '2025-10-21 10:45:00', 51, 56, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-10-21 08:41:25', '2025-10-21 08:41:31', 1),
(270, 'Trasloco Ufficio', '', '2025-10-21 14:00:00', '2025-10-21 20:00:00', 27, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-10-21 20:47:38', '2025-10-21 20:47:38', 1),
(271, 'Call con Nicola Gervasi', '', '2025-10-28 12:00:00', '2025-10-28 13:00:00', 24, 94, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-10-22 20:38:12', '2025-10-22 20:38:12', 1),
(272, 'Preparato CED + post novembre', '', '2025-10-28 00:00:00', '2025-10-29 00:00:00', 51, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-22 20:38:48', '2025-10-29 17:05:36', 1),
(273, 'Preparati post novembre-dicembre e inviati in anteprima', '', '2025-10-27 00:00:00', '2025-10-28 00:00:00', 51, 43, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-22 20:39:28', '2025-10-28 11:12:50', 1),
(274, 'Inviata fattura Valedent Novembre', '', '2025-10-27 16:45:00', '2025-10-27 17:00:00', 56, 43, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-10-27 15:58:25', '2025-10-27 15:58:25', 1),
(275, 'Shooting Cremona', '', '2025-11-21 08:00:00', '2025-11-21 18:00:00', 22, 94, 'Corso Vittorio Emanuele II, Cremona', 0, 'scheduled', 'medium', 15, 3, 3, '2025-10-28 12:20:00', '2025-11-22 10:54:12', 1),
(276, 'Preparare post novembre + sistemare profilo', '', '2025-10-30 00:00:00', '2025-10-31 00:00:00', 51, 94, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-28 16:57:06', '2025-10-30 17:18:01', 1),
(277, 'Programmati post novembre', '', '2025-10-28 09:00:00', '2025-10-28 10:00:00', 51, 43, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-28 17:07:37', '2025-10-28 17:07:37', 1),
(278, 'Programmati post dicembre', '', '2025-11-27 16:45:00', '2025-11-27 17:30:00', 51, 43, '', 0, 'scheduled', 'urgent', 15, 3, 2, '2025-10-28 17:08:13', '2025-11-27 17:09:05', 1),
(279, 'Riunione con Marianna', '', '2025-10-30 10:00:00', '2025-10-30 13:00:00', 22, 93, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-10-29 10:46:19', '2025-10-29 10:46:19', 1),
(280, 'Preventivo per acquaviva', '', '2025-10-29 15:00:00', '2025-10-29 16:00:00', 52, 57, 'Ufficio', 0, 'scheduled', 'medium', 15, 2, 2, '2025-10-29 15:14:22', '2025-10-29 15:14:22', 1),
(281, 'Pagata caparra', '', '2025-10-29 09:00:00', '2025-10-29 10:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-10-29 15:48:59', '2025-10-29 15:48:59', 1),
(282, 'Incontro colibryx', '', '2025-11-04 10:00:00', '2025-11-04 12:00:00', 22, 93, 'Via Riccardo Felici 11, 37135, Verona,', 0, 'scheduled', 'urgent', 1440, 2, 2, '2025-10-30 09:20:08', '2025-10-30 10:45:05', 1),
(283, 'Incontro con Massimo Fiorio tecnocasa Pescantina', '', '2025-10-31 11:00:00', '2025-10-31 12:00:00', 22, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-10-30 14:42:30', '2025-10-30 14:42:30', 1),
(284, 'Shooting Crema', '', '2025-11-14 07:30:00', '2025-11-14 18:00:00', 22, 94, 'Viale Alcile de Gasperi 57/A Crema', 0, 'scheduled', 'urgent', 1440, 2, 2, '2025-10-30 16:45:34', '2025-11-14 14:01:16', 1),
(285, 'Sistemati profili e programmati post', '', '2025-11-03 09:00:00', '2025-11-03 10:00:00', 51, 94, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-02 17:17:31', '2025-11-03 15:41:29', 1),
(286, 'Aggiornata presentazione Paghe', '', '2025-11-03 00:00:00', '2025-11-03 00:00:00', 51, 56, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-11-02 17:17:58', '2025-11-03 17:04:21', 1),
(290, 'Creata mail Giulia + sistema unico per invio mail (tipo GV)', '', '2025-11-03 00:00:00', '2025-11-03 00:00:00', 56, NULL, '', 1, 'scheduled', 'medium', 15, 3, 3, '2025-11-03 10:34:11', '2025-11-03 14:28:31', 1),
(291, 'Preparate schede tecniche per video', '', '2025-11-06 00:00:00', '2025-11-06 00:00:00', 51, 94, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-03 16:03:00', '2025-11-06 16:33:33', 1),
(292, 'Preparati post novembre', '', '2025-11-05 00:00:00', '2025-11-06 00:00:00', 51, 94, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-11-03 16:04:48', '2025-11-06 15:01:53', 1),
(293, 'Sottopagine Paghe', '', '2025-11-04 09:00:00', '2025-11-06 10:00:00', 51, 56, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-03 16:05:29', '2025-11-03 16:05:29', 1),
(294, 'Corretto post affitto e inviate fatture', '', '2025-11-05 09:00:00', '2025-11-05 10:00:00', 51, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-05 14:18:56', '2025-11-05 14:18:56', 1),
(295, 'CED dicembre-gennaio TIC', '', '2025-11-20 15:00:00', '2025-11-20 17:00:00', 51, 94, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-06 11:16:40', '2025-11-20 16:02:34', 1),
(296, 'Programmati post novembre', '', '2025-11-10 00:00:00', '2025-11-10 00:00:00', 51, 94, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-06 15:07:41', '2025-11-10 17:37:38', 1),
(297, 'Aggiornare contatti Mismo', '', '2025-11-11 00:00:00', '2025-11-11 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-06 15:08:14', '2025-11-09 15:33:27', 1),
(298, 'Shooting Villafranca di Verona', '', '2025-11-13 10:30:00', '2025-11-13 13:45:00', 22, 36, '', 0, 'scheduled', 'urgent', 1440, 2, 3, '2025-11-06 16:26:33', '2025-11-13 14:52:28', 1),
(299, 'Caricare progetti su Behance', '', '2025-11-07 09:00:00', '2025-11-07 10:00:00', 5, NULL, '', 1, 'scheduled', 'medium', 15, 3, 3, '2025-11-06 16:35:53', '2025-11-06 16:35:53', 1),
(300, 'Preparati script per shooting Villafranca', '', '2025-11-11 00:00:00', '2025-11-11 00:00:00', 51, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-06 16:40:35', '2025-11-11 11:29:32', 1),
(301, 'Preparati script per shooting Crema', 'Curiosità immobiliari, dati e statistiche, reclutamento nuovi collaboratori.', '2025-11-11 00:00:00', '2025-11-11 00:00:00', 51, 94, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-09 15:35:03', '2025-11-11 15:14:53', 1),
(302, 'Preparato CED dicembre Tecnorete', '', '2025-11-12 00:00:00', '2025-11-12 00:00:00', 51, 36, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-11-09 15:36:16', '2025-11-12 15:10:41', 1),
(303, 'Inviata fattura Tecnorete', '', '2025-11-10 00:00:00', '2025-11-10 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-09 15:36:54', '2025-11-10 17:15:00', 1),
(304, 'Sistemate sottopagine Paghe', '', '2025-11-10 00:00:00', '2025-11-10 00:00:00', 51, 56, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-09 15:37:52', '2025-11-10 17:07:46', 1),
(305, 'Call di allineamento con Giulia', '', '2025-11-11 10:00:00', '2025-11-11 10:30:00', 24, NULL, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-09 15:38:48', '2025-11-09 15:38:48', 1),
(306, 'Pagato affitto', '', '2025-11-14 00:00:00', '2025-11-14 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 1440, 3, 3, '2025-11-09 15:48:00', '2025-11-15 16:52:50', 1),
(307, 'Incontro con Tecnocasa Bardolino (Pietro)', '', '2025-11-12 10:00:00', '2025-11-12 10:30:00', 22, NULL, 'Via Marconi, 32, 37011 Bardolino VR', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-10 14:22:01', '2025-11-10 14:22:01', 1),
(308, 'Aggiornata presentazione per Tecnocasa + biglietti da visita', '', '2025-11-10 09:00:00', '2025-11-10 10:00:00', 51, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-10 17:08:24', '2025-11-10 17:08:24', 1),
(309, 'Creati file Follow Us Tecnorete', '', '2025-11-10 09:00:00', '2025-11-10 10:00:00', 51, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-10 17:08:58', '2025-11-10 17:08:58', 1),
(310, 'Creati file Follow Us Tecnocasa', '', '2025-11-10 09:00:00', '2025-11-10 10:00:00', 51, 94, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-10 17:09:21', '2025-11-10 17:09:29', 1),
(311, 'Inviata fattura Tecnocasa Cremona', '', '2025-11-11 10:00:00', '2025-11-11 10:15:00', 56, 94, '', 0, 'scheduled', 'urgent', 15, 2, 2, '2025-11-11 14:26:19', '2025-11-11 14:26:19', 1),
(312, 'Preparato post PagheSolution per 13/11', '', '2025-11-11 17:00:00', '2025-11-11 17:45:00', 51, 56, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-11 16:50:43', '2025-11-11 16:51:24', 1),
(313, 'Aggiornato back-end pagina Team', '', '2025-11-11 09:00:00', '2025-11-11 10:00:00', 52, 56, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-11 16:51:09', '2025-11-11 16:51:09', 1),
(314, 'Preparati post dicembre', '', '2025-11-18 10:00:00', '2025-11-18 18:00:00', 51, 36, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-11-12 17:01:40', '2025-11-18 16:35:41', 1),
(315, 'Call con Luigi', '', '2025-11-13 17:00:00', '2025-11-13 17:30:00', 24, 56, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-12 17:14:23', '2025-11-12 17:14:23', 1),
(317, 'BLASH', '', '2025-11-10 11:00:00', '2025-11-10 13:00:00', 5, 63, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-13 15:35:05', '2025-11-13 15:35:05', 1),
(319, 'Finire parte mobile + sistemazione grafica', 'Aggiungere link dell\'autore del blog che rimandi alla scheda del team.', '2025-11-17 00:00:00', '2025-11-19 00:00:00', 52, 56, '', 1, 'scheduled', 'urgent', 15, 3, 2, '2025-11-16 16:04:00', '2025-11-18 16:01:19', 1),
(324, 'Trasferimento dominio valpostay.com', '[Creato da Task #74: Trasferimento dominio valpostay.com]', '2025-11-01 01:00:00', '2025-11-01 21:00:00', 27, 93, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-17 17:47:30', '2025-11-17 17:47:30', 1),
(325, 'Trasferimento dominio valpostay.com', '[Creato da Task #74: Trasferimento dominio valpostay.com]', '2025-11-01 01:00:00', '2025-11-01 19:00:00', 22, 93, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-17 17:47:44', '2025-11-17 17:47:44', 1),
(326, 'Trasferimento dominio valpostay.com', '[Creato da Task #74: Trasferimento dominio valpostay.com]', '2025-11-01 18:00:00', '2025-11-01 20:00:00', 27, 93, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-17 17:48:01', '2025-11-17 17:48:01', 1),
(330, 'Disdire abbonamento Capcut', '', '2025-12-17 09:00:00', '2025-12-17 10:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 1440, 3, 3, '2025-11-18 14:09:46', '2025-11-18 14:09:46', 1),
(341, 'Fatture Tecnorete e PagheSolution', '', '2025-11-18 10:00:00', '2025-11-18 10:15:00', 56, NULL, '', 0, 'scheduled', 'urgent', 15, 2, 3, '2025-11-18 15:26:10', '2025-11-18 16:47:05', 1),
(342, 'Presentazione aziendale', '', '2025-11-17 14:30:00', '2025-11-17 17:30:00', 51, 93, '', 0, 'scheduled', 'medium', 15, 2, 3, '2025-11-18 15:27:52', '2025-11-18 16:46:19', 1),
(345, 'Modifica Agenda Portale', '', '2025-11-18 15:00:00', '2025-11-18 19:00:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-18 16:24:52', '2025-11-18 16:24:52', 1),
(348, 'Sistemazione CSS mobile Paghe', '[Creato da Task #89: Sistemazione CSS mobile Paghe]', '2025-11-17 14:30:00', '2025-11-17 17:00:00', 52, 56, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-18 16:47:56', '2025-11-18 16:47:56', 1),
(349, 'Sistemazione nuovo portale', '', '2025-11-17 17:00:00', '2025-11-17 19:00:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-18 16:48:21', '2025-11-18 16:48:21', 1),
(350, 'Montaggio video ale', '[Creato da Task #90: Montaggio video ale]', '2025-11-18 15:30:00', '2025-11-18 16:00:00', 52, 36, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-18 16:49:43', '2025-11-18 16:49:43', 1),
(355, 'Finita bozza BP', '', '2025-11-19 15:00:00', '2025-11-19 17:30:00', 51, 93, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-19 10:40:04', '2025-11-19 16:24:18', 1),
(356, 'Preparata bozza preventivo per 15 uffici', '', '2025-11-19 18:00:00', '2025-11-19 19:00:00', 56, NULL, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-19 10:44:00', '2025-11-19 18:10:39', 1),
(358, 'Modifica finance tracker e CSS agenda', '', '2025-11-19 15:00:00', '2025-11-19 17:30:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-19 16:32:41', '2025-11-19 16:33:36', 1),
(359, 'Sistemazione Admin Utenti con preview', '', '2025-11-19 18:00:00', '2025-11-19 18:30:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-19 18:10:58', '2025-11-19 18:10:58', 1),
(360, 'Riunione con Alessandro', '', '2025-11-20 10:00:00', '2025-11-20 11:30:00', 22, 36, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-20 10:14:30', '2025-11-20 10:14:30', 1),
(361, 'Pubblicazione Nuovo Sito PagheSolution', '[Creato da Task #91: Pubblicazione Nuovo Sito PagheSolution]', '2025-11-20 14:00:00', '2025-11-20 15:00:00', 52, 56, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-20 14:13:04', '2025-11-20 14:13:04', 1),
(362, 'Aggiornato preventivo per Tecnorete e Tecnocasa', '', '2025-11-24 15:30:00', '2025-11-24 18:00:00', 5, 36, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-20 16:07:00', '2025-11-24 17:28:39', 1),
(363, 'Preparata bozza contratto per Tecnocasa Bardolino', '', '2025-11-24 18:00:00', '2025-11-24 18:30:00', 56, 125, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-11-20 16:07:31', '2025-11-24 17:28:53', 1),
(364, 'Incontro con Pietro Oltremari', '', '2025-11-25 10:30:00', '2025-11-25 11:30:00', 22, 125, 'Via Marconi, 32, 37011 Bardolino VR', 0, 'scheduled', 'urgent', 15, 3, 2, '2025-11-22 10:54:58', '2025-11-24 17:06:44', 1),
(365, 'Sponsorizzare reel Sommacampagna', '', '2025-11-24 15:30:00', '2025-11-24 16:00:00', 52, 36, '', 0, 'scheduled', 'urgent', 15, 3, 2, '2025-11-23 15:01:02', '2025-11-24 14:38:29', 1),
(366, 'Preparato post per il 25/11', '', '2025-11-23 16:00:00', '2025-11-23 17:00:00', 51, 56, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-23 15:50:17', '2025-11-23 15:50:17', 1),
(367, 'Incontro con Marianna', '', '2025-11-26 14:30:00', '2025-11-26 17:00:00', 22, 93, 'Via Madonna 14 - Pescantina', 0, 'scheduled', 'medium', 15, 3, 2, '2025-11-24 10:57:08', '2025-11-26 15:40:17', 1),
(368, 'Programmato post 24/11', '', '2025-11-24 14:25:00', '2025-11-24 14:30:00', 51, 56, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-24 10:57:35', '2025-11-24 13:31:52', 1),
(369, 'Programmati post dicembre', '', '2025-11-24 14:30:00', '2025-11-24 15:30:00', 51, 36, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-24 10:58:05', '2025-11-24 14:21:05', 1),
(370, 'Preparati post dicembre', '', '2025-11-25 14:30:00', '2025-11-25 18:00:00', 51, 94, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-24 10:59:04', '2025-11-25 16:59:38', 1),
(371, 'Preparato post 03/12', '', '2025-11-27 09:30:00', '2025-11-27 10:15:00', 51, 56, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-24 10:59:39', '2025-11-27 09:20:59', 1),
(373, 'sistemazione foto e video Shooting', '', '2025-11-24 16:15:00', '2025-11-24 18:00:00', 52, 94, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-24 17:07:27', '2025-11-24 17:07:50', 1),
(374, 'Sistemazione sistema Preventivi', '', '2025-11-24 18:00:00', '2025-11-24 19:30:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-24 19:09:24', '2025-11-24 19:09:24', 1),
(375, 'Inserimento PIN Task e Fatture', '', '2025-11-24 21:00:00', '2025-11-24 22:00:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-24 20:22:54', '2025-11-24 20:22:54', 1),
(376, 'Sistemazione dashboard portale', '', '2025-11-24 22:00:00', '2025-11-24 23:00:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-24 21:27:07', '2025-11-24 21:27:07', 1),
(377, 'Sistemazione Lead Board', '', '2025-11-25 14:30:00', '2025-11-25 18:30:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-25 17:18:24', '2025-11-25 17:18:24', 1),
(378, 'Incontro con Michele Cipriani', '', '2025-12-05 14:30:00', '2025-12-05 17:30:00', 2, 93, 'Via Don Cesare Scala, 55, 37020 Rivalta VR', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-26 11:14:29', '2025-12-06 16:57:28', 1),
(379, 'Programmati post', '', '2025-11-27 16:00:00', '2025-11-27 16:45:00', 51, 94, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-26 15:36:00', '2025-11-27 15:40:36', 1),
(381, 'Aggiornamento business plan', '', '2025-11-27 10:15:00', '2025-11-27 11:00:00', 51, 93, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-27 10:16:00', '2025-11-27 10:16:00', 1),
(382, 'Post produzione video', '[Creato da Task #100: Post produzione video]', '2025-11-27 09:00:00', '2025-11-27 17:30:00', 56, 94, '', 0, 'scheduled', 'urgent', 15, 2, 2, '2025-11-27 10:39:00', '2025-11-27 17:08:25', 1),
(384, 'Presentazione per investitore', '', '2025-12-01 15:30:00', '2025-12-01 19:00:00', 51, 93, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-27 15:41:55', '2025-12-01 17:51:40', 1),
(385, 'Preparare CED gennaio-febbraio + post', '', '2025-12-23 00:00:00', '2025-12-24 00:00:00', 51, 94, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-27 15:42:53', '2025-12-19 14:16:18', 1),
(386, 'CED gennaio-febbraio', '', '2025-12-29 00:00:00', '2025-12-29 00:00:00', 51, 43, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-27 15:43:28', '2025-12-19 14:16:02', 1),
(387, 'Inviare fattura dicembre Valedent', '', '2025-11-28 09:00:00', '2025-11-28 10:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-27 15:43:58', '2025-11-27 15:43:58', 1),
(388, 'Ricerca 10-15 foto stock per blog Paghe', '[Creato da Task #81: Ricerca 10-15 foto stock per blog Paghe]', '2025-11-28 10:30:00', '2025-11-28 11:30:00', 51, 56, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-11-28 10:44:39', '2025-11-28 10:44:39', 1),
(389, 'Chiamare Nicola Gervasi per appuntamento post 28', 'Fissare shooting dopo il 28 gennaio', '2026-01-12 09:00:00', '2026-01-12 10:00:00', 56, 94, '', 1, 'scheduled', 'high', 60, 12, 12, '2025-11-28 11:09:59', '2025-11-28 11:09:59', 1),
(390, 'Riunione con Martina per Linkedin', '', '2025-12-01 15:00:00', '2025-12-01 15:30:00', 22, 94, '', 0, 'scheduled', 'medium', 60, 2, 12, '2025-11-28 11:16:14', '2025-12-01 15:14:43', 1),
(391, 'Pulizia Ufficio', '', '2025-11-28 17:00:00', '2025-11-28 18:30:00', 56, NULL, '', 0, 'scheduled', 'medium', 15, 12, 3, '2025-11-28 11:28:10', '2025-11-30 15:57:51', 1),
(392, 'Revisione contenuti Crema, Cremona e Villafranca', '', '2025-11-28 11:45:00', '2025-11-28 12:45:00', 56, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-11-28 11:37:14', '2025-11-28 11:37:14', 1),
(393, 'Preparate copertine, didascalie e programmati reel', '', '2025-11-28 15:30:00', '2025-11-28 16:45:00', 51, 94, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-11-28 15:23:51', '2025-11-28 15:41:52', 1),
(394, 'Preparata bozza contratto', '', '2025-11-28 15:00:00', '2025-11-28 15:30:00', 56, 125, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-11-28 15:24:42', '2025-11-28 15:24:42', 1),
(396, 'Post produzione video', '[Creato da Task #100: Post produzione video]', '2025-11-28 10:00:00', '2025-11-28 17:00:00', 56, 94, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-11-28 15:57:00', '2025-11-28 15:57:38', 1),
(399, 'Pagato affitto', '', '2025-12-15 00:00:00', '2025-12-15 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-11-30 15:57:30', '2025-12-15 14:12:17', 1),
(400, 'Fix Agenda per Giulia', '', '2025-12-01 15:30:00', '2025-12-01 16:00:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-12-01 15:15:20', '2025-12-01 15:15:20', 1),
(401, 'Selezione autore nel blog + 404', '[Creato da Task #107: Selezione autore nel blog]', '2025-12-01 16:15:00', '2025-12-01 17:30:00', 52, 56, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-12-01 16:04:56', '2025-12-01 16:34:57', 1),
(402, 'Invio fatture Bardolino + Valedent + preventivo', '', '2025-12-01 17:45:00', '2025-12-01 18:15:00', 56, 93, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-12-01 16:34:42', '2025-12-01 16:39:50', 1),
(403, 'Riunione con Marianna', '', '2025-12-03 14:30:00', '2025-12-03 16:30:00', 22, 93, 'In studio', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-02 09:06:41', '2025-12-02 09:06:41', 1),
(404, 'Shooting Sommacampagna', '', '2025-12-03 10:00:00', '2025-12-03 12:30:00', 22, 36, '', 0, 'scheduled', 'urgent', 60, 2, 3, '2025-12-02 10:26:54', '2025-12-03 13:36:21', 1),
(405, 'Presentazione', '', '2025-12-02 10:00:00', '2025-12-02 12:00:00', 51, 93, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-02 11:03:22', '2025-12-02 11:03:22', 1),
(406, 'Presentazione', '', '2025-12-02 14:30:00', '2025-12-02 16:30:00', 51, 93, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-02 15:32:26', '2025-12-02 15:32:26', 1),
(407, 'Sistemazione sito Mismo', '', '2025-12-02 16:30:00', '2025-12-02 18:00:00', 56, NULL, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-12-02 16:57:34', '2025-12-02 16:57:34', 1),
(408, 'Programmare reel Crema e Cremona', '', '2025-12-04 10:00:00', '2025-12-04 10:30:00', 56, NULL, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-03 16:41:57', '2025-12-04 14:05:25', 1),
(409, 'Post produzione video', '[Creato da Task #100: Post produzione video]', '2025-12-02 10:00:00', '2025-12-02 12:00:00', 58, 94, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-04 09:19:20', '2025-12-05 10:39:22', 1),
(410, 'Sottotitoli video shooting', '[Creato da Task #98: Sottotitoli video shooting]', '2025-12-03 10:00:00', '2025-12-03 12:00:00', 58, 94, '', 0, 'scheduled', 'medium', 15, 12, 2, '2025-12-04 09:20:15', '2025-12-05 10:39:00', 1);
INSERT INTO `agenda_events` (`id`, `title`, `description`, `start_datetime`, `end_datetime`, `category_id`, `client_id`, `location`, `is_all_day`, `status`, `priority`, `reminder_minutes`, `created_by`, `assigned_to`, `created_at`, `updated_at`, `visible_to_client`) VALUES
(411, 'Programmazione reel shooting novembre', '[Creato da Task #110: Programmazione reel shooting novembre]', '2025-12-04 11:00:00', '2025-12-04 12:00:00', 58, 94, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-04 11:35:39', '2025-12-05 10:39:43', 1),
(412, 'Social Mismo', '', '2025-12-04 15:00:00', '2025-12-04 18:00:00', 5, NULL, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-12-05 09:36:08', '2025-12-05 09:36:08', 1),
(413, 'Promozione reel Tecnorete', '', '2025-12-05 11:00:00', '2025-12-05 11:30:00', 52, 36, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-12-05 10:37:45', '2025-12-05 10:37:58', 1),
(414, 'Sistemazione nuovo sito', '', '2025-12-04 09:30:00', '2025-12-04 12:30:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-12-05 10:40:10', '2025-12-05 10:40:10', 1),
(415, 'Caricare progetti Mismo su Behance', 'PagheSolution, MC, Loki, Ali, Divino Design, ValeDent\r\n\r\n[Creato da Task #79: Caricare progetti Mismo su Behance]', '2025-12-05 11:00:00', '2025-12-05 13:30:00', 58, NULL, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-05 12:38:45', '2025-12-05 12:40:11', 1),
(416, 'Kick-off strategy bardolino + analisi', '[Creato da Task #109: Kick-off strategy bardolino + analisi]', '2025-12-05 14:30:00', '2025-12-05 17:30:00', 58, 125, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-05 17:01:45', '2025-12-05 17:01:45', 1),
(417, 'Fattura elettronica + accantonamento Valedent', '', '2025-12-10 00:00:00', '2025-12-10 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 2, '2025-12-06 16:58:01', '2025-12-09 17:16:31', 1),
(418, 'Programmare reel Tommaso', '', '2025-12-12 00:00:00', '2025-12-12 00:00:00', 56, 36, '', 1, 'scheduled', 'urgent', 30, 3, 3, '2025-12-08 15:50:50', '2025-12-11 17:16:48', 1),
(419, 'Inviare fattura Cremona e Villafranca', '', '2025-12-10 11:00:00', '2025-12-10 12:00:00', 56, NULL, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-12-08 15:51:16', '2025-12-08 15:51:16', 1),
(420, 'Ordinate vetrofanie', '', '2025-12-12 00:00:00', '2025-12-12 00:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-12-09 10:53:39', '2025-12-12 10:28:04', 1),
(421, 'Kick-off strategy bardolino + analisi', '[Creato da Task #109: Kick-off strategy bardolino + analisi]', '2025-12-09 10:30:00', '2025-12-09 12:00:00', 58, 125, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-09 11:06:34', '2025-12-09 11:06:34', 1),
(422, 'Call con Marianna', '', '2025-12-09 15:30:00', '2025-12-09 16:00:00', 24, 93, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-09 13:34:15', '2025-12-09 13:34:15', 1),
(424, 'Incontro con Colibryx', '', '2025-12-11 10:00:00', '2025-12-11 11:00:00', 2, 93, '', 0, 'scheduled', 'medium', 15, 2, 3, '2025-12-09 14:47:56', '2025-12-10 11:00:13', 1),
(425, 'Inviare fattura Bardolino + Valedent', '', '2025-12-10 07:00:00', '2025-12-10 08:00:00', 56, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-12-09 16:43:15', '2025-12-09 16:43:15', 1),
(426, 'Pubblicazione nuovi sito MISMO', '', '2025-12-09 17:30:00', '2025-12-09 18:00:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-12-09 17:15:33', '2025-12-09 17:15:33', 1),
(427, 'Analisi strategica', '', '2025-12-09 14:30:00', '2025-12-09 18:30:00', 51, 125, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-09 17:34:54', '2025-12-09 17:34:54', 1),
(429, 'Kick-off Strategy', '', '2025-12-10 10:30:00', '2025-12-10 11:45:00', 51, 125, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-10 10:42:41', '2025-12-10 10:42:41', 1),
(430, 'Incontro con Ewake', '', '2025-12-11 11:00:00', '2025-12-11 12:00:00', 2, 93, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-10 11:00:02', '2025-12-10 11:00:02', 1),
(431, 'Ultimata bozza vetrofanie', '', '2025-12-10 11:45:00', '2025-12-10 12:15:00', 56, NULL, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-10 11:05:59', '2025-12-10 11:05:59', 1),
(433, 'Comunicazione MISMO', '', '2025-12-10 15:30:00', '2025-12-10 19:00:00', 5, NULL, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-12-10 17:59:16', '2025-12-10 17:59:16', 1),
(434, 'Fine strategia e CED', '', '2025-12-11 10:30:00', '2025-12-11 12:30:00', 51, 125, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-11 14:08:43', '2025-12-11 14:08:43', 1),
(435, 'Video statistiche tommaso', '', '2025-12-11 11:00:00', '2025-12-11 11:45:00', 58, NULL, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-11 16:18:17', '2025-12-11 16:18:17', 1),
(436, 'Grafiche + Programmazione post Tecnorete', '[Creato da Task #112: Grafiche + Programmazione post Tecnorete]', '2025-12-11 14:00:00', '2025-12-11 17:20:00', 58, 36, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-11 16:22:03', '2025-12-11 16:22:45', 1),
(438, 'CED dicembre-gennaio', '', '2025-12-11 15:30:00', '2025-12-11 18:15:00', 51, 125, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-11 17:12:14', '2025-12-11 17:12:14', 1),
(439, 'Bozze grafiche post e storie', '', '2025-12-12 11:30:00', '2025-12-12 12:15:00', 51, 125, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-12-11 17:30:06', '2025-12-12 15:24:50', 1),
(440, 'Call per blog', '', '2025-12-12 10:30:00', '2025-12-12 12:00:00', 24, NULL, '', 0, 'scheduled', 'medium', 15, 3, 3, '2025-12-12 09:38:35', '2025-12-12 09:38:35', 1),
(441, 'Scade dominio MC Solutions', '', '2026-01-08 07:00:00', '2026-01-08 08:00:00', 56, 63, '', 1, 'scheduled', 'urgent', 1440, 3, 3, '2025-12-12 10:29:08', '2025-12-12 10:29:08', 1),
(442, 'Bozze grafiche post e storie', '', '2025-12-12 15:00:00', '2025-12-12 18:00:00', 51, 125, '', 0, 'scheduled', 'high', 15, 3, 12, '2025-12-12 15:24:25', '2025-12-16 13:12:36', 1),
(443, 'Preparazione CED gennaio-febbraio', '', '2025-12-12 17:00:00', '2025-12-12 18:15:00', 51, 36, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-12 17:13:18', '2025-12-12 17:13:18', 1),
(444, 'Incontro con Pietro', '', '2025-12-16 10:30:00', '2025-12-16 11:30:00', 22, 125, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-12 17:14:19', '2025-12-15 14:09:52', 1),
(445, 'Post 17, 23 e 31/12', '', '2025-12-15 10:30:00', '2025-12-15 12:15:00', 51, 56, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-14 15:51:24', '2025-12-15 11:11:46', 1),
(446, 'Preparare post gennaio', '', '2025-12-22 11:00:00', '2025-12-22 12:00:00', 51, 36, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-12-14 15:53:21', '2025-12-14 15:53:21', 1),
(447, 'Preparare post gennaio', '', '2025-12-29 00:00:00', '2025-12-29 00:00:00', 51, 43, '', 1, 'scheduled', 'high', 15, 3, 3, '2025-12-14 15:53:40', '2025-12-19 14:15:54', 1),
(448, 'Preparare video auguri Natale Alessandro', '', '2025-12-15 07:00:00', '2025-12-15 08:00:00', 56, NULL, '', 1, 'scheduled', 'urgent', 15, 3, 3, '2025-12-15 09:50:54', '2025-12-15 09:50:54', 1),
(449, 'Rifare storie in evidenza crema e cremona', '[Creato da Task #86: Rifare storie in evidenza crema e cremona]', '2025-12-16 10:00:00', '2025-12-16 12:00:00', 58, 94, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-16 13:09:44', '2025-12-16 13:29:30', 1),
(450, 'Rifare storie in evidenza crema e cremona', '[Creato da Task #86: Rifare storie in evidenza crema e cremona]', '2025-12-12 15:00:00', '2025-12-12 16:30:00', 58, 94, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-16 13:11:54', '2025-12-16 13:11:54', 1),
(451, 'Rifare storie in evidenza crema e cremona', '[Creato da Task #86: Rifare storie in evidenza crema e cremona]', '2025-12-17 10:30:00', '2025-12-17 13:00:00', 58, 94, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-17 12:50:28', '2025-12-17 12:50:28', 1),
(452, 'Apertura profilo Instagram', '', '2025-12-18 10:30:00', '2025-12-18 11:15:00', 51, 125, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-18 10:13:36', '2025-12-18 10:13:36', 1),
(453, 'Storie instagram per le feste', 'per i profili di tecnorete (Somma e Villa) e tecnocasa (Crema e Cremona)\r\n\r\n[Creato da Task #115: Storie instagram per le feste]', '2025-12-18 10:45:00', '2025-12-18 12:45:00', 58, NULL, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-18 11:53:18', '2025-12-18 11:53:18', 1),
(454, 'Preparazione post', '', '2025-12-18 11:15:00', '2025-12-18 12:45:00', 51, 125, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-18 14:43:43', '2025-12-18 14:43:43', 1),
(455, 'Preparazione e programmazione post', '', '2025-12-18 15:30:00', '2025-12-18 17:15:00', 51, 125, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-18 16:10:43', '2025-12-18 16:10:43', 1),
(457, 'Creare storie sulla base dei contenuti già creati (somma)', 'Creare delle storie con sondaggi o box domande sulla base di contenuti informativi già pubblicati\r\n\r\n[Creato da Task #83: Creare storie sulla base dei contenuti già creati (somma)]', '2025-12-18 14:30:00', '2025-12-18 17:30:00', 58, 36, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-18 16:27:58', '2025-12-18 16:27:58', 1),
(458, 'Preparato preventivo bando Nexora', '', '2025-12-18 17:30:00', '2025-12-18 17:50:00', 56, NULL, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-18 16:50:44', '2025-12-18 16:50:44', 1),
(459, 'Post Villafranca e Cremona', '', '2025-12-19 10:30:00', '2025-12-19 12:45:00', 51, NULL, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-19 11:42:08', '2025-12-19 11:42:08', 1),
(460, 'Post di natale Valedent', '[Creato da Task #117: Post di natale Valedent]', '2025-12-19 10:40:00', '2025-12-19 12:40:00', 58, NULL, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-19 12:53:51', '2025-12-19 12:53:51', 1),
(461, 'Creazione e programmazione post + storie fino al 06/01', '', '2025-12-22 14:30:00', '2025-12-22 16:45:00', 51, 125, '', 0, 'scheduled', 'urgent', 15, 3, 3, '2025-12-19 14:15:10', '2025-12-22 15:38:22', 1),
(462, 'Programmare le storie di Tecnorete', 'programmare le storie di tecnorete e villafranca per il mese di gennaio\r\n\r\n[Creato da Task #118: Programmare le storie di Tecnorete]', '2025-12-19 14:00:00', '2025-12-19 15:00:00', 58, NULL, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-19 14:50:40', '2025-12-19 14:50:40', 1),
(463, 'Progetto Top Secret', '', '2025-12-19 10:00:00', '2025-12-19 12:30:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-12-19 15:22:06', '2025-12-19 15:26:26', 1),
(464, 'Progetto Top Secret', '', '2025-12-19 14:30:00', '2025-12-19 18:00:00', 52, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-12-19 15:22:40', '2025-12-19 15:22:40', 1),
(465, 'JUSTIN malato', '', '2025-12-17 00:00:00', '2025-12-18 00:00:00', 59, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-12-19 15:23:13', '2025-12-19 15:23:53', 1),
(466, 'STEFANO malato', '', '2025-12-17 07:00:00', '2025-12-17 08:00:00', 59, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-12-19 15:24:19', '2025-12-19 15:24:19', 1),
(467, 'GIULIA assente', '', '2025-12-12 09:00:00', '2025-12-12 15:00:00', 60, NULL, '', 0, 'scheduled', 'medium', 15, 2, 2, '2025-12-19 15:25:39', '2025-12-19 15:25:39', 1),
(468, 'ULTIMO GIORNO giulia', '', '2025-12-19 07:00:00', '2025-12-19 08:00:00', 27, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-12-19 15:27:10', '2025-12-19 15:27:10', 1),
(469, 'GIULIA assente', '', '2025-12-22 14:00:00', '2025-12-26 15:00:00', 60, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-12-19 15:28:02', '2025-12-19 15:28:02', 1),
(470, 'GIULIA assente', '', '2025-12-29 07:00:00', '2026-01-02 08:00:00', 60, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-12-19 15:28:32', '2025-12-19 15:28:36', 1),
(471, 'RITORNO giulia', '', '2026-01-08 00:00:00', '2026-01-08 00:00:00', 27, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-12-19 15:28:59', '2025-12-19 15:29:41', 1),
(472, 'Post di natale Valedent', '[Creato da Task #117: Post di natale Valedent]', '2025-12-19 15:00:00', '2025-12-19 16:30:00', 58, NULL, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-19 16:29:45', '2025-12-19 16:29:45', 1),
(473, 'Rifare grafica lavora con noi con stile seguici sui social', '[Creato da Task #119: Rifare grafica lavora con noi con stile seguici sui social]', '2025-12-19 16:30:00', '2025-12-19 17:30:00', 58, 94, '', 0, 'scheduled', 'medium', 15, 12, 12, '2025-12-19 16:34:16', '2025-12-19 16:34:16', 1),
(474, 'Abbonamento Giulia', '', '2025-12-29 00:00:00', '2025-12-29 00:00:00', 27, NULL, '', 1, 'scheduled', 'medium', 15, 2, 2, '2025-12-19 16:44:19', '2025-12-19 16:46:16', 1),
(475, 'Comunicazione MISMO', '', '2025-12-19 15:00:00', '2025-12-19 18:00:00', 56, NULL, '', 0, 'scheduled', 'high', 15, 3, 3, '2025-12-19 16:57:58', '2025-12-19 16:57:58', 1);

--
-- Trigger `agenda_events`
--
DELIMITER $$
CREATE TRIGGER `agenda_events_after_insert` AFTER INSERT ON `agenda_events` FOR EACH ROW BEGIN
    INSERT INTO agenda_activity_logs (user_id, action, event_id, details, created_at)
    VALUES (NEW.created_by, 'create_event', NEW.id, CONCAT('Evento "', NEW.title, '" creato'), NOW());
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `agenda_events_after_update` AFTER UPDATE ON `agenda_events` FOR EACH ROW BEGIN
    DECLARE changes TEXT DEFAULT '';
    
    
    IF OLD.title != NEW.title THEN
        SET changes = CONCAT(changes, 'Titolo: "', OLD.title, '" → "', NEW.title, '"; ');
    END IF;
    
    IF OLD.start_datetime != NEW.start_datetime THEN
        SET changes = CONCAT(changes, 'Inizio: ', OLD.start_datetime, ' → ', NEW.start_datetime, '; ');
    END IF;
    
    IF OLD.status != NEW.status THEN
        SET changes = CONCAT(changes, 'Status: ', OLD.status, ' → ', NEW.status, '; ');
    END IF;
    
    IF changes != '' THEN
        INSERT INTO agenda_activity_logs (user_id, action, event_id, details, created_at)
        VALUES (NEW.created_by, 'update_event', NEW.id, CONCAT('Evento "', NEW.title, '" modificato: ', changes), NOW());
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `agenda_events_before_delete` BEFORE DELETE ON `agenda_events` FOR EACH ROW BEGIN
    INSERT INTO agenda_activity_logs (user_id, action, event_id, details, created_at)
    VALUES (OLD.created_by, 'delete_event', OLD.id, CONCAT('Evento "', OLD.title, '" eliminato'), NOW());
END
$$
DELIMITER ;

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `agenda_events`
--
ALTER TABLE `agenda_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_datetime` (`start_datetime`,`end_datetime`),
  ADD KEY `idx_assigned_to` (`assigned_to`),
  ADD KEY `idx_client_id` (`client_id`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_events_date_range` (`start_datetime`,`end_datetime`),
  ADD KEY `idx_events_status_date` (`status`,`start_datetime`),
  ADD KEY `idx_agenda_events_dates` (`start_datetime`,`end_datetime`),
  ADD KEY `idx_agenda_events_category` (`category_id`,`start_datetime`),
  ADD KEY `idx_agenda_events_status` (`status`,`start_datetime`),
  ADD KEY `idx_agenda_events_creator` (`created_by`,`created_at`),
  ADD KEY `idx_events_user_date` (`created_by`,`start_datetime`,`status`),
  ADD KEY `idx_events_category_date` (`category_id`,`start_datetime`,`status`),
  ADD KEY `idx_start_datetime` (`start_datetime`),
  ADD KEY `idx_created_by` (`created_by`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `agenda_events`
--
ALTER TABLE `agenda_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=476;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `agenda_events`
--
ALTER TABLE `agenda_events`
  ADD CONSTRAINT `agenda_events_client_fk` FOREIGN KEY (`client_id`) REFERENCES `leads_contacts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `agenda_events_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `agenda_categories` (`id`),
  ADD CONSTRAINT `agenda_events_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `agenda_events_ibfk_4` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

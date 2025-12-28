-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Creato il: Dic 22, 2025 alle 15:15
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
-- Struttura della tabella `finance_transactions`
--

CREATE TABLE `finance_transactions` (
  `id` int(11) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `category_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` date NOT NULL,
  `description` varchar(500) NOT NULL,
  `source` varchar(255) DEFAULT NULL COMMENT 'Cliente/Fornitore',
  `payment_method_id` int(11) DEFAULT NULL,
  `invoice_id` int(11) DEFAULT NULL COMMENT 'Collegamento a fattura se presente',
  `is_recurring` tinyint(1) DEFAULT 0,
  `recurring_interval` enum('monthly','quarterly','yearly') DEFAULT NULL,
  `attachment_path` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dump dei dati per la tabella `finance_transactions`
--

INSERT INTO `finance_transactions` (`id`, `type`, `category_id`, `amount`, `date`, `description`, `source`, `payment_method_id`, `invoice_id`, `is_recurring`, `recurring_interval`, `attachment_path`, `notes`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'income', 1, 469.00, '2025-01-15', 'Fattura #012025 - Social Media Management - mese di gennaio 2025', 'Tecnorete Villafranca', 1, 14, 0, NULL, NULL, NULL, 3, '2025-08-14 08:09:34', '2025-08-14 14:34:39'),
(5, 'income', 1, 469.00, '2025-08-11', 'Fattura #142025 - SOCIAL MEDIA MANAGEMENT', 'Tecnorete Villafranca', 1, 27, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:45:03'),
(6, 'income', 1, 469.00, '2025-07-10', 'Fattura #132025 - OGGETTO: SOCIAL MEDIA MANAGEMENT', 'Tecnorete Villafranca', 1, 26, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:45:24'),
(7, 'income', 1, 469.00, '2025-06-09', 'Fattura #122025 - SOCIAL MEDIA MANAGEMENT', 'Tecnorete Villafranca', 1, 25, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:45:49'),
(8, 'income', 1, 996.00, '2025-06-23', 'Fattura #112025 - PIANO SOCIAL MEDIA DESIGN PER 4 MESI', 'ValeDent (Serimedical S.R.L.)', 1, 24, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:40:00'),
(9, 'income', 1, 469.00, '2025-05-12', 'Fattura #102025 - SOCIAL MEDIA MANAGEMENT', 'Tecnorete Villafranca', 1, 23, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:37:31'),
(10, 'income', 1, 690.00, '2025-04-25', 'Fattura #082025 - DESIGN DEL LOGO', 'Alessandro Acquaviva', 1, 21, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:36:56'),
(11, 'income', 1, 469.00, '2025-04-14', 'Fattura #092025 - SOCIAL MEDIA MANAGEMENT', 'Tecnorete Villafranca', 1, 22, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:37:08'),
(12, 'income', 1, 1078.00, '2025-04-24', 'Fattura #072025 - SOCIAL MEDIA MANAGEMENT', 'ValeDent (Serimedical S.R.L.)', 1, 20, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:36:37'),
(13, 'income', 1, 469.00, '2025-03-17', 'Fattura #062025 - SOCIAL MEDIA MANAGEMENT', 'Tecnorete Villafranca', 1, 19, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:36:23'),
(14, 'income', 1, 2000.00, '2025-02-20', 'Fattura #052025 - PERCORSO BESPOKE', 'PagheSolution', 1, 18, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:36:10'),
(15, 'income', 1, 469.00, '2025-02-14', 'Fattura #042025 - SOCIAL MEDIA MANAGEMENT', 'Tecnorete Villafranca', 1, 17, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:35:52'),
(16, 'income', 1, 20.50, '2025-03-12', 'Fattura #032025 - ACQUISTO ESPOSITORE', 'ValeDent (Serimedical S.R.L.)', 1, 16, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:35:34'),
(17, 'income', 1, 1078.00, '2025-02-05', 'Fattura #022025 - SOCIAL MEDIA MANAGEMENT', 'ValeDent (Serimedical S.R.L.)', 1, 15, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 14:35:06'),
(18, 'income', 1, 2150.00, '2025-01-20', 'Fattura #182024 - CREAZIONE BRAND IDENTITY', 'Marco Frezza', 1, 28, 0, NULL, NULL, NULL, 2, '2025-08-14 13:51:07', '2025-08-14 13:51:07'),
(21, 'expense', 8, 15.99, '2025-01-08', 'Registrazione dominio mcsol.it', 'MC SOLUTIONS', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:08:40', '2025-08-14 14:08:40'),
(22, 'expense', 14, 1075.00, '2025-01-20', 'Stipendio Davide', NULL, NULL, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:09:23', '2025-08-14 14:09:23'),
(23, 'expense', 14, 1075.00, '2025-01-20', 'Stipendio Stefano', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:09:59', '2025-08-14 14:09:59'),
(24, 'expense', 11, 12.00, '2025-01-30', 'Sponsorizzazioni ADS Google', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:12:45', '2025-08-14 14:12:45'),
(25, 'expense', 25, 500.00, '2025-01-31', 'Affitto ufficio febbraio', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:13:09', '2025-08-14 14:13:09'),
(26, 'expense', 12, 20.50, '2025-02-03', 'Anticipo espositore ValeDent', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:13:37', '2025-08-14 14:13:37'),
(27, 'expense', 25, 500.00, '2025-02-28', 'Affitto ufficio marzo', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:14:00', '2025-08-14 14:14:00'),
(28, 'expense', 18, 21.70, '2025-03-03', 'Pranzo @Bauli', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:14:34', '2025-08-14 14:14:34'),
(29, 'expense', 10, 143.52, '2025-03-03', 'Rinnovo hosting 48 mesi', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:15:06', '2025-08-14 14:15:06'),
(30, 'expense', 9, 11.99, '2025-03-10', 'Capcut mensile marzo', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:15:29', '2025-08-14 14:15:29'),
(31, 'expense', 12, 19.00, '2025-03-11', 'Incisione e smaltatura targa', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:15:53', '2025-08-14 14:15:53'),
(32, 'expense', 11, 16.00, '2025-03-27', 'Sponsorizzate Meta ADS', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:16:11', '2025-08-14 14:16:11'),
(33, 'expense', 25, 500.00, '2025-03-31', 'Affitto ufficio aprile', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:16:34', '2025-08-14 14:16:34'),
(34, 'expense', 11, 20.00, '2025-04-02', 'ADS Call 30 minuti', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:17:00', '2025-08-14 14:17:00'),
(35, 'expense', 9, 18.00, '2025-04-03', 'ChatGPT+ Aprile', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:17:23', '2025-08-14 14:17:23'),
(36, 'expense', 14, 1415.00, '2025-04-11', 'Stipendi aprile', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:17:46', '2025-08-14 14:17:46'),
(37, 'expense', 18, 85.00, '2025-04-26', 'Nomadness, G&V, pizza', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:18:20', '2025-08-14 14:18:20'),
(38, 'expense', 14, 539.00, '2025-04-28', 'Stipendio Stefano', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:18:45', '2025-08-14 14:18:45'),
(39, 'expense', 25, 500.00, '2025-04-30', 'Affitto ufficio maggio', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:19:09', '2025-08-14 14:19:09'),
(40, 'expense', 14, 539.00, '2025-05-02', 'Stipendio Davide', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:19:37', '2025-08-14 14:19:37'),
(41, 'expense', 10, 11.00, '2025-05-02', 'Registrazione dominio studiomismo.it', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:19:59', '2025-08-14 14:19:59'),
(42, 'expense', 9, 17.94, '2025-05-04', 'ChatGPT+ maggio', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:20:27', '2025-08-14 14:20:27'),
(43, 'expense', 9, 23.98, '2025-05-05', 'CapCut maggio', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:20:55', '2025-08-14 14:20:55'),
(44, 'expense', 14, 150.00, '2025-05-08', 'Stipendio Cristian', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:21:24', '2025-08-14 14:21:24'),
(45, 'expense', 25, 500.00, '2025-05-30', 'Affitto ufficio giugno', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:22:12', '2025-08-14 14:22:12'),
(46, 'expense', 14, 1200.00, '2025-05-30', 'Stipendi maggio', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:22:36', '2025-08-14 14:22:36'),
(47, 'expense', 18, 149.00, '2025-06-11', 'Registrazione marchio Mismo', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:23:03', '2025-08-14 14:23:03'),
(48, 'expense', 9, 22.00, '2025-06-16', 'Abbonamento Claude giugno', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:23:25', '2025-08-14 14:23:25'),
(49, 'expense', 14, 996.00, '2025-06-24', 'Stipendi giugno', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:23:50', '2025-08-14 14:23:50'),
(50, 'expense', 11, 40.00, '2025-06-26', 'Meta ADS e Google ADS', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:24:25', '2025-08-14 14:24:25'),
(51, 'expense', 18, 107.00, '2025-06-26', 'Spese varie', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:25:15', '2025-08-14 14:25:15'),
(52, 'expense', 25, 500.00, '2025-06-30', 'Affitto ufficio luglio', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:25:58', '2025-08-14 14:25:58'),
(53, 'expense', 11, 50.00, '2025-07-08', 'Campagne ADS Summer Brand Boost', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:26:27', '2025-08-14 14:26:27'),
(54, 'expense', 9, 22.00, '2025-07-14', 'Abbonamento Claude luglio', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:27:56', '2025-08-14 14:27:56'),
(55, 'expense', 9, 11.50, '2025-07-22', 'Abbonamento Notion agosto', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:28:18', '2025-08-14 14:28:18'),
(56, 'expense', 9, 18.00, '2025-07-24', 'Abbonamento Claude agosto per Mismo', 'Anthropic', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:28:39', '2025-08-25 14:00:08'),
(57, 'expense', 9, 20.00, '2025-07-31', 'Spesa Esselunga', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:29:01', '2025-08-14 14:29:01'),
(58, 'expense', 10, 15.99, '2025-07-31', 'Registrazione dominio frilens.it', 'Hostinger', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:29:22', '2025-08-25 13:59:56'),
(59, 'expense', 25, 500.00, '2025-08-01', 'Affitto ufficio agosto', 'Francesca Miazzi', 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:29:39', '2025-08-14 14:48:09'),
(60, 'expense', 11, 24.50, '2025-08-01', 'Google ADS', 'Google', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 14:30:13', '2025-08-14 14:47:50'),
(61, 'income', 24, 258.52, '2025-01-01', 'Saldo iniziale', NULL, 9, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 15:02:07', '2025-08-14 15:02:07'),
(62, 'expense', 18, 46.22, '2025-08-14', 'Spese varie', NULL, 9, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-14 15:04:34', '2025-08-14 15:04:34'),
(63, 'expense', 9, 18.00, '2025-08-20', 'Abbonamento Claude Burrito', 'Anthropic', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-20 14:16:23', '2025-08-25 13:59:45'),
(64, 'expense', 18, 7.23, '2025-08-19', 'Spesa ufficio', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-08-20 14:17:02', '2025-08-20 14:17:02'),
(65, 'expense', 9, 18.00, '2025-08-24', 'Abbonamento Claude agosto', 'Anthropic', 3, NULL, 0, 'monthly', NULL, NULL, 3, '2025-08-25 13:58:55', '2025-08-25 14:00:24'),
(66, 'income', 24, 14.00, '2025-08-27', 'Vendita quadretti Pattyland su Subito', NULL, 1, NULL, 0, 'monthly', NULL, NULL, 3, '2025-08-27 12:50:22', '2025-08-27 12:50:22'),
(67, 'expense', 11, 31.13, '2025-09-01', 'Google ADS Agosto', 'Google', 3, NULL, 0, 'monthly', NULL, NULL, 3, '2025-09-01 16:07:47', '2025-09-01 16:07:47'),
(68, 'expense', 25, 500.00, '2025-09-01', 'Affitto mese di Settembre', 'Francesca Miazzi', 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-09-01 16:28:58', '2025-09-26 12:04:18'),
(69, 'income', 24, 12.00, '2025-09-04', 'Vendita Vinted', 'Vinted', 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-09-15 14:22:18', '2025-09-26 12:04:10'),
(70, 'expense', 18, 6.00, '2025-09-04', 'Aperitivo', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-09-15 14:22:50', '2025-09-15 14:22:50'),
(71, 'income', 24, 16.00, '2025-09-16', 'Vendita Vinted', 'Vinted', 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-09-16 08:03:56', '2025-09-26 12:04:01'),
(72, 'income', 24, 25.00, '2025-09-22', 'Vendita sedia Jysk', 'Subito', 5, NULL, 0, 'monthly', NULL, NULL, 3, '2025-09-22 14:30:44', '2025-09-26 12:03:43'),
(73, 'income', 24, 6.00, '2025-09-22', 'Vendita 3 spille su Vinted', 'Vinted', 1, NULL, 0, 'monthly', NULL, NULL, 3, '2025-09-22 14:53:11', '2025-09-26 12:03:51'),
(74, 'expense', 18, 1.50, '2025-09-17', 'Parcheggio Via Città di Nimes', 'AMT S.p.A.', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-09-22 14:54:23', '2025-09-22 14:54:23'),
(75, 'income', 1, 469.00, '2025-09-24', 'Fattura #152025 - Social Media Management - mese di settembre 2025', 'Tecnorete Villafranca', 1, 32, 0, NULL, NULL, NULL, 3, '2025-09-24 09:56:52', '2025-09-24 09:56:52'),
(76, 'expense', 18, 38.20, '2025-09-25', 'Cena Old Wild West Adigeo', 'Old Wild West', 5, NULL, 0, 'monthly', NULL, NULL, 3, '2025-09-26 12:03:13', '2025-09-26 12:03:13'),
(77, 'expense', 18, 12.49, '2025-09-26', 'Software + Varie', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-09-26 13:47:18', '2025-09-26 13:47:18'),
(78, 'expense', 8, 39.99, '2025-10-01', 'Attivazione Iliad', 'Iliad', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-01 16:26:04', '2025-10-01 16:26:04'),
(79, 'expense', 11, 31.08, '2025-10-01', 'Google ADS Settembre', 'Google', 2, NULL, 1, 'monthly', NULL, NULL, 3, '2025-10-01 16:26:34', '2025-10-01 16:26:34'),
(80, 'expense', 18, 3.60, '2025-10-01', 'Caffè e acqua', NULL, 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-01 16:27:26', '2025-10-01 16:28:10'),
(81, 'expense', 18, 6.60, '2025-10-03', 'Colazione da Dersut San Martino', 'Dersut', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-03 09:59:26', '2025-10-03 09:59:26'),
(82, 'expense', 18, 3.00, '2025-10-03', 'Copia chiave ufficio Pescantina', 'Fer Color', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-06 13:31:28', '2025-10-06 13:31:28'),
(83, 'expense', 18, 46.90, '2025-10-05', 'Materiali per nuovo ufficio', 'Action Bussolengo', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-06 13:32:01', '2025-10-06 13:32:01'),
(84, 'expense', 18, 38.80, '2025-10-06', 'Lampada led per ufficio', 'SiLamp', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-06 13:32:25', '2025-10-06 13:32:25'),
(85, 'expense', 9, 10.16, '2025-10-06', 'Acquisto dominio studiomismo.com', 'Hostinger', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-06 13:32:47', '2025-10-06 13:32:47'),
(87, 'income', 1, 365.00, '2025-10-07', 'Fattura #172025 - Social Media Management - mese di Ottobre 2025', 'Industriale Cremona SRL', 1, 34, 0, NULL, NULL, NULL, 2, '2025-10-07 08:29:57', '2025-10-07 08:29:57'),
(89, 'expense', 11, 7.86, '2025-10-08', 'Meta ADS settembre', 'Meta', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-08 09:52:52', '2025-10-08 09:52:52'),
(90, 'expense', 18, 96.34, '2025-10-08', 'Materiali per restauro ufficio', 'Leroy Merlin', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-09 12:58:13', '2025-10-09 12:58:13'),
(91, 'expense', 18, 3.40, '2025-10-07', 'Caffè', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-09 12:58:53', '2025-10-09 12:58:53'),
(92, 'expense', 18, 200.80, '2025-10-10', 'Materiali per nuovo ufficio', 'Ikea', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-10 09:56:32', '2025-10-10 09:56:32'),
(93, 'expense', 18, 3.60, '2025-10-11', 'Caffè', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-12 13:09:46', '2025-10-12 13:09:46'),
(94, 'expense', 18, 14.61, '2025-10-12', 'Oggetti Action', 'Action Bussolengo', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-10-13 10:19:50', '2025-10-14 09:46:39'),
(95, 'expense', 18, 5.60, '2025-10-14', 'Colazione', 'Kiss Bar 2.0', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-14 09:47:06', '2025-10-14 09:47:06'),
(96, 'expense', 18, 4.80, '2025-10-15', 'Paste per meeting', 'Pasticceria Le Arche', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-17 10:19:11', '2025-10-17 10:19:11'),
(97, 'expense', 18, 80.39, '2025-10-17', 'Binari per porte scorrevoli', 'Amazon', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-17 10:19:45', '2025-10-17 10:19:45'),
(98, 'expense', 18, 6.50, '2025-10-15', 'Stucco', 'Fer Color', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-17 10:20:08', '2025-10-17 10:20:08'),
(99, 'expense', 18, 5.45, '2025-10-17', 'Materiali per nuovo ufficio', 'Obi Grande Mela', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-20 12:38:30', '2025-10-20 12:38:30'),
(100, 'expense', 18, 5.63, '2025-10-20', 'Lampadine', 'Action Bussolengo', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-20 12:38:48', '2025-10-20 12:38:48'),
(101, 'income', 24, 40.20, '2025-10-21', 'Rimborso binario porte scorrevoli difettoso', 'Amazon', 2, NULL, 0, 'monthly', NULL, 'Rimborsato su CC Davide', 3, '2025-10-20 12:39:35', '2025-10-25 09:34:13'),
(102, 'expense', 18, 16.80, '2025-10-20', 'Materiali per nuovo ufficio', 'Tecnomat Verona', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-21 08:07:56', '2025-10-21 08:07:56'),
(103, 'income', 1, 469.00, '2025-10-20', 'Fattura #182025 - SOCIAL MEDIA MANAGEMENT - MESE DI OTTOBRE 2025', 'Tecnorete Villafranca', 1, 35, 0, NULL, NULL, NULL, 2, '2025-10-21 08:08:20', '2025-10-21 08:08:20'),
(104, 'expense', 12, 105.90, '2025-10-21', 'Pagamento pannelli porte in MDF', 'Tecnomat Verona', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-10-21 20:48:44', '2025-10-21 20:48:44'),
(105, 'expense', 18, 3.60, '2025-10-21', 'Caffè', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-10-21 20:49:18', '2025-10-21 20:49:18'),
(106, 'income', 1, 500.00, '2025-10-23', 'Fattura #192025 - PRIMA RATA BRAND IDENTITY', 'ValpoStay / Marianna Marconi', 1, 36, 0, NULL, NULL, NULL, 2, '2025-10-23 09:44:03', '2025-10-23 09:44:03'),
(107, 'income', 1, 500.00, '2025-10-23', 'Fattura #192025 - PRIMA RATA BRAND IDENTITY', 'ValpoStay / Marianna Marconi', 1, 36, 0, NULL, NULL, NULL, 2, '2025-10-23 09:44:03', '2025-10-23 09:44:03'),
(108, 'expense', 18, 500.00, '2025-10-23', 'Fattura ValpoStay stornata', NULL, 9, NULL, 0, 'monthly', NULL, NULL, 2, '2025-10-23 09:53:03', '2025-10-25 09:35:18'),
(109, 'expense', 18, 20.90, '2025-10-22', 'Materiali per nuovo ufficio', 'Obi Grande Mela', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-25 09:34:56', '2025-10-25 09:34:56'),
(110, 'expense', 18, 3.40, '2025-10-23', 'Caffè', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-25 09:35:43', '2025-10-25 09:35:43'),
(111, 'expense', 9, 29.99, '2025-10-25', 'Adobe Creative Cloud', 'Adobe Systems', 2, NULL, 1, 'monthly', NULL, NULL, 3, '2025-10-25 09:36:14', '2025-10-25 09:36:14'),
(112, 'expense', 18, 9.90, '2025-10-24', 'Lame per seghetto', 'Ferexpert Verona', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-25 09:36:54', '2025-10-25 09:36:54'),
(113, 'expense', 18, 5.00, '2025-10-25', 'Colazione', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-25 09:37:11', '2025-10-25 09:37:11'),
(114, 'expense', 18, 150.00, '2025-10-24', 'Graffiti Pablo', 'Pablo', 5, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-25 09:37:50', '2025-10-25 09:37:50'),
(115, 'expense', 25, 300.00, '2025-10-27', 'Parcella Verona Industriale - Michele', NULL, 5, NULL, 0, 'monthly', NULL, NULL, 2, '2025-10-27 15:46:41', '2025-10-27 15:46:41'),
(116, 'expense', 18, 27.02, '2025-10-27', 'Materiali per nuovo ufficio', 'Action Bussolengo', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-10-27 15:47:32', '2025-10-27 15:47:32'),
(117, 'expense', 18, 1.20, '2025-10-28', 'Caffè', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-28 10:18:58', '2025-10-28 10:18:58'),
(118, 'expense', 25, 441.50, '2025-10-29', 'Caparra 3 mensilità', 'Anna Bonzanini', 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-10-29 16:08:59', '2025-10-29 16:08:59'),
(119, 'expense', 12, 9.72, '2025-10-29', 'Luce di emergenza + presa smart', 'Vinted', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-10-29 16:10:35', '2025-10-29 16:10:35'),
(120, 'expense', 18, 2.40, '2025-10-29', 'Caffè', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-10-29 16:11:58', '2025-10-29 16:11:58'),
(121, 'income', 1, 249.00, '2025-10-30', 'Fattura #202025 - PIANO SOCIAL BASIC PER VALEDENT MESE DI NOVEMBRE 2025', 'ValeDent (Serimedical S.R.L.)', 1, 37, 0, NULL, NULL, NULL, 2, '2025-10-31 09:25:42', '2025-10-31 09:25:42'),
(122, 'expense', 18, 1.20, '2025-10-31', 'Caffè', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-31 10:44:00', '2025-11-02 17:16:18'),
(123, 'expense', 8, 25.99, '2025-10-31', 'Iliad', 'Iliad', 2, NULL, 1, 'monthly', NULL, NULL, 3, '2025-10-31 10:44:24', '2025-10-31 10:44:24'),
(124, 'expense', 13, 74.70, '2025-10-31', 'Accantonamento 30% fattura 20/2025', 'Trade Republic', 1, NULL, 0, 'monthly', NULL, 'Wallet Stefano', 3, '2025-10-31 11:14:28', '2025-10-31 11:14:28'),
(125, 'expense', 10, 33.00, '2025-10-31', 'Prima rata Microfoni DJI', 'DJI/Klarna', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-10-31 11:20:20', '2025-10-31 11:20:20'),
(126, 'expense', 11, 30.94, '2025-11-01', 'Google ADS Ottobre', 'Google', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-02 17:15:17', '2025-11-02 17:15:17'),
(127, 'expense', 9, 18.00, '2025-11-05', 'Abbonamento Claude', 'Anthropic', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-05 16:04:07', '2025-11-05 16:04:07'),
(128, 'expense', 18, 4.60, '2025-11-06', 'Caffè e acqua', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-06 10:46:49', '2025-11-06 10:46:49'),
(129, 'expense', 18, 2.40, '2025-11-07', 'Caffè', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-07 14:53:09', '2025-11-07 14:53:09'),
(130, 'expense', 18, 9.90, '2025-11-08', 'Caraffa Brita', 'Kasanova', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-09 15:46:29', '2025-11-09 15:46:29'),
(131, 'expense', 18, 1.59, '2025-11-08', 'Profumatori', 'Action Bussolengo', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-09 15:47:04', '2025-11-09 15:47:04'),
(132, 'expense', 16, 17.71, '2025-11-12', 'Pieno metano Davide', 'B Fuel Villafranca', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-12 13:57:48', '2025-11-12 13:57:48'),
(133, 'income', 1, 565.00, '2025-11-13', 'Fattura #232025 - Social Media Management - mese di Novembre 2025 + 2 Shooting', 'Industriale Cremona SRL', 1, 40, 0, NULL, NULL, NULL, 2, '2025-11-15 16:53:28', '2025-11-15 16:53:28'),
(134, 'expense', 18, 4.90, '2025-11-12', 'Stampa materiali per Tecnorete e Tecnocasa', 'Officina della Stampa Pescantina', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-15 16:55:09', '2025-11-15 16:55:09'),
(135, 'expense', 16, 21.90, '2025-11-14', 'Autostrada', 'Autostrada e Brebemi', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-15 16:56:10', '2025-11-15 16:56:10'),
(136, 'expense', 16, 23.90, '2025-11-14', 'Pranzo McDonald\'s Crema', 'McDonald\'s', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-15 16:56:55', '2025-11-15 16:56:55'),
(137, 'expense', 25, 300.00, '2025-11-15', 'Affitto mese di novembre 2025', 'Anna Bonzanini', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-15 16:57:18', '2025-11-15 16:57:18'),
(138, 'expense', 8, 25.99, '2025-11-16', 'Iliad - mese di novembre', 'Iliad', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-16 15:56:43', '2025-11-16 15:56:43'),
(139, 'income', 1, 469.00, '2025-11-17', 'Fattura #222025 - SOCIAL MEDIA MANAGEMENT - MESE DI NOVEMBRE 2025', 'Tecnorete Villafranca', 1, 39, 0, NULL, NULL, NULL, 2, '2025-11-18 09:10:23', '2025-11-18 09:10:23'),
(140, 'income', 1, 300.00, '2025-11-17', 'Fattura #212025 - Implementazioni design e sviluppo back-end per paghesolution.it', 'PagheSolution', 1, 38, 0, NULL, NULL, NULL, 3, '2025-11-18 09:10:34', '2025-11-18 09:10:34'),
(141, 'expense', 9, 2.39, '2025-11-18', 'Capcut novembre', 'Capcut', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-18 14:08:50', '2025-11-18 14:08:50'),
(142, 'expense', 13, 137.00, '2025-11-18', 'Accantonamento fattura 23/2025', NULL, 1, NULL, 0, 'monthly', NULL, 'Trade republic Davide', 2, '2025-11-18 14:14:32', '2025-11-18 14:14:32'),
(143, 'expense', 13, 187.00, '2025-11-18', 'Accantonamento fatture 21/2025 e 22/2025', 'Trade Republic', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-18 14:15:58', '2025-11-18 14:15:58'),
(144, 'expense', 16, 30.00, '2025-11-20', 'Benzina Stefano', 'Esso Negrar', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-20 16:41:07', '2025-11-20 16:41:07'),
(145, 'expense', 16, 12.00, '2025-11-21', 'Parcheggio Cremona', 'Saba Italia', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-22 16:43:23', '2025-11-22 16:43:23'),
(146, 'expense', 9, 29.99, '2025-11-23', 'Adobe Creative Cloud', 'Adobe Systems', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-23 17:22:03', '2025-11-23 17:22:03'),
(147, 'expense', 18, 3.00, '2025-11-26', 'Caffè Bardolino', 'Caffè Matteotti', NULL, NULL, 0, 'monthly', NULL, NULL, 2, '2025-11-26 17:18:50', '2025-11-26 17:18:50'),
(148, 'expense', 12, 35.04, '2025-11-26', 'Ordine arredamento Aliexpress', 'Aliexpress', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-11-26 17:19:36', '2025-11-26 17:19:36'),
(149, 'expense', 12, 10.63, '2025-11-26', 'Materiali ufficio Aliexpress', 'Aliexpress', 2, NULL, 0, 'monthly', NULL, NULL, 2, '2025-11-26 17:39:01', '2025-11-26 17:39:01'),
(150, 'expense', 9, 29.99, '2025-11-27', 'Abbonamento CupCut', 'CupCut', 2, NULL, 0, 'monthly', NULL, '27 Novembre - 27 Dicembre', 2, '2025-11-27 17:23:02', '2025-11-27 17:23:02'),
(151, 'expense', 18, 5.36, '2025-11-28', 'Forniture ufficio', 'Migross', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-30 15:42:50', '2025-11-30 15:42:50'),
(152, 'expense', 18, 3.60, '2025-11-28', 'Caffè', 'Tognato Rodrigo', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-30 15:43:14', '2025-11-30 15:43:14'),
(153, 'expense', 10, 33.00, '2025-11-30', 'Seconda rata microfoni DJI', 'DJI/Klarna', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-30 15:43:41', '2025-11-30 15:43:41'),
(154, 'expense', 16, 60.00, '2025-11-28', 'Rimborso abbonamento ATV Giulia novembre', 'Giulia Selmo', 1, NULL, 0, 'monthly', NULL, NULL, 3, '2025-11-30 15:44:38', '2025-11-30 15:44:38'),
(155, 'expense', 11, 24.34, '2025-12-01', 'Google ADS novembre', 'Google', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-02 17:03:07', '2025-12-02 17:03:07'),
(156, 'expense', 18, 4.04, '2025-12-01', 'Chiave e scatola derivazione', 'Obi Grande Mela', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-02 17:03:41', '2025-12-02 17:03:41'),
(157, 'income', 1, 249.00, '2025-12-05', 'Fattura #242025 - Gestione profilo social di ValeDent - mese di dicembre 2025', 'ValeDent (Serimedical S.R.L.)', 1, 41, 0, NULL, NULL, NULL, 3, '2025-12-06 09:54:08', '2025-12-06 09:54:08'),
(158, 'expense', 18, 3.90, '2025-12-05', 'Caffè', 'La Forchetta De Bacco', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-06 09:54:58', '2025-12-06 09:54:58'),
(159, 'expense', 9, 18.00, '2025-12-05', 'Claude dicembre', 'Anthropic', 1, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-06 09:55:28', '2025-12-06 09:55:28'),
(160, 'income', 1, 469.00, '2025-12-10', 'Fattura #252025 - Avvio e gestione profili Instagram e Facebook per Tecnocasa Bardolino - mese di dicembre 2025', 'Studio Bardolino SRL (Pietro Oltramari)', 1, 42, 0, NULL, NULL, NULL, 3, '2025-12-10 13:54:08', '2025-12-10 13:54:08'),
(161, 'expense', 18, 9.00, '2025-12-09', 'Materiali per nuovo ufficio', 'IKEA', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-10 14:14:25', '2025-12-10 14:14:25'),
(162, 'expense', 13, 61.00, '2025-12-10', 'Accantonamento fattura 24/2025', 'Trade Republic', 1, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-10 14:14:56', '2025-12-10 14:14:56'),
(163, 'expense', 13, 115.00, '2025-12-10', 'Accantonamento fattura 25/2025', 'Pietro Oltremari', 9, NULL, 0, 'monthly', NULL, NULL, 2, '2025-12-10 14:49:14', '2025-12-10 14:49:14'),
(164, 'expense', 16, 0.90, '2025-12-11', 'Autostrada', 'Autostrada A4', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-12 10:26:05', '2025-12-12 10:26:05'),
(165, 'income', 24, 22.00, '2025-12-11', 'Vendita microfoni su Vinted', 'Mangopay', 1, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-12 10:26:37', '2025-12-12 10:26:37'),
(166, 'expense', 11, 39.39, '2025-12-12', 'Vetrofanie per ufficio', 'Pixartprinting', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-12 10:27:15', '2025-12-12 10:27:15'),
(167, 'expense', 25, 300.00, '2025-12-15', 'Affitto mese di Dicembre', 'Bonzanini Anna', 1, NULL, 0, 'monthly', NULL, NULL, 2, '2025-12-15 14:12:31', '2025-12-15 14:12:31'),
(168, 'expense', 18, 2.60, '2025-12-16', 'Caffè', 'Osteria Colombo Bardolino', 2, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-17 10:08:13', '2025-12-17 10:08:13'),
(169, 'expense', 8, 25.99, '2025-12-16', 'Iliad', 'Iliad', 1, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-17 10:08:39', '2025-12-17 10:08:39'),
(170, 'expense', 8, 54.33, '2025-12-18', 'Bolletta corrente ottobre', 'Edison SPA', 1, NULL, 0, 'monthly', NULL, NULL, 3, '2025-12-22 13:35:23', '2025-12-22 13:36:03');

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `finance_transactions`
--
ALTER TABLE `finance_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_category` (`category_id`),
  ADD KEY `idx_payment_method` (`payment_method_id`),
  ADD KEY `idx_invoice` (`invoice_id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_date_type` (`date`,`type`),
  ADD KEY `idx_month` (`date`,`type`,`category_id`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `finance_transactions`
--
ALTER TABLE `finance_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=171;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `finance_transactions`
--
ALTER TABLE `finance_transactions`
  ADD CONSTRAINT `fk_finance_category` FOREIGN KEY (`category_id`) REFERENCES `finance_categories` (`id`),
  ADD CONSTRAINT `fk_finance_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `fatture` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_finance_payment` FOREIGN KEY (`payment_method_id`) REFERENCES `finance_payment_methods` (`id`),
  ADD CONSTRAINT `fk_finance_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

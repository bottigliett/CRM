-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Creato il: Dic 22, 2025 alle 15:14
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
-- Struttura della tabella `finance_categories`
--

CREATE TABLE `finance_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `color` varchar(7) DEFAULT '#37352f',
  `icon` varchar(10) DEFAULT '?',
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dump dei dati per la tabella `finance_categories`
--

INSERT INTO `finance_categories` (`id`, `name`, `type`, `color`, `icon`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Fatture Clienti', 'income', '#22c55e', '📄', 'Entrate da fatture emesse', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(2, 'Consulenze', 'income', '#3b82f6', '💼', 'Entrate da consulenze', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(3, 'Formazione', 'income', '#8b5cf6', '🎓', 'Entrate da corsi e formazione', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(4, 'Progetti Web', 'income', '#06b6d4', '🌐', 'Entrate da sviluppo web', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(5, 'Marketing', 'income', '#f59e0b', '📈', 'Entrate da servizi marketing', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(6, 'Altri Ricavi', 'income', '#64748b', '💰', 'Altri tipi di entrate', 0, '2025-08-13 15:56:28', '2025-08-14 08:22:02'),
(7, 'Affitto', 'expense', '#ef4444', '🏢', 'Spese per affitto ufficio', 0, '2025-08-13 15:56:28', '2025-08-14 08:21:48'),
(8, 'Utenze', 'expense', '#f97316', '💡', 'Bollette e utenze varie', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(9, 'Software', 'expense', '#8b5cf6', '💻', 'Licenze software e abbonamenti', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(10, 'Hardware', 'expense', '#6366f1', '🖥️', 'Acquisto hardware e attrezzature', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(11, 'Marketing/Pubblicità', 'expense', '#ec4899', '📢', 'Spese pubblicitarie e marketing', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(12, 'Fornitori', 'expense', '#14b8a6', '📦', 'Pagamenti a fornitori', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(13, 'Tasse', 'expense', '#dc2626', '🏛️', 'Tasse e imposte', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(14, 'Stipendi', 'expense', '#059669', '👥', 'Stipendi e compensi', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(15, 'Consulenze', 'expense', '#7c3aed', '🤝', 'Spese per consulenze esterne', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(16, 'Viaggi', 'expense', '#0ea5e9', '✈️', 'Spese di viaggio e trasferte', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(17, 'Formazione', 'expense', '#84cc16', '📚', 'Corsi e formazione professionale', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(18, 'Varie', 'expense', '#737373', '📌', 'Spese varie e generiche', 1, '2025-08-13 15:56:28', '2025-08-13 15:56:28'),
(19, 'Fatture Clienti', 'income', '#22c55e', '📄', 'Entrate da fatture emesse', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:57'),
(20, 'Consulenze', 'income', '#3b82f6', '💼', 'Entrate da consulenze', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:59'),
(21, 'Formazione', 'income', '#8b5cf6', '🎓', 'Entrate da corsi e formazione', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:54'),
(22, 'Progetti Web', 'income', '#06b6d4', '🌐', 'Entrate da sviluppo web', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:51'),
(23, 'Marketing', 'income', '#f59e0b', '📈', 'Entrate da servizi marketing', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:53'),
(24, 'Altri Ricavi', 'income', '#64748b', '💰', 'Altri tipi di entrate', 1, '2025-08-13 15:57:08', '2025-08-13 15:57:08'),
(25, 'Affitto', 'expense', '#ef4444', '🏢', 'Spese per affitto ufficio', 1, '2025-08-13 15:57:08', '2025-08-13 15:57:08'),
(26, 'Utenze', 'expense', '#f97316', '💡', 'Bollette e utenze varie', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:31'),
(27, 'Software', 'expense', '#8b5cf6', '💻', 'Licenze software e abbonamenti', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:35'),
(28, 'Hardware', 'expense', '#6366f1', '🖥️', 'Acquisto hardware e attrezzature', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:38'),
(29, 'Marketing/Pubblicità', 'expense', '#ec4899', '📢', 'Spese pubblicitarie e marketing', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:37'),
(30, 'Fornitori', 'expense', '#14b8a6', '📦', 'Pagamenti a fornitori', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:39'),
(31, 'Tasse', 'expense', '#dc2626', '🏛️', 'Tasse e imposte', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:32'),
(32, 'Stipendi', 'expense', '#059669', '👥', 'Stipendi e compensi', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:34'),
(33, 'Consulenze', 'expense', '#7c3aed', '🤝', 'Spese per consulenze esterne', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:42'),
(34, 'Viaggi', 'expense', '#0ea5e9', '✈️', 'Spese di viaggio e trasferte', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:27'),
(35, 'Formazione', 'expense', '#84cc16', '📚', 'Corsi e formazione professionale', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:41'),
(36, 'Varie', 'expense', '#737373', '📌', 'Spese varie e generiche', 0, '2025-08-13 15:57:08', '2025-08-14 08:21:29');

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `finance_categories`
--
ALTER TABLE `finance_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_active` (`is_active`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `finance_categories`
--
ALTER TABLE `finance_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

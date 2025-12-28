-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Creato il: Dic 18, 2025 alle 16:29
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
-- Struttura della tabella `agenda_categories`
--

CREATE TABLE `agenda_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `color` varchar(7) DEFAULT '#3b82f6',
  `icon` varchar(20) DEFAULT '?',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dump dei dati per la tabella `agenda_categories`
--

INSERT INTO `agenda_categories` (`id`, `name`, `color`, `icon`, `created_by`, `created_at`, `updated_at`) VALUES
(2, 'Meeting', '#fe4303', '🚗', 1, '2025-07-25 13:53:26', '2025-09-15 15:07:42'),
(4, 'Formazione', '#8b5cf6', '📚', 1, '2025-07-25 13:53:26', '2025-07-25 13:53:26'),
(5, 'Marketing', '#f59e0b', '📢', 1, '2025-07-25 13:53:26', '2025-07-25 13:53:26'),
(22, 'Appuntamenti clienti', '#ffdb59', '☕️', 1, '2025-07-29 17:31:08', '2025-09-17 10:55:56'),
(24, 'Call/Chiamate', '#b40450', '☎️', 1, '2025-07-29 17:31:08', '2025-12-10 15:31:55'),
(25, 'Viaggi/Vacanze', '#1b8eff', '✈️', 1, '2025-07-29 17:31:08', '2025-08-29 16:20:48'),
(27, 'Altro', '#6b7280', '📋', 1, '2025-07-29 17:31:08', '2025-07-29 17:31:08'),
(51, 'Progetti Stefano', '#71e57e', '👨🏻', 2, '2025-07-30 12:53:19', '2025-11-19 15:26:01'),
(52, 'Personale Davide', '#9870f5', '👤', 2, '2025-07-30 12:53:19', '2025-11-19 15:25:49'),
(56, 'Interno', '#3b82f6', '🗂️', 3, '2025-08-29 16:15:14', '2025-08-29 16:15:14'),
(57, 'Sviluppo', '#3bf7b8', '⚙️', 3, '2025-09-01 09:51:09', '2025-09-01 09:52:15'),
(58, 'Personale Giulia', '#ed72fd', '💄', 2, '2025-12-05 10:38:53', '2025-12-05 10:38:53');

--
-- Trigger `agenda_categories`
--
DELIMITER $$
CREATE TRIGGER `agenda_categories_after_insert` AFTER INSERT ON `agenda_categories` FOR EACH ROW BEGIN
    INSERT INTO agenda_activity_logs (user_id, action, category_id, details, created_at)
    VALUES (NEW.created_by, 'create_category', NEW.id, CONCAT('Categoria "', NEW.name, '" creata'), NOW());
END
$$
DELIMITER ;

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `agenda_categories`
--
ALTER TABLE `agenda_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_categories_creator` (`created_by`,`created_at`),
  ADD KEY `idx_categories_name` (`name`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `agenda_categories`
--
ALTER TABLE `agenda_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `agenda_categories`
--
ALTER TABLE `agenda_categories`
  ADD CONSTRAINT `agenda_categories_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

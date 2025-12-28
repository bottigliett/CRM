<?php
/**
 * SISTEMA BACKUP DISCORD - DATABASE COMPLETO
 * Salva tutto il database in un canale Discord ogni giorno
 * 
 * Versione: 1.0
 * Creato per: CRM Studio Mismo
 * Data: 2025-07-30
 */

// =============================================================================
// DEBUG E CONFIGURAZIONE ERRORI
// =============================================================================
error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(300); // 5 minuti timeout

// =============================================================================
// CONFIGURAZIONE
// =============================================================================

// Discord Webhook URL - IL TUO WEBHOOK
$discord_webhook = "https://discord.com/api/webhooks/1400195645775810592/8c2G5wdpjnmkMC88bRDR_LSV4IUVEYFcevOsSv7wDJ23dlZl2kye5e3bJXgOslvCAI8S";

// Impostazioni backup
$backup_filename = 'crm_backup_' . date('Y-m-d_H-i-s') . '.sql';
$backup_path = __DIR__ . '/backups/' . $backup_filename;
$exclude_tables = ['sessions', 'cache', 'temporary']; // Tabelle da escludere
$sensitive_fields = ['password', 'token', 'secret']; // Campi da nascondere

// =============================================================================
// CARICAMENTO CONFIGURAZIONE DATABASE (VERSIONE SICURA)
// =============================================================================

echo "🔍 Lettura configurazione database...<br>";

$config_path = __DIR__ . '/core/config/database.php';

if (file_exists($config_path)) {
    echo "✅ Trovato file config: $config_path<br>";
    
    // Leggi il file come testo per estrarre le credenziali
    $config_content = file_get_contents($config_path);
    
    // Estrai le credenziali usando regex (più sicuro del require)
    $host = 'localhost';
    $dbname = '';
    $username = '';
    $password = '';
    
    // Cerca pattern comuni per le credenziali
    if (preg_match('/[\'"]host[\'"].*?[\'"]([^\'\"]+)[\'"]/', $config_content, $matches)) {
        $host = $matches[1];
    }
    if (preg_match('/[\'"]dbname[\'"].*?[\'"]([^\'\"]+)[\'"]/', $config_content, $matches)) {
        $dbname = $matches[1];
    }
    if (preg_match('/[\'"]username[\'"].*?[\'"]([^\'\"]+)[\'"]/', $config_content, $matches)) {
        $username = $matches[1];
    }
    if (preg_match('/[\'"]password[\'"].*?[\'"]([^\'\"]+)[\'"]/', $config_content, $matches)) {
        $password = $matches[1];
    }
    
    // Cerca anche costanti definite
    if (preg_match('/define\([\'"]DB_HOST[\'"],\s*[\'"]([^\'\"]+)[\'"]/', $config_content, $matches)) {
        $host = $matches[1];
    }
    if (preg_match('/define\([\'"]DB_NAME[\'"],\s*[\'"]([^\'\"]+)[\'"]/', $config_content, $matches)) {
        $dbname = $matches[1];
    }
    if (preg_match('/define\([\'"]DB_USER[\'"],\s*[\'"]([^\'\"]+)[\'"]/', $config_content, $matches)) {
        $username = $matches[1];
    }
    if (preg_match('/define\([\'"]DB_PASS[\'"],\s*[\'"]([^\'\"]+)[\'"]/', $config_content, $matches)) {
        $password = $matches[1];
    }
    
    echo "🔗 Credenziali estratte: $host / $dbname / $username<br>";
    
    if (empty($dbname) || empty($username)) {
        echo "⚠️ Non tutte le credenziali sono state trovate automaticamente<br>";
        echo "📋 Contenuto file config (prime 500 caratteri):<br>";
        echo "<pre>" . htmlspecialchars(substr($config_content, 0, 500)) . "...</pre>";
        
        // CONFIGURAZIONE MANUALE DI EMERGENZA
        echo "<br>🔧 Usa configurazione manuale:<br>";
        $host = 'localhost';
        $dbname = 'u706045794_crm'; // AGGIORNA QUESTO
        $username = 'u706045794_user'; // AGGIORNA QUESTO  
        $password = 'TUA_PASSWORD_QUI'; // AGGIORNA QUESTO
        echo "⚠️ <strong>AGGIORNA LE CREDENZIALI SOPRA NEL CODICE!</strong><br>";
    }
    
} else {
    die("❌ File database.php non trovato in: " . $config_path);
}

// =============================================================================
// FUNZIONI PRINCIPALI
// =============================================================================

function createDatabaseConnection($host, $dbname, $username, $password) {
    try {
        echo "🔗 Connessione a: $host / $dbname<br>";
        
        $pdo = new PDO(
            "mysql:host={$host};dbname={$dbname};charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
        
        // Salva il nome del database per uso successivo
        $GLOBALS['current_database'] = $dbname;
        
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception("Errore connessione database: " . $e->getMessage());
    }
}

function createSQLDump($pdo, $exclude_tables, $sensitive_fields) {
    try {
        // Ottieni il nome del database corrente
        $result = $pdo->query("SELECT DATABASE() as db_name")->fetch();
        $database_name = $result['db_name'];
        
        echo "📋 Creando dump SQL per database: $database_name<br>";
        
        // Inizia il dump SQL
        $sql_dump = "-- =============================================\n";
        $sql_dump .= "-- CRM BACKUP - " . date('Y-m-d H:i:s') . "\n";
        $sql_dump .= "-- Database: $database_name\n";
        $sql_dump .= "-- Generato automaticamente\n";
        $sql_dump .= "-- =============================================\n\n";
        
        $sql_dump .= "SET FOREIGN_KEY_CHECKS=0;\n";
        $sql_dump .= "SET SQL_MODE=\"NO_AUTO_VALUE_ON_ZERO\";\n";
        $sql_dump .= "SET time_zone = \"+00:00\";\n\n";
        
        // Ottieni tutte le tabelle
        $tables_query = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'";
        $stmt = $pdo->prepare($tables_query);
        $stmt->execute([$database_name]);
        
        $tables = [];
        while ($row = $stmt->fetch()) {
            $table_name = $row['TABLE_NAME'];
            if (!in_array($table_name, $exclude_tables)) {
                $tables[] = $table_name;
            }
        }
        
        echo "📊 Processando " . count($tables) . " tabelle<br>";
        
        // Processa ogni tabella
        foreach ($tables as $table) {
            echo "🔄 Backup tabella: $table<br>";
            
            $sql_dump .= "\n-- --------------------------------------------------------\n";
            $sql_dump .= "-- Struttura tabella `$table`\n";
            $sql_dump .= "-- --------------------------------------------------------\n\n";
            
            // DROP TABLE
            $sql_dump .= "DROP TABLE IF EXISTS `$table`;\n";
            
            // CREATE TABLE
            $create_table_query = $pdo->query("SHOW CREATE TABLE `$table`")->fetch();
            $sql_dump .= $create_table_query['Create Table'] . ";\n\n";
            
            // INSERT DATA
            $data_query = $pdo->query("SELECT * FROM `$table`");
            $rows = $data_query->fetchAll();
            
            if (!empty($rows)) {
                $sql_dump .= "-- Dati per la tabella `$table`\n";
                $sql_dump .= "INSERT INTO `$table` VALUES\n";
                
                $values = [];
                foreach ($rows as $row) {
                    $escaped_values = [];
                    foreach ($row as $key => $value) {
                        // Nascondi campi sensibili
                        foreach ($sensitive_fields as $sensitive) {
                            if (stripos($key, $sensitive) !== false) {
                                $value = '***HIDDEN***';
                                break;
                            }
                        }
                        
                        if (is_null($value)) {
                            $escaped_values[] = 'NULL';
                        } else {
                            $escaped_values[] = $pdo->quote($value);
                        }
                    }
                    $values[] = '(' . implode(',', $escaped_values) . ')';
                }
                
                $sql_dump .= implode(",\n", $values) . ";\n\n";
            } else {
                $sql_dump .= "-- Nessun dato nella tabella `$table`\n\n";
            }
        }
        
        $sql_dump .= "\nSET FOREIGN_KEY_CHECKS=1;\n";
        $sql_dump .= "\n-- Fine backup - " . date('Y-m-d H:i:s') . "\n";
        
        return $sql_dump;
        
    } catch (Exception $e) {
        throw new Exception("Errore durante la creazione del dump SQL: " . $e->getMessage());
    }
}

function sendSQLFileToDiscord($webhook_url, $file_path, $message) {
    if (!file_exists($file_path)) {
        throw new Exception("File SQL non trovato: $file_path");
    }
    
    $file_size = filesize($file_path);
    $max_size = 8 * 1024 * 1024; // 8MB limite Discord
    
    if ($file_size > $max_size) {
        // Se il file è troppo grande, comprimilo
        $compressed_file = $file_path . '.gz';
        $gz = gzopen($compressed_file, 'w9');
        $file_content = file_get_contents($file_path);
        gzwrite($gz, $file_content);
        gzclose($gz);
        
        if (filesize($compressed_file) < $max_size) {
            $file_path = $compressed_file;
            $message .= "\n⚠️ **File compresso (.gz)** per rispettare i limiti Discord";
        } else {
            throw new Exception("File troppo grande anche dopo compressione: " . number_format($file_size / 1024 / 1024, 2) . "MB");
        }
    }
    
    // Prepara il multipart form data per Discord
    $boundary = uniqid();
    $delimiter = '-------------' . $boundary;
    
    $post_data = "--" . $delimiter . "\r\n";
    $post_data .= 'Content-Disposition: form-data; name="content"' . "\r\n\r\n";
    $post_data .= $message . "\r\n";
    
    $post_data .= "--" . $delimiter . "\r\n";
    $post_data .= 'Content-Disposition: form-data; name="file"; filename="' . basename($file_path) . '"' . "\r\n";
    $post_data .= 'Content-Type: application/octet-stream' . "\r\n\r\n";
    $post_data .= file_get_contents($file_path) . "\r\n";
    $post_data .= "--" . $delimiter . "--\r\n";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: multipart/form-data; boundary=' . $delimiter,
            'content' => $post_data
        ]
    ]);
    
    $result = file_get_contents($webhook_url, false, $context);
    
    if ($result === FALSE) {
        throw new Exception("Errore nell'invio del file a Discord");
    }
    
    echo "✅ File SQL inviato a Discord: " . basename($file_path) . " (" . number_format($file_size / 1024, 2) . " KB)<br>";
    return true;
}

// =============================================================================
// ESECUZIONE PRINCIPALE
// =============================================================================

try {
    echo "<h2>🚀 Avvio backup SQL su Discord...</h2>";
    
    // Crea connessione database usando le credenziali estratte
    $pdo = createDatabaseConnection($host, $dbname, $username, $password);
    echo "✅ Connesso al database<br>";
    
    // Crea la directory backups se non esiste
    $backup_dir = __DIR__ . '/backups';
    if (!is_dir($backup_dir)) {
        mkdir($backup_dir, 0755, true);
        echo "📁 Creata directory backups<br>";
    }
    
    // Crea il dump SQL completo
    echo "🔄 Generazione dump SQL...<br>";
    $sql_content = createSQLDump($pdo, $exclude_tables, $sensitive_fields);
    
    // Salva il file SQL
    echo "💾 Salvataggio file SQL...<br>";
    $bytes_written = file_put_contents($backup_path, $sql_content);
    
    if ($bytes_written === false) {
        throw new Exception("Impossibile salvare il file SQL in: $backup_path");
    }
    
    $file_size_mb = number_format($bytes_written / 1024 / 1024, 2);
    echo "✅ File SQL creato: $backup_filename ($file_size_mb MB)<br>";
    
    // Prepara messaggio per Discord
    $discord_message = "# 🗄️ **BACKUP DATABASE CRM**\n";
    $discord_message .= "📅 **Data:** " . date('Y-m-d H:i:s') . "\n";
    $discord_message .= "🗃️ **Database:** " . $GLOBALS['current_database'] . "\n";
    $discord_message .= "📊 **Dimensione:** $file_size_mb MB\n";
    $discord_message .= "📝 **File:** `$backup_filename`\n";
    $discord_message .= "⏰ **Backup automatico giornaliero**\n";
    $discord_message .= "✅ **Dump SQL completo con struttura e dati**";
    
    // Invia file a Discord
    echo "📤 Invio file a Discord...<br>";
    sendSQLFileToDiscord($discord_webhook, $backup_path, $discord_message);
    
    // Pulizia: rimuovi il file locale (opzionale)
    if (file_exists($backup_path)) {
        unlink($backup_path);
        echo "🗑️ File temporaneo rimosso<br>";
    }
    
    echo "<h3>🎉 Backup SQL completato con successo!</h3>";
    echo "📱 Controlla il tuo canale Discord per scaricare il file SQL<br>";
    echo "💡 Il file contiene la struttura completa e tutti i dati del database<br>";
    
} catch (Exception $e) {
    // Invia errore a Discord se possibile
    $error_message = "❌ **ERRORE BACKUP SQL**\n";
    $error_message .= "🕐 **Ora:** " . date('Y-m-d H:i:s') . "\n";
    $error_message .= "📝 **Errore:** " . $e->getMessage() . "\n";
    
    try {
        $data = [
            'content' => $error_message,
            'username' => 'CRM Backup Bot'
        ];
        
        $options = [
            'http' => [
                'header' => "Content-type: application/json\r\n",
                'method' => 'POST',
                'content' => json_encode($data)
            ]
        ];
        
        $context = stream_context_create($options);
        file_get_contents($discord_webhook, false, $context);
    } catch (Exception $discord_error) {
        // Ignora errori Discord se il problema è di connessione
    }
    
    echo "<h3>❌ Errore durante il backup:</h3>";
    echo "<p style='color: red;'>" . $e->getMessage() . "</p>";
    
    // Pulizia in caso di errore
    if (isset($backup_path) && file_exists($backup_path)) {
        unlink($backup_path);
        echo "🗑️ File parziale rimosso<br>";
    }
}

echo "<hr>";
echo "<p><strong>Informazioni sistema:</strong></p>";
echo "📂 Directory: " . __DIR__ . "<br>";
echo "🌐 PHP Version: " . phpversion() . "<br>";
echo "🕐 Eseguito alle: " . date('Y-m-d H:i:s') . "<br>";

?>
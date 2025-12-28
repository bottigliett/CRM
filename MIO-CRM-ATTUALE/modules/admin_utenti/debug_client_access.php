<?php
// File: debug_client_access.php - Carica questo in /modules/admin_utenti/
// Test diagnostico per la pagina client access

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

echo "<h2>Debug Client Access Page</h2>";

try {
    echo "<p>✅ <strong>Step 1:</strong> Script avviato</p>";
    
    // Test 1: Verifica percorsi
    echo "<h3>Test Percorsi File</h3>";
    
    $files_to_check = [
        '../../core/config/database.php',
        '../../core/auth/Auth.php',
        '../../core/includes/layout_base.php'
    ];
    
    foreach ($files_to_check as $file) {
        $exists = file_exists($file);
        $realpath = realpath($file);
        
        echo "<p><strong>{$file}:</strong> " . 
             ($exists ? "✅ Esiste" : "❌ Non esiste") . 
             ($realpath ? " → {$realpath}" : "") . "</p>";
    }
    
    echo "<p><strong>Directory corrente:</strong> " . __DIR__ . "</p>";
    echo "<p><strong>Parent directory:</strong> " . dirname(__DIR__) . "</p>";
    echo "<p><strong>Core directory:</strong> " . dirname(dirname(__DIR__)) . "/core</p>";
    
    // Test 2: Sessione
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    echo "<p>✅ <strong>Step 2:</strong> Sessione avviata</p>";
    
    // Test 3: Database.php (con path corretto)
    $db_path = '../../core/config/database.php';
    if (!file_exists($db_path)) {
        // Prova path alternativi
        $alt_paths = [
            '../../../core/config/database.php',
            dirname(dirname(__DIR__)) . '/core/config/database.php'
        ];
        
        foreach ($alt_paths as $alt_path) {
            if (file_exists($alt_path)) {
                $db_path = $alt_path;
                echo "<p>⚠️ Trovato database.php in: {$alt_path}</p>";
                break;
            }
        }
    }
    
    if (file_exists($db_path)) {
        require_once $db_path;
        echo "<p>✅ <strong>Step 3:</strong> Database.php incluso</p>";
        
        // Test funzione getDB
        if (function_exists('getDB')) {
            echo "<p>✅ <strong>Step 4:</strong> Funzione getDB() esiste</p>";
            
            try {
                $db = getDB();
                echo "<p>✅ <strong>Step 5:</strong> Connessione database OK</p>";
                
                // Test tabelle necessarie
                echo "<h3>Test Tabelle Database</h3>";
                
                $tables_to_check = [
                    'users',
                    'leads_contacts', 
                    'client_access'
                ];
                
                foreach ($tables_to_check as $table) {
                    try {
                        $stmt = $db->prepare("SELECT COUNT(*) as count FROM {$table}");
                        $stmt->execute();
                        $result = $stmt->fetch();
                        echo "<p>✅ <strong>Tabella {$table}:</strong> Esiste ({$result['count']} record)</p>";
                    } catch (Exception $e) {
                        echo "<p>❌ <strong>Tabella {$table}:</strong> " . $e->getMessage() . "</p>";
                    }
                }
                
            } catch (Exception $e) {
                echo "<p>❌ <strong>Step 5:</strong> Errore connessione DB: " . $e->getMessage() . "</p>";
            }
        } else {
            echo "<p>❌ <strong>Step 4:</strong> Funzione getDB() non trovata</p>";
        }
    } else {
        echo "<p>❌ <strong>Step 3:</strong> Database.php non trovato</p>";
    }
    
    // Test 4: Auth.php
    $auth_path = '../../core/auth/Auth.php';
    if (file_exists($auth_path)) {
        echo "<p>✅ <strong>Step 6:</strong> Auth.php trovato</p>";
        // Non lo includiamo per ora per evitare errori
    } else {
        echo "<p>❌ <strong>Step 6:</strong> Auth.php non trovato</p>";
        
        // Verifica se esiste nella struttura
        $auth_search = shell_exec('find /home/u706045794/domains/studiomismo.it/public_html/portale -name "Auth.php" 2>/dev/null');
        if ($auth_search) {
            echo "<p>🔍 <strong>Auth.php trovato in:</strong><br>" . nl2br($auth_search) . "</p>";
        }
    }
    
    // Test 5: Verifica sessione login
    echo "<h3>Test Sessione</h3>";
    echo "<p><strong>Dati sessione:</strong></p>";
    echo "<pre>";
    var_dump($_SESSION);
    echo "</pre>";
    
    if (isset($_SESSION['logged_in']) && $_SESSION['logged_in']) {
        echo "<p>✅ <strong>Utente loggato:</strong> " . ($_SESSION['username'] ?? 'N/A') . "</p>";
        echo "<p><strong>Ruolo:</strong> " . ($_SESSION['role'] ?? 'N/A') . "</p>";
    } else {
        echo "<p>❌ <strong>Utente NON loggato</strong></p>";
    }
    
    echo "<p>✅ <strong>Debug completato</strong></p>";
    
} catch (Exception $e) {
    echo "<p>❌ <strong>ERRORE:</strong> " . $e->getMessage() . "</p>";
    echo "<p><strong>File:</strong> " . $e->getFile() . "</p>";
    echo "<p><strong>Linea:</strong> " . $e->getLine() . "</p>";
} catch (Error $e) {
    echo "<p>❌ <strong>ERRORE FATALE:</strong> " . $e->getMessage() . "</p>";
    echo "<p><strong>File:</strong> " . $e->getFile() . "</p>";
    echo "<p><strong>Linea:</strong> " . $e->getLine() . "</p>";
}
?>
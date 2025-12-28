<?php
// File: /modules/lead_contatti/lead/ajax/debug_ajax.php
// File di debug per testare output AJAX

// Attiva visualizzazione errori
error_reporting(E_ALL);
ini_set('display_errors', 0); // NON mostrare errori direttamente
ini_set('log_errors', 1);

// Cattura tutto l'output
ob_start();

try {
    echo "=== TEST DEBUG AJAX ===\n";
    
    // Test 1: Inclusione auth_helper
    echo "1. Testing auth_helper inclusion...\n";
    require_once __DIR__ . '/../../../../core/includes/auth_helper.php';
    echo "   ✓ auth_helper included\n";
    
    // Test 2: Verifica utente
    echo "2. Testing getCurrentUser...\n";
    $currentUser = getCurrentUser();
    echo "   ✓ User: " . ($currentUser['first_name'] ?? 'Unknown') . "\n";
    
    // Test 3: Connessione database
    echo "3. Testing database connection...\n";
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "   ✓ Database connected\n";
    
    // Test 4: Query di prova
    echo "4. Testing sample query...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM leads_funnel LIMIT 1");
    $result = $stmt->fetch();
    echo "   ✓ Found " . $result['count'] . " leads\n";
    
    echo "5. Testing JSON output...\n";
    
    // Pulisci buffer e invia JSON
    $output = ob_get_clean();
    
    // Se arriviamo qui, tutto è OK - mandiamo JSON
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => true,
        'message' => 'All tests passed!',
        'debug_output' => $output,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    // Cattura l'output di debug
    $debugOutput = ob_get_clean();
    
    // Log dell'errore
    error_log("Debug AJAX Error: " . $e->getMessage());
    error_log("Debug Output: " . $debugOutput);
    
    // Risposta JSON di errore
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_output' => $debugOutput,
        'line' => $e->getLine(),
        'file' => basename($e->getFile())
    ]);
}
?>
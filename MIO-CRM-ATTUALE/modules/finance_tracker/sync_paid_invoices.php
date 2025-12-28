<?php
// File: /modules/finance_tracker/sync_paid_invoices.php
// Script cron per sincronizzazione automatica fatture pagate con Finance Tracker
// Esecuzione: ogni minuto tramite cron

// Previeni esecuzione da browser se non autorizzato
if (!defined('CRON_EXECUTION')) {
    // Verifica se è richiesta da cron o da admin
    if (php_sapi_name() !== 'cli') {
        require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';
        $currentUser = getCurrentUser();
        
        if ($currentUser['role'] !== 'super_admin' && $currentUser['role'] !== 'admin') {
            die('Accesso negato. Solo admin può eseguire la sincronizzazione.');
        }
        $isWebExecution = true;
    } else {
        $isWebExecution = false;
    }
} else {
    $isWebExecution = false;
}

// Configurazione log
$logFile = $_SERVER['DOCUMENT_ROOT'] . '/logs/invoice_sync.log';
$logDir = dirname($logFile);
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

function writeLog($message, $level = 'INFO') {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message" . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

function outputMessage($message, $isWeb = false) {
    if ($isWeb) {
        echo $message . "<br>";
    } else {
        echo $message . "\n";
    }
    writeLog(strip_tags($message));
}

try {
    $startTime = microtime(true);
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    if ($isWebExecution) {
        echo "<h2>🔄 Sincronizzazione Automatica Fatture</h2>";
        echo "<pre style='background: #f7f7f5; padding: 20px; border-radius: 8px;'>";
    }
    
    outputMessage("=== AVVIO SINCRONIZZAZIONE AUTOMATICA ===", $isWebExecution);
    
    // 1. Verifica e crea strutture necessarie
    outputMessage("Verifica strutture database...", $isWebExecution);
    
    // Verifica categoria "Fatture Clienti"
    $stmt = $pdo->prepare("SELECT id FROM finance_categories WHERE name = 'Fatture Clienti' AND type = 'income'");
    $stmt->execute();
    $category = $stmt->fetch();
    
    if (!$category) {
        outputMessage("⚠️ Categoria 'Fatture Clienti' non trovata. Creazione...", $isWebExecution);
        $stmt = $pdo->prepare("
            INSERT INTO finance_categories (name, type, color, icon, description) 
            VALUES ('Fatture Clienti', 'income', '#22c55e', '📄', 'Entrate da fatture emesse')
        ");
        $stmt->execute();
        $categoryId = $pdo->lastInsertId();
        outputMessage("✅ Categoria creata con ID: $categoryId", $isWebExecution);
    } else {
        $categoryId = $category['id'];
    }
    
    // Verifica metodo "Bonifico Bancario"
    $stmt = $pdo->prepare("SELECT id FROM finance_payment_methods WHERE name = 'Bonifico Bancario'");
    $stmt->execute();
    $method = $stmt->fetch();
    
    if (!$method) {
        outputMessage("⚠️ Metodo 'Bonifico Bancario' non trovato. Creazione...", $isWebExecution);
        $stmt = $pdo->prepare("INSERT INTO finance_payment_methods (name, icon) VALUES ('Bonifico Bancario', '🏦')");
        $stmt->execute();
        $methodId = $pdo->lastInsertId();
        outputMessage("✅ Metodo creato con ID: $methodId", $isWebExecution);
    } else {
        $methodId = $method['id'];
    }
    
    // 2. SINCRONIZZAZIONE BIDIREZIONALE
    outputMessage("\n=== SINCRONIZZAZIONE BIDIREZIONALE ===", $isWebExecution);
    
    // A) Trova fatture pagate non ancora sincronizzate
    $sqlNewPaid = "
        SELECT f.*
        FROM fatture f
        LEFT JOIN finance_transactions ft ON f.id = ft.invoice_id
        WHERE f.status = 'pagata' 
        AND ft.id IS NULL
        ORDER BY f.data_fattura DESC
    ";
    
    $stmt = $pdo->query($sqlNewPaid);
    $newPaidInvoices = $stmt->fetchAll();
    
    // B) Trova transazioni di fatture non più pagate o eliminate
    $sqlOrphanTransactions = "
        SELECT 
            ft.id as transaction_id,
            ft.invoice_id,
            ft.amount,
            ft.description,
            f.status as current_status,
            f.numero_fattura
        FROM finance_transactions ft
        LEFT JOIN fatture f ON ft.invoice_id = f.id
        WHERE ft.invoice_id IS NOT NULL
        AND (f.id IS NULL OR f.status != 'pagata')
    ";
    
    $stmt = $pdo->query($sqlOrphanTransactions);
    $orphanTransactions = $stmt->fetchAll();
    
    $syncStats = [
        'added' => 0,
        'removed' => 0,
        'errors' => 0
    ];
    
    // PARTE 1: Aggiungi nuove fatture pagate
    if (count($newPaidInvoices) > 0) {
        outputMessage("📥 Trovate " . count($newPaidInvoices) . " nuove fatture pagate da sincronizzare", $isWebExecution);
        
        $insertStmt = $pdo->prepare("
            INSERT INTO finance_transactions 
            (type, category_id, amount, date, description, source, payment_method_id, 
             invoice_id, notes, created_by, created_at)
            VALUES 
            ('income', :category_id, :amount, :date, :description, :source, 
             :payment_method_id, :invoice_id, :notes, :created_by, NOW())
        ");
        
        $methodStmt = $pdo->prepare("SELECT id FROM finance_payment_methods WHERE name = ? LIMIT 1");
        
        foreach ($newPaidInvoices as $invoice) {
            try {
                // Determina metodo pagamento
                $paymentMethod = $invoice['metodo_pagamento'] ?? 'Bonifico Bancario';
                $methodStmt->execute([$paymentMethod]);
                $paymentMethodId = $methodStmt->fetchColumn() ?: $methodId;
                
                // Pulisci descrizione
                $oggetto = html_entity_decode($invoice['oggetto'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $oggetto = strip_tags($oggetto);
                $description = "Fattura {$invoice['numero_fattura']} - {$oggetto}";
                
                // Pulisci note
                $notes = null;
                if ($invoice['note_pagamento']) {
                    $notes = html_entity_decode($invoice['note_pagamento'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                    $notes = strip_tags($notes);
                }
                
                // Inserisci transazione
                $insertStmt->execute([
                    'category_id' => $categoryId,
                    'amount' => $invoice['totale'],
                    'date' => $invoice['data_pagamento'] ?? $invoice['data_fattura'],
                    'description' => substr($description, 0, 500),
                    'source' => $invoice['client_name'],
                    'payment_method_id' => $paymentMethodId,
                    'invoice_id' => $invoice['id'],
                    'notes' => $notes,
                    'created_by' => $invoice['created_by']
                ]);
                
                $syncStats['added']++;
                outputMessage("✅ Aggiunta: {$invoice['numero_fattura']} - €" . number_format($invoice['totale'], 2), $isWebExecution);
                
            } catch (Exception $e) {
                $syncStats['errors']++;
                outputMessage("❌ Errore fattura {$invoice['numero_fattura']}: " . $e->getMessage(), $isWebExecution);
                writeLog("Errore inserimento fattura {$invoice['numero_fattura']}: " . $e->getMessage(), 'ERROR');
            }
        }
    }
    
    // PARTE 2: Rimuovi transazioni di fatture non più pagate/esistenti
    if (count($orphanTransactions) > 0) {
        outputMessage("\n📤 Trovate " . count($orphanTransactions) . " transazioni da rimuovere", $isWebExecution);
        
        $deleteStmt = $pdo->prepare("DELETE FROM finance_transactions WHERE id = ?");
        
        foreach ($orphanTransactions as $transaction) {
            try {
                $deleteStmt->execute([$transaction['transaction_id']]);
                $syncStats['removed']++;
                
                $invoiceInfo = $transaction['numero_fattura'] ?? "Fattura ID {$transaction['invoice_id']}";
                $reason = is_null($transaction['current_status']) ? 'eliminata' : "stato: {$transaction['current_status']}";
                
                outputMessage("🗑️ Rimossa: $invoiceInfo ($reason) - €" . number_format($transaction['amount'], 2), $isWebExecution);
                
            } catch (Exception $e) {
                $syncStats['errors']++;
                outputMessage("❌ Errore rimozione transazione ID {$transaction['transaction_id']}: " . $e->getMessage(), $isWebExecution);
                writeLog("Errore rimozione transazione {$transaction['transaction_id']}: " . $e->getMessage(), 'ERROR');
            }
        }
    }
    
    // 3. STATISTICHE FINALI
    $endTime = microtime(true);
    $executionTime = round(($endTime - $startTime) * 1000, 2);
    
    outputMessage("\n=== RIEPILOGO SINCRONIZZAZIONE ===", $isWebExecution);
    outputMessage("✅ Transazioni aggiunte: {$syncStats['added']}", $isWebExecution);
    outputMessage("🗑️ Transazioni rimosse: {$syncStats['removed']}", $isWebExecution);
    outputMessage("❌ Errori: {$syncStats['errors']}", $isWebExecution);
    outputMessage("⏱️ Tempo esecuzione: {$executionTime}ms", $isWebExecution);
    
    // Statistiche generali (solo se ci sono state modifiche o esecuzione web)
    if ($syncStats['added'] > 0 || $syncStats['removed'] > 0 || $isWebExecution) {
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                COUNT(CASE WHEN invoice_id IS NOT NULL THEN 1 END) as from_invoices
            FROM finance_transactions
            WHERE YEAR(date) = YEAR(CURDATE())
        ");
        $stats = $stmt->fetch();
        
        outputMessage("\n📊 STATISTICHE FINANCE TRACKER (anno corrente):", $isWebExecution);
        outputMessage("💰 Transazioni totali: " . $stats['total_transactions'], $isWebExecution);
        outputMessage("📄 Da fatture: " . $stats['from_invoices'], $isWebExecution);
        outputMessage("💵 Entrate totali: € " . number_format($stats['total_income'], 2, ',', '.'), $isWebExecution);
    }
    
    // Log delle modifiche
    if ($syncStats['added'] > 0 || $syncStats['removed'] > 0) {
        writeLog("Sincronizzazione completata: +{$syncStats['added']} -{$syncStats['removed']} errori:{$syncStats['errors']} tempo:{$executionTime}ms");
    }
    
    if ($isWebExecution) {
        echo "</pre>";
        echo '<div style="margin-top: 20px; display: flex; gap: 10px;">';
        echo '<a href="/modules/finance_tracker/" style="padding: 10px 20px; background: #37352f; color: white; text-decoration: none; border-radius: 6px;">Vai al Finance Tracker</a>';
        echo '<a href="/dashboard.php" style="padding: 10px 20px; background: #f7f7f5; color: #37352f; text-decoration: none; border-radius: 6px; border: 1px solid #e9e9e7;">Torna alla Dashboard</a>';
        echo '</div>';
    }
    
} catch (Exception $e) {
    $errorMsg = "ERRORE CRITICO: " . $e->getMessage();
    outputMessage($errorMsg, $isWebExecution);
    writeLog($errorMsg, 'CRITICAL');
    
    if ($isWebExecution) {
        echo "</pre>";
    }
    
    // In caso di errore critico, invia email di notifica (opzionale)
    // mail('admin@tuosito.com', 'Errore Sincronizzazione Fatture', $errorMsg);
}

// CSS per esecuzione web
if ($isWebExecution): ?>
<style>
body {
    font-family: 'Inter Tight', -apple-system, sans-serif;
    padding: 40px;
    background: #f7f7f5;
}
h2 {
    color: #37352f;
    margin-bottom: 20px;
}
pre {
    background: white !important;
    padding: 30px !important;
    border-radius: 8px !important;
    border: 1px solid #e9e9e7;
    line-height: 1.6;
    color: #37352f;
}
a {
    display: inline-block;
}
</style>
<?php endif; ?>
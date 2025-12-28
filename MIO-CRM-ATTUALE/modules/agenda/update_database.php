<?php
// File: /modules/agenda/update_database.php
// Script per aggiornare la foreign key della tabella agenda_events

require_once __DIR__ . '/../../core/includes/auth_helper.php';

// Verifica che sia un admin
$currentUser = getCurrentUser();
if (!in_array($currentUser['role'], ['admin', 'super_admin'])) {
    die('❌ Accesso negato: solo gli amministratori possono eseguire questo script');
}

// Connessione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die('❌ Errore connessione database: ' . $e->getMessage());
}

echo "🔧 AGGIORNAMENTO DATABASE AGENDA\n";
echo "=================================\n\n";

try {
    // 1. Controlla se le tabelle esistono
    echo "1️⃣ Controllo esistenza tabelle...\n";
    
    $stmt = $pdo->query("SHOW TABLES LIKE 'clients'");
    $clientsExists = $stmt->rowCount() > 0;
    
    $stmt = $pdo->query("SHOW TABLES LIKE 'leads_contacts'");
    $leadsContactsExists = $stmt->rowCount() > 0;
    
    $stmt = $pdo->query("SHOW TABLES LIKE 'agenda_events'");
    $agendaEventsExists = $stmt->rowCount() > 0;
    
    echo "   - Tabella 'clients': " . ($clientsExists ? "✅ Esiste" : "❌ Non esiste") . "\n";
    echo "   - Tabella 'leads_contacts': " . ($leadsContactsExists ? "✅ Esiste" : "❌ Non esiste") . "\n";
    echo "   - Tabella 'agenda_events': " . ($agendaEventsExists ? "✅ Esiste" : "❌ Non esiste") . "\n\n";
    
    if (!$leadsContactsExists) {
        throw new Exception("La tabella 'leads_contacts' non esiste!");
    }
    
    if (!$agendaEventsExists) {
        throw new Exception("La tabella 'agenda_events' non esiste!");
    }
    
    // 2. Controlla i dati orfani
    echo "2️⃣ Controllo dati orfani nell'agenda...\n";
    
    $stmt = $pdo->query("
        SELECT COUNT(*) as count 
        FROM agenda_events ae 
        LEFT JOIN leads_contacts lc ON ae.client_id = lc.id 
        WHERE ae.client_id IS NOT NULL AND lc.id IS NULL
    ");
    $orphanCount = $stmt->fetch()['count'];
    
    echo "   - Eventi con client_id orfani: $orphanCount\n";
    
    if ($orphanCount > 0) {
        echo "   ⚠️  ATTENZIONE: Ci sono $orphanCount eventi con client_id che non esistono in leads_contacts\n";
        echo "   Questi verranno impostati a NULL prima di applicare la nuova foreign key.\n\n";
        
        // Mostra i dettagli degli eventi orfani
        $stmt = $pdo->query("
            SELECT ae.id, ae.title, ae.client_id, ae.start_datetime
            FROM agenda_events ae 
            LEFT JOIN leads_contacts lc ON ae.client_id = lc.id 
            WHERE ae.client_id IS NOT NULL AND lc.id IS NULL
            LIMIT 5
        ");
        $orphanEvents = $stmt->fetchAll();
        
        echo "   📋 Esempi di eventi orfani:\n";
        foreach ($orphanEvents as $event) {
            echo "      - ID {$event['id']}: '{$event['title']}' (client_id: {$event['client_id']}, data: {$event['start_datetime']})\n";
        }
        if ($orphanCount > 5) {
            echo "      - ... e altri " . ($orphanCount - 5) . " eventi\n";
        }
        echo "\n";
        
        // Pulisci i dati orfani
        $stmt = $pdo->prepare("
            UPDATE agenda_events ae 
            LEFT JOIN leads_contacts lc ON ae.client_id = lc.id 
            SET ae.client_id = NULL 
            WHERE ae.client_id IS NOT NULL AND lc.id IS NULL
        ");
        $stmt->execute();
        echo "   ✅ Dati orfani puliti\n\n";
    } else {
        echo "   ✅ Nessun dato orfano trovato\n\n";
    }
    
    // 3. Controlla foreign key esistenti
    echo "3️⃣ Controllo foreign key esistenti per agenda_events...\n";
    
    $stmt = $pdo->query("
        SELECT 
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = 'u706045794_crm_mismo'
        AND TABLE_NAME = 'agenda_events' 
        AND CONSTRAINT_NAME != 'PRIMARY'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $foreignKeys = $stmt->fetchAll();
    
    foreach ($foreignKeys as $fk) {
        echo "   - Constraint: {$fk['CONSTRAINT_NAME']} ({$fk['COLUMN_NAME']} -> {$fk['REFERENCED_TABLE_NAME']}.{$fk['REFERENCED_COLUMN_NAME']})\n";
    }
    echo "\n";
    
    // 4. Rimuovi la vecchia foreign key se esiste
    echo "4️⃣ Rimozione vecchia foreign key...\n";
    
    $oldConstraintFound = false;
    foreach ($foreignKeys as $fk) {
        if ($fk['COLUMN_NAME'] === 'client_id' && ($fk['REFERENCED_TABLE_NAME'] === 'clients' || $fk['CONSTRAINT_NAME'] === 'agenda_events_ibfk_2')) {
            echo "   - Rimozione constraint: {$fk['CONSTRAINT_NAME']}\n";
            $pdo->exec("ALTER TABLE `agenda_events` DROP FOREIGN KEY `{$fk['CONSTRAINT_NAME']}`");
            $oldConstraintFound = true;
        }
    }
    
    if (!$oldConstraintFound) {
        echo "   ℹ️  Nessuna vecchia foreign key da rimuovere\n";
    }
    echo "\n";
    
    // 5. Aggiungi la nuova foreign key
    echo "5️⃣ Aggiunta nuova foreign key...\n";
    
    // Controlla se esiste già la nuova foreign key
    $newConstraintExists = false;
    foreach ($foreignKeys as $fk) {
        if ($fk['COLUMN_NAME'] === 'client_id' && $fk['REFERENCED_TABLE_NAME'] === 'leads_contacts') {
            $newConstraintExists = true;
            echo "   ℹ️  Foreign key verso leads_contacts già esistente: {$fk['CONSTRAINT_NAME']}\n";
            break;
        }
    }
    
    if (!$newConstraintExists) {
        $pdo->exec("
            ALTER TABLE `agenda_events` 
            ADD CONSTRAINT `agenda_events_client_fk` 
            FOREIGN KEY (`client_id`) 
            REFERENCES `leads_contacts` (`id`) 
            ON DELETE SET NULL 
            ON UPDATE CASCADE
        ");
        echo "   ✅ Nuova foreign key aggiunta: agenda_events_client_fk\n";
    }
    echo "\n";
    
    // 6. Verifica finale
    echo "6️⃣ Verifica finale...\n";
    
    $stmt = $pdo->query("
        SELECT 
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = 'u706045794_crm_mismo'
        AND TABLE_NAME = 'agenda_events' 
        AND COLUMN_NAME = 'client_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $currentFk = $stmt->fetch();
    
    if ($currentFk && $currentFk['REFERENCED_TABLE_NAME'] === 'leads_contacts') {
        echo "   ✅ Foreign key corretta: {$currentFk['CONSTRAINT_NAME']} (client_id -> leads_contacts.id)\n";
    } else {
        throw new Exception("Verifica fallita: foreign key non configurata correttamente");
    }
    
    // 7. Test di integrità
    echo "\n7️⃣ Test di integrità...\n";
    
    $stmt = $pdo->query("
        SELECT COUNT(*) as count 
        FROM agenda_events ae 
        LEFT JOIN leads_contacts lc ON ae.client_id = lc.id 
        WHERE ae.client_id IS NOT NULL
    ");
    $linkedEvents = $stmt->fetch()['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM agenda_events");
    $totalEvents = $stmt->fetch()['count'];
    
    echo "   - Eventi totali: $totalEvents\n";
    echo "   - Eventi con client_id validi: $linkedEvents\n";
    echo "   ✅ Test di integrità superato\n";
    
    // 8. Statistiche finali
    echo "\n8️⃣ Statistiche finali...\n";
    
    $stmt = $pdo->query("
        SELECT 
            status,
            COUNT(*) as count 
        FROM leads_contacts 
        WHERE status != 'lead' 
        GROUP BY status
        ORDER BY count DESC
    ");
    $contactStats = $stmt->fetchAll();
    
    echo "   - Contatti disponibili per l'agenda:\n";
    foreach ($contactStats as $stat) {
        echo "     * {$stat['status']}: {$stat['count']}\n";
    }
    
    echo "\n🎉 AGGIORNAMENTO AGENDA COMPLETATO CON SUCCESSO!\n";
    echo "===============================================\n";
    echo "L'Agenda ora può utilizzare correttamente i contatti dall'anagrafica.\n\n";
    
} catch (Exception $e) {
    echo "❌ ERRORE DURANTE L'AGGIORNAMENTO: " . $e->getMessage() . "\n";
    echo "===============================================\n";
    echo "Controlla i log del server e contatta l'amministratore di sistema.\n\n";
    
    // Log dell'errore
    error_log("Errore aggiornamento database agenda: " . $e->getMessage());
}
?>
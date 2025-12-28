<?php
// File: /modules/lead_contatti/ajax/save_contact.php
// API per salvare/aggiornare un contatto nell'anagrafica - VERSIONE AGGIORNATA

// Disabilita output di errori diretti
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Pulisci qualsiasi output precedente
if (ob_get_level()) {
    ob_clean();
}

// Header JSON immediato
header('Content-Type: application/json; charset=utf-8');

try {
    // Includi auth helper
    require_once __DIR__ . '/../../../core/includes/auth_helper.php';
    
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    // Verifica metodo
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non permesso');
    }
    
    // Verifica CSRF token
    if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
        throw new Exception('Token di sicurezza non valido');
    }
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Estrai e valida dati
    $contactId = !empty($_POST['contact_id']) ? (int)$_POST['contact_id'] : null;
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $contactType = trim($_POST['contact_type'] ?? 'person');
    $status = trim($_POST['status'] ?? 'client');
    $priority = trim($_POST['priority'] ?? 'medium');
    $address = trim($_POST['address'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $lastContactDate = trim($_POST['last_contact_date'] ?? '');
    $nextFollowupDate = trim($_POST['next_followup_date'] ?? '');
    
    // NUOVI CAMPI: Partita IVA e Codice Fiscale
    $partitaIva = trim($_POST['partita_iva'] ?? '');
    $codiceFiscale = strtoupper(trim($_POST['codice_fiscale'] ?? ''));
    
    // Log dei dati ricevuti per debug
    error_log("DEBUG save_contact.php - Data received: " . json_encode([
        'contact_id' => $contactId,
        'name' => $name,
        'email' => $email,
        'status' => $status,
        'partita_iva' => $partitaIva,
        'codice_fiscale' => $codiceFiscale
    ]));
    
    // Validazione campi obbligatori
    if (!$name) {
        throw new Exception('Il nome è obbligatorio');
    }
    
    // Validazione email se fornita
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Indirizzo email non valido');
    }
    
    // Validazione valori enum
    if (!in_array($contactType, ['person', 'company'])) {
        throw new Exception('Tipo di contatto non valido');
    }
    
    // AGGIORNO: Validazione status con nuovi valori
    if (!in_array($status, ['prospect', 'client', 'inactive', 'collaborazioni', 'contatto_utile'])) {
        throw new Exception('Status non valido: ' . $status);
    }
    
    if (!in_array($priority, ['low', 'medium', 'high'])) {
        throw new Exception('Priorità non valida');
    }
    
    // NUOVE VALIDAZIONI: P.IVA e CF (più permissive)
    if ($partitaIva) {
        // Rimuovi spazi e caratteri speciali
        $partitaIva = preg_replace('/[\s\-\.]/', '', strtoupper($partitaIva));
        
        // Validazione più permissiva - accetta diversi formati
        if (!preg_match('/^(IT|AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|HR|HU|IE|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK|GB)?[\dA-Z]{8,15}$/', $partitaIva)) {
            // Non bloccare, solo log di warning
            error_log("WARNING: Possibile formato P.IVA non standard: " . $partitaIva);
            // Continua comunque il salvataggio
        }
    }
    
    if ($codiceFiscale) {
        // Rimuovi spazi e caratteri speciali  
        $codiceFiscale = preg_replace('/[\s\-\.]/', '', strtoupper($codiceFiscale));
        
        // Validazione più permissiva
        if (!preg_match('/^[A-Z0-9]{8,16}$/', $codiceFiscale)) {
            // Non bloccare, solo log di warning
            error_log("WARNING: Possibile formato CF non standard: " . $codiceFiscale);
            // Continua comunque il salvataggio
        }
    }
    
    // Processa tags
    $tags = [];
    if (!empty($_POST['tags'])) {
        $tagsData = json_decode($_POST['tags'], true);
        if (is_array($tagsData)) {
            $tags = array_filter($tagsData, function($tag) {
                return is_array($tag) && !empty($tag['tag_name']);
            });
        }
    }
    $tagsJson = !empty($tags) ? json_encode($tags, JSON_UNESCAPED_UNICODE) : null;
    
    // Processa social profiles
    $socialProfiles = [];
    if (!empty($_POST['socials'])) {
        $socialData = json_decode($_POST['socials'], true);
        if (is_array($socialData)) {
            foreach ($socialData as $profile) {
                if (!empty($profile['platform']) && !empty($profile['profile_url'])) {
                    $socialProfiles[] = [
                        'platform' => trim($profile['platform']),
                        'profile_url' => trim($profile['profile_url']),
                        'username' => trim($profile['username'] ?? '')
                    ];
                }
            }
        }
    }
    
    $socialProfilesJson = !empty($socialProfiles) ? json_encode($socialProfiles, JSON_UNESCAPED_UNICODE) : null;
    
    // Gestione date
    $lastContactFormatted = null;
    if (!empty($lastContactDate)) {
        $lastContactFormatted = date('Y-m-d', strtotime($lastContactDate));
    }
    
    $nextFollowupFormatted = null;
    if (!empty($nextFollowupDate)) {
        $nextFollowupFormatted = date('Y-m-d', strtotime($nextFollowupDate));
    }
    
    // Inizio transazione
    $pdo->beginTransaction();
    
    if ($contactId) {
        // MODIFICA CONTATTO ESISTENTE
        
        // Verifica che il contatto esista e non sia un lead
        $checkStmt = $pdo->prepare("SELECT status FROM leads_contacts WHERE id = ?");
        $checkStmt->execute([$contactId]);
        $existingContact = $checkStmt->fetch();
        
        if (!$existingContact) {
            throw new Exception('Contatto non trovato');
        }
        
        if ($existingContact['status'] === 'lead') {
            throw new Exception('Non è possibile modificare un lead da questa pagina');
        }
        
        // Query di aggiornamento con NUOVI CAMPI
        $stmt = $pdo->prepare("
            UPDATE leads_contacts SET
                name = ?,
                email = ?,
                phone = ?,
                partita_iva = ?,
                codice_fiscale = ?,
                contact_type = ?,
                status = ?,
                priority = ?,
                address = ?,
                description = ?,
                last_contact_date = ?,
                next_followup_date = ?,
                tags = ?,
                social_profiles = ?,
                updated_at = NOW()
            WHERE id = ?
        ");
        
        $executeResult = $stmt->execute([
            $name,
            $email ?: null,
            $phone ?: null,
            $partitaIva ?: null,
            $codiceFiscale ?: null,
            $contactType,
            $status,
            $priority,
            $address ?: null,
            $description ?: null,
            $lastContactFormatted,
            $nextFollowupFormatted,
            $tagsJson,
            $socialProfilesJson,
            $contactId
        ]);
        
        if (!$executeResult) {
            throw new Exception('Errore nell\'aggiornamento del contatto');
        }
        
        $action = 'updated';
        $message = 'Contatto aggiornato con successo!';
        
        error_log("DEBUG save_contact.php - Contact updated successfully: ID $contactId");
        
    } else {
        // NUOVO CONTATTO
        
        // Verifica che non esista già un contatto con lo stesso nome ed email
        if ($email) {
            $duplicateStmt = $pdo->prepare("
                SELECT id FROM leads_contacts 
                WHERE name = ? AND email = ? AND status != 'lead'
            ");
            $duplicateStmt->execute([$name, $email]);
            if ($duplicateStmt->fetch()) {
                throw new Exception('Esiste già un contatto con questo nome ed email');
            }
        }
        
        // Query di inserimento con NUOVI CAMPI
        $stmt = $pdo->prepare("
            INSERT INTO leads_contacts (
                name, email, phone, partita_iva, codice_fiscale, contact_type, 
                status, priority, address, description, last_contact_date, 
                next_followup_date, tags, social_profiles, created_by, 
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $executeResult = $stmt->execute([
            $name,
            $email ?: null,
            $phone ?: null,
            $partitaIva ?: null,
            $codiceFiscale ?: null,
            $contactType,
            $status,
            $priority,
            $address ?: null,
            $description ?: null,
            $lastContactFormatted,
            $nextFollowupFormatted,
            $tagsJson,
            $socialProfilesJson,
            $currentUser['id']
        ]);
        
        if (!$executeResult) {
            throw new Exception('Errore nella creazione del contatto');
        }
        
        $contactId = $pdo->lastInsertId();
        $action = 'created';
        $message = 'Contatto creato con successo!';
        
        error_log("DEBUG save_contact.php - Contact created successfully: ID $contactId");
    }
    
    // Gestione tags nella tabella separata (se richiesto)
    if ($contactId && !empty($tags)) {
        try {
            // Cancella tags esistenti
            $deleteTagsStmt = $pdo->prepare("DELETE FROM leads_contacts_tags WHERE contact_id = ?");
            $deleteTagsStmt->execute([$contactId]);
            
            // Inserisci nuovi tags
            $insertTagStmt = $pdo->prepare("
                INSERT INTO leads_contacts_tags (contact_id, tag_name, tag_color) 
                VALUES (?, ?, ?)
            ");
            
            foreach ($tags as $tag) {
                if (!empty($tag['tag_name'])) {
                    $insertTagStmt->execute([
                        $contactId,
                        $tag['tag_name'],
                        $tag['tag_color'] ?? '#6b7280'
                    ]);
                }
            }
        } catch (Exception $e) {
            error_log("Warning: Could not save tags to separate table: " . $e->getMessage());
            // Non bloccare l'operazione per errori sui tags
        }
    }
    
    // Gestione social profiles nella tabella separata (se richiesto)
    if ($contactId && !empty($socialProfiles)) {
        try {
            // Cancella social profiles esistenti
            $deleteSocialsStmt = $pdo->prepare("DELETE FROM leads_contacts_socials WHERE contact_id = ?");
            $deleteSocialsStmt->execute([$contactId]);
            
            // Inserisci nuovi social profiles
            $insertSocialStmt = $pdo->prepare("
                INSERT INTO leads_contacts_socials (contact_id, platform, profile_url, username) 
                VALUES (?, ?, ?, ?)
            ");
            
            foreach ($socialProfiles as $social) {
                $insertSocialStmt->execute([
                    $contactId,
                    $social['platform'],
                    $social['profile_url'],
                    $social['username']
                ]);
            }
        } catch (Exception $e) {
            error_log("Warning: Could not save socials to separate table: " . $e->getMessage());
            // Non bloccare l'operazione per errori sui social
        }
    }
    
    // Log attività
    try {
        logUserAction(
            $action . '_contact', 
            'success', 
            "Contatto '$name' " . ($action === 'created' ? 'creato' : 'aggiornato')
        );
        
        // Log nella tabella activity_logs se esiste
        $activityStmt = $pdo->prepare("
            INSERT INTO leads_activity_logs (contact_id, user_id, action, details, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $activityStmt->execute([
            $contactId,
            $currentUser['id'],
            $action . '_contact',
            "Contatto '$name' " . ($action === 'created' ? 'creato' : 'aggiornato')
        ]);
        
    } catch (Exception $e) {
        error_log("Log error in save_contact: " . $e->getMessage());
        // Non bloccare per errori di log
    }
    
    // Commit transazione
    $pdo->commit();
    
    // Risposta successo
    echo json_encode([
        'success' => true,
        'message' => $message,
        'contact_id' => (int)$contactId,
        'action' => $action,
        'contact_name' => $name,
        'debug' => [
            'partita_iva' => $partitaIva,
            'codice_fiscale' => $codiceFiscale,
            'status' => $status,
            'tags_count' => count($tags),
            'socials_count' => count($socialProfiles)
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Rollback se in transazione
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log("Error in save_contact.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'file' => basename(__FILE__),
            'line' => $e->getLine(),
            'received_data' => [
                'contact_id' => $_POST['contact_id'] ?? 'not set',
                'name' => $_POST['name'] ?? 'not set',
                'status' => $_POST['status'] ?? 'not set'
            ]
        ]
    ], JSON_UNESCAPED_UNICODE);
}

// Assicurati che non ci sia output aggiuntivo
exit;
?>
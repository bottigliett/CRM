<?php
// File: /modules/admin_utenti/index.php
// Gestione Accessi Clienti - Versione Wizard con Schede Grandi Stile Notion

require_once __DIR__ . '/../../core/includes/auth_helper.php';
require_once __DIR__ . '/../../core/components/contact_selector.php';
require_once __DIR__ . '/../../core/includes/client_notifications.php';

// Verifica autenticazione e ottieni utente
$currentUser = getCurrentUser();

// Sostituisci requireAuth() con:
requireModulePermission('admin_utenti', 'read');

// Per controlli granulari:
$canWrite = hasPermission('admin_utenti', 'write');
$canDelete = hasPermission('admin_utenti', 'delete');

// Connessione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die('Errore connessione database: ' . $e->getMessage());
}

// Carica contatti per selettore
$contacts = getContactsForSelector($pdo);

// Gestione AJAX
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');
    
    try {
        switch ($_POST['action']) {
            case 'create_access_wizard':
                // Step 1 data
                $contactId = (int)$_POST['contact_id'];
                $username = trim($_POST['username']);
                $accessType = $_POST['access_type'];
                
                // Validazioni base
                if (empty($username) || strlen($username) < 3) {
                    throw new Exception('Username deve essere di almeno 3 caratteri');
                }
                
                if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
                    throw new Exception('Username può contenere solo lettere, numeri e underscore');
                }
                
                // Verifica unicità username
                $stmt = $pdo->prepare("SELECT id FROM client_access WHERE username = ?");
                $stmt->execute([$username]);
                if ($stmt->fetch()) {
                    throw new Exception('Username già in uso');
                }
                
                // Genera token di attivazione
                $activationToken = bin2hex(random_bytes(32));
                $activationExpires = date('Y-m-d H:i:s', strtotime('+7 days'));
                
                // Inizia transazione
                $pdo->beginTransaction();
                
                try {
                    // Crea accesso base
                    $stmt = $pdo->prepare("
                        INSERT INTO client_access (
                            contact_id, username, access_type, 
                            activation_token, activation_expires, 
                            created_by, is_active
                        ) VALUES (?, ?, ?, ?, ?, ?, 0)
                    ");
                    $stmt->execute([
                        $contactId, $username, $accessType,
                        $activationToken, $activationExpires,
                        $currentUser['id']
                    ]);
                    
                    $accessId = $pdo->lastInsertId();
                    
                    // Se è preventivo, crea anche il record quote
                    if ($accessType === 'preventivo' && isset($_POST['quote_data'])) {
                        $quoteData = json_decode($_POST['quote_data'], true);
                        
                        // Genera numero preventivo
                        $year = date('Y');
                        $stmt = $pdo->query("SELECT COUNT(*) + 1 as num FROM quotes WHERE YEAR(created_at) = $year");
                        $quoteNum = $stmt->fetch()['num'];
                        $quoteNumber = sprintf('Q%s-%04d', $year, $quoteNum);
                        
                        // Prepara dati preventivo
                        $projectType = $quoteData['project_type'];
                        $projectTypeCustom = null;
                        if ($projectType === 'personalizzato') {
                            $projectTypeCustom = $quoteData['project_type_custom'];
                        }
                        
                        // Calcola totali
                        $subtotal = (float)$quoteData['subtotal'];
                        $taxRate = (float)$quoteData['tax_rate'];
                        $discountPercentage = (float)($quoteData['discount_percentage'] ?? 0);
                        
                        $discountAmount = $subtotal * ($discountPercentage / 100);
                        $afterDiscount = $subtotal - $discountAmount;
                        $taxAmount = $afterDiscount * ($taxRate / 100);
                        $total = $afterDiscount + $taxAmount;
                        
                        // Inserisci preventivo
                        $stmt = $pdo->prepare("
                            INSERT INTO quotes (
                                client_access_id, contact_id, quote_number,
                                title, description, project_type, project_type_custom,
                                objectives, bespoke_options,
                                subtotal, tax_rate, tax_amount,
                                discount_percentage, discount_amount, total,
                                enable_payment_discount, one_time_discount, payment_2_discount,
                                payment_3_discount, payment_4_discount,
                                valid_until, status, created_by
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
                        ");

                        // Calcola data scadenza
                        $validityDays = (int)($quoteData['validity_days'] ?? 30);
                        if (isset($quoteData['custom_validity']) && !empty($quoteData['custom_validity'])) {
                            $validUntil = $quoteData['custom_validity'];
                        } else {
                            $validUntil = date('Y-m-d', strtotime("+{$validityDays} days"));
                        }

                        // Sconti su metodo pagamento
                        $enablePaymentDiscount = (int)($quoteData['enable_payment_discount'] ?? 0);
                        $oneTimeDiscount = (float)($quoteData['one_time_discount'] ?? 0);
                        $payment2Discount = (float)($quoteData['payment_2_discount'] ?? 0);
                        $payment3Discount = (float)($quoteData['payment_3_discount'] ?? 0);
                        $payment4Discount = (float)($quoteData['payment_4_discount'] ?? 0);

                        $stmt->execute([
                            $accessId, $contactId, $quoteNumber,
                            $quoteData['title'],
                            $quoteData['description'],
                            $projectType,
                            $projectTypeCustom,
                            json_encode($quoteData['objectives']),
                            json_encode($quoteData['bespoke_options']),
                            $subtotal, $taxRate, $taxAmount,
                            $discountPercentage, $discountAmount, $total,
                            $enablePaymentDiscount, $oneTimeDiscount, $payment2Discount,
                            $payment3Discount, $payment4Discount,
                            $validUntil,
                            $currentUser['id']
                        ]);

                        // Ottieni ID preventivo appena creato
                        $quoteId = $pdo->lastInsertId();

                        // Log accesso creato
                        $stmt = $pdo->prepare("
                            INSERT INTO client_activity_logs (
                                client_access_id, username, action, ip_address, user_agent, details
                            ) VALUES (?, ?, 'access_created', ?, ?, ?)
                        ");
                        $stmt->execute([
                            $accessId,
                            $username,
                            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                            'Accesso creato dall\'amministratore'
                        ]);
                    }

                    $pdo->commit();

                    // Se è stato creato un preventivo, invia notifica al cliente
                    if ($accessType === 'preventivo' && isset($quoteId) && isset($quoteNumber)) {
                        // Invia notifica email e crea notifica in dashboard
                        notifyClientNewQuote($pdo, $quoteId, $quoteNumber, $contactId);
                    }

                    // Link di attivazione
                    $activationLink = "https://portale.studiomismo.it/client-activation.php?token=" . $activationToken;
                    
                    echo json_encode([
                        'success' => true,
                        'message' => 'Accesso creato con successo',
                        'data' => [
                            'access_id' => $accessId,
                            'username' => $username,
                            'activation_link' => $activationLink
                        ]
                    ]);
                    
                } catch (Exception $e) {
                    $pdo->rollBack();
                    throw $e;
                }
                exit;
                
            case 'convert_to_dashboard':
                $accessId = (int)$_POST['access_id'];
                
                // Carica dati accesso e preventivo
                $stmt = $pdo->prepare("
                    SELECT ca.*, q.*
                    FROM client_access ca
                    LEFT JOIN quotes q ON q.client_access_id = ca.id
                    WHERE ca.id = ? AND ca.access_type = 'preventivo'
                ");
                $stmt->execute([$accessId]);
                $data = $stmt->fetch();
                
                if (!$data) {
                    throw new Exception('Accesso non trovato o non è un preventivo');
                }
                
                // Prepara dati dashboard dal preventivo
                $projectBudget = $_POST['project_budget'] ?? $data['total'];
                $monthlyFee = $_POST['monthly_fee'] ?? 0;
                $projectName = $_POST['project_name'] ?? $data['title'];
                $projectDescription = $_POST['project_description'] ?? $data['description'];
                $projectStartDate = $_POST['project_start_date'] ?? date('Y-m-d');
                $projectEndDate = $_POST['project_end_date'] ?? date('Y-m-d', strtotime('+12 months'));
                $driveFolder = $_POST['drive_folder_link'] ?? '';
                $documentsFolder = $_POST['documents_folder'] ?? '';
                $assetsFolder = $_POST['assets_folder'] ?? '';
                $invoiceFolder = $_POST['invoice_folder'] ?? '';
                $supportHours = $_POST['support_hours_included'] ?? 0;
                
                // Aggiorna accesso a cliente
                 $stmt = $pdo->prepare("
                    UPDATE client_access SET
                        access_type = 'cliente',
                        project_name = ?,
                        project_description = ?,
                        project_budget = ?,
                        monthly_fee = ?,
                        project_start_date = ?,
                        project_end_date = ?,
                        drive_folder_link = ?,
                        documents_folder = ?,
                        assets_folder = ?,
                        invoice_folder = ?,
                        bespoke_details = ?,
                        support_hours_included = ?  -- AGGIUNTO
                    WHERE id = ?
                ");
                
                $stmt->execute([
                    $projectName,
                    $projectDescription,
                    $projectBudget,
                    $monthlyFee,
                    $projectStartDate,
                    $projectEndDate,
                    $driveFolder,
                    $documentsFolder,
                    $assetsFolder,
                    $invoiceFolder,
                    json_encode(['converted_from_quote' => $data['quote_number']]),
                    $supportHours,  // AGGIUNTO
                    $accessId
                ]);
                
                // Log conversione
                $stmt = $pdo->prepare("
                    INSERT INTO client_activity_logs (
                        client_access_id, action, details, ip_address
                    ) VALUES (?, 'converted_to_dashboard', ?, ?)
                ");
                $stmt->execute([
                    $accessId,
                    'Convertito da preventivo a dashboard cliente',
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Convertito in Dashboard con successo'
                ]);
                exit;
                
            case 'update_dashboard':
                $accessId = (int)$_POST['access_id'];
                
                // Verifica che sia dashboard
                $stmt = $pdo->prepare("SELECT * FROM client_access WHERE id = ? AND access_type = 'cliente'");
                $stmt->execute([$accessId]);
                if (!$stmt->fetch()) {
                    throw new Exception('Accesso non trovato o non è una dashboard');
                }
                
                // AGGIUNTO: Leggi anche le ore supporto
                $supportHours = $_POST['support_hours_included'] ?? 0;
                
                // Aggiorna dati dashboard - QUERY CORRETTA CON support_hours_included
                $stmt = $pdo->prepare("
                    UPDATE client_access SET
                        project_name = ?,
                        project_description = ?,
                        project_budget = ?,
                        monthly_fee = ?,
                        project_start_date = ?,
                        project_end_date = ?,
                        drive_folder_link = ?,
                        documents_folder = ?,
                        assets_folder = ?,
                        invoice_folder = ?,
                        support_hours_included = ?
                    WHERE id = ?
                ");
                
                // EXECUTE CORRETTA con tutti i parametri incluso support_hours
                $stmt->execute([
                    $_POST['project_name'],
                    $_POST['project_description'],
                    $_POST['project_budget'],
                    $_POST['monthly_fee'],
                    $_POST['project_start_date'],
                    $_POST['project_end_date'],
                    $_POST['drive_folder_link'],
                    $_POST['documents_folder'],
                    $_POST['assets_folder'],
                    $_POST['invoice_folder'],
                    $supportHours,  // AGGIUNTO
                    $accessId
                ]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Dashboard aggiornata con successo'
                ]);
                exit;
                
            case 'toggle_access':
                $accessId = (int)$_POST['access_id'];
                $action = $_POST['toggle_action']; // 'lock' or 'unlock'
                
                $stmt = $pdo->prepare("
                    UPDATE client_access 
                    SET is_active = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $action === 'unlock' ? 1 : 0,
                    $accessId
                ]);
                
                // Log azione
                $stmt = $pdo->prepare("
                    INSERT INTO client_activity_logs (
                        client_access_id, action, details, ip_address
                    ) VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([
                    $accessId,
                    $action === 'lock' ? 'access_locked' : 'access_unlocked',
                    'Accesso ' . ($action === 'lock' ? 'bloccato' : 'sbloccato') . ' dall\'amministratore',
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Accesso ' . ($action === 'lock' ? 'bloccato' : 'sbloccato')
                ]);
                exit;
                
            case 'get_client_details':
                $accessId = (int)$_POST['access_id'];
                
                // Carica dettagli accesso
                $stmt = $pdo->prepare("
                    SELECT ca.*, 
                           lc.name as contact_name, lc.email as contact_email,
                           lc.phone as contact_phone, lc.address as contact_address,
                           lc.partita_iva, lc.codice_fiscale, lc.status as contact_status,
                           u.first_name as created_by_name
                    FROM client_access ca
                    INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
                    LEFT JOIN users u ON ca.created_by = u.id
                    WHERE ca.id = ?
                ");
                $stmt->execute([$accessId]);
                $access = $stmt->fetch();
                
                if (!$access) {
                    throw new Exception('Accesso non trovato');
                }
                
                // Carica TUTTI i preventivi (non solo l'ultimo)
                $quotes = [];
                $quote = null; // Manteniamo per retrocompatibilità
                if ($access['access_type'] === 'preventivo' || $access['access_type'] === 'cliente') {
                    $stmt = $pdo->prepare("
                        SELECT * FROM quotes
                        WHERE client_access_id = ?
                        AND status != 'preview'
                        ORDER BY created_at DESC
                    ");
                    $stmt->execute([$accessId]);
                    $quotes = $stmt->fetchAll();

                    // Imposta anche $quote al più recente per retrocompatibilità
                    if (!empty($quotes)) {
                        $quote = $quotes[0];
                    }
                }
                
                // Carica log accessi (ultimi 20)
                $stmt = $pdo->prepare("
                    SELECT * FROM client_activity_logs
                    WHERE client_access_id = ?
                    ORDER BY created_at DESC
                    LIMIT 20
                ");
                $stmt->execute([$accessId]);
                $accessLogs = $stmt->fetchAll();
                
                // Carica statistiche
                $stmt = $pdo->prepare("
                    SELECT 
                        COUNT(CASE WHEN action = 'login' THEN 1 END) as total_logins,
                        MAX(CASE WHEN action = 'login' THEN created_at END) as last_login,
                        COUNT(DISTINCT ip_address) as unique_ips,
                        COUNT(DISTINCT DATE(created_at)) as active_days
                    FROM client_activity_logs
                    WHERE client_access_id = ?
                ");
                $stmt->execute([$accessId]);
                $stats = $stmt->fetch();
                
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'access' => $access,
                        'quote' => $quote, // Ultimo preventivo (retrocompatibilità)
                        'quotes' => $quotes, // TUTTI i preventivi
                        'logs' => $accessLogs,
                        'stats' => $stats
                    ]
                ]);
                exit;

            case 'create_temp_preview':
                // Crea un preventivo temporaneo per l'anteprima
                // NOTA: Questo preventivo è marcato come 'preview' e può essere eliminato automaticamente

                $quoteData = json_decode($_POST['quote_data'], true);

                if (!$quoteData || !isset($quoteData['contact_id'])) {
                    throw new Exception('Dati preventivo non validi');
                }

                $contactId = (int)$quoteData['contact_id'];

                // Genera numero preventivo temporaneo
                $year = date('Y');
                $quoteNumber = sprintf('PREVIEW-%s-%s', $year, uniqid());

                // Prepara dati preventivo
                $projectType = $quoteData['project_type'] ?? 'personalizzato';
                $projectTypeCustom = null;
                if ($projectType === 'personalizzato') {
                    $projectTypeCustom = $quoteData['project_type_custom'] ?? '';
                }

                // Calcola totali
                $subtotal = (float)($quoteData['subtotal'] ?? 0);
                $taxRate = (float)($quoteData['tax_rate'] ?? 22);
                $discountPercentage = (float)($quoteData['discount_percentage'] ?? 0);

                $discountAmount = $subtotal * ($discountPercentage / 100);
                $afterDiscount = $subtotal - $discountAmount;
                $taxAmount = $afterDiscount * ($taxRate / 100);
                $total = $afterDiscount + $taxAmount;

                // Inserisci preventivo temporaneo
                $stmt = $pdo->prepare("
                    INSERT INTO quotes (
                        client_access_id, contact_id, quote_number,
                        title, description, project_type, project_type_custom,
                        objectives, bespoke_options,
                        subtotal, tax_rate, tax_amount,
                        discount_percentage, discount_amount, total,
                        enable_payment_discount, one_time_discount, payment_2_discount,
                        payment_3_discount, payment_4_discount,
                        valid_until, status, created_by
                    ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'preview', ?)
                ");

                // Calcola data scadenza
                $validityDays = (int)($quoteData['validity_days'] ?? 30);
                if (isset($quoteData['custom_validity']) && !empty($quoteData['custom_validity'])) {
                    $validUntil = $quoteData['custom_validity'];
                } else {
                    $validUntil = date('Y-m-d', strtotime("+{$validityDays} days"));
                }

                // Sconti su metodo pagamento
                $enablePaymentDiscount = (int)($quoteData['enable_payment_discount'] ?? 0);
                $oneTimeDiscount = (float)($quoteData['one_time_discount'] ?? 0);
                $payment2Discount = (float)($quoteData['payment_2_discount'] ?? 0);
                $payment3Discount = (float)($quoteData['payment_3_discount'] ?? 0);
                $payment4Discount = (float)($quoteData['payment_4_discount'] ?? 0);

                $stmt->execute([
                    $contactId, $quoteNumber,
                    $quoteData['title'] ?? 'Preventivo',
                    $quoteData['description'] ?? '',
                    $projectType,
                    $projectTypeCustom,
                    json_encode($quoteData['objectives'] ?? []),
                    json_encode($quoteData['bespoke_options'] ?? []),
                    $subtotal, $taxRate, $taxAmount,
                    $discountPercentage, $discountAmount, $total,
                    $enablePaymentDiscount, $oneTimeDiscount, $payment2Discount,
                    $payment3Discount, $payment4Discount,
                    $validUntil,
                    $currentUser['id']
                ]);

                $quoteId = $pdo->lastInsertId();

                echo json_encode([
                    'success' => true,
                    'message' => 'Anteprima creata',
                    'data' => [
                        'quote_id' => $quoteId,
                        'quote_number' => $quoteNumber
                    ]
                ]);
                exit;

        case 'reactivate_quote':
                $quoteId = (int)($_POST['quote_id'] ?? 0);

                if ($quoteId <= 0) {
                    throw new Exception('ID preventivo non valido');
                }

                // Verifica che il preventivo esista
                $stmt = $pdo->prepare("SELECT id, status FROM quotes WHERE id = ?");
                $stmt->execute([$quoteId]);
                $quote = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$quote) {
                    throw new Exception('Preventivo non trovato');
                }

                // Estendi validità di 30 giorni e riattiva
                $newValidUntil = date('Y-m-d', strtotime('+30 days'));
                $stmt = $pdo->prepare("
                    UPDATE quotes
                    SET status = 'sent',
                        valid_until = ?,
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([$newValidUntil, $quoteId]);

                echo json_encode([
                    'success' => true,
                    'message' => 'Preventivo riattivato con successo',
                    'data' => [
                        'valid_until' => $newValidUntil,
                        'status' => 'sent'
                    ]
                ]);
                exit;

        case 'create_quote_for_existing_access':
                $accessId = (int)$_POST['access_id'];
                $quoteData = json_decode($_POST['quote_data'], true);

                if (!$accessId) {
                    throw new Exception('ID accesso non valido');
                }

                // Verifica che l'accesso esista
                $stmt = $pdo->prepare("SELECT id, contact_id FROM client_access WHERE id = ?");
                $stmt->execute([$accessId]);
                $access = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$access) {
                    throw new Exception('Accesso non trovato');
                }

                // Genera numero preventivo
                $year = date('Y');
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM quotes WHERE YEAR(created_at) = ?");
                $stmt->execute([$year]);
                $count = $stmt->fetchColumn();
                $quoteNumber = 'QT-' . $year . '-' . str_pad($count + 1, 3, '0', STR_PAD_LEFT);

                // Calcola totali
                $subtotal = (float)($quoteData['subtotal'] ?? 0);
                $taxRate = (float)($quoteData['tax_rate'] ?? 22);
                $discountPercentage = (float)($quoteData['discount_percentage'] ?? 0);

                $discountAmount = $subtotal * ($discountPercentage / 100);
                $afterDiscount = $subtotal - $discountAmount;
                $taxAmount = $afterDiscount * ($taxRate / 100);
                $total = $afterDiscount + $taxAmount;

                // Validità
                $validityDays = (int)($quoteData['validity_days'] ?? 30);
                if (isset($quoteData['custom_validity']) && !empty($quoteData['custom_validity'])) {
                    $validUntil = $quoteData['custom_validity'];
                } else {
                    $validUntil = date('Y-m-d', strtotime("+{$validityDays} days"));
                }

                // Sconti pagamento
                $enablePaymentDiscount = (int)($quoteData['enable_payment_discount'] ?? 0);
                $oneTimeDiscount = (float)($quoteData['one_time_discount'] ?? 0);
                $payment2Discount = (float)($quoteData['payment_2_discount'] ?? 0);
                $payment3Discount = (float)($quoteData['payment_3_discount'] ?? 0);
                $payment4Discount = (float)($quoteData['payment_4_discount'] ?? 0);

                // Project type
                $projectType = $quoteData['project_type'] ?? null;
                $projectTypeCustom = ($projectType === 'custom') ? ($quoteData['project_type_custom'] ?? null) : null;

                // Inserisci nuovo preventivo
                $stmt = $pdo->prepare("
                    INSERT INTO quotes (
                        client_access_id, contact_id, quote_number,
                        title, description, project_type, project_type_custom,
                        objectives, bespoke_options,
                        subtotal, tax_rate, tax_amount,
                        discount_percentage, discount_amount, total,
                        enable_payment_discount, one_time_discount, payment_2_discount,
                        payment_3_discount, payment_4_discount,
                        valid_until, status, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?)
                ");

                $stmt->execute([
                    $accessId, $access['contact_id'], $quoteNumber,
                    $quoteData['title'],
                    $quoteData['description'],
                    $projectType,
                    $projectTypeCustom,
                    json_encode($quoteData['objectives']),
                    json_encode($quoteData['bespoke_options']),
                    $subtotal, $taxRate, $taxAmount,
                    $discountPercentage, $discountAmount, $total,
                    $enablePaymentDiscount, $oneTimeDiscount, $payment2Discount,
                    $payment3Discount, $payment4Discount,
                    $validUntil,
                    $currentUser['id']
                ]);

                $quoteId = $pdo->lastInsertId();

                // Invia notifica al cliente
                notifyClientNewQuote($pdo, $quoteId, $quoteNumber, $access['contact_id']);

                echo json_encode([
                    'success' => true,
                    'message' => 'Nuovo preventivo creato',
                    'data' => [
                        'quote_id' => $quoteId,
                        'quote_number' => $quoteNumber
                    ]
                ]);
                exit;
        }

    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
        exit;
    }
}

// Carica lista accessi esistenti
$stmt = $pdo->prepare("
    SELECT ca.*,
           lc.name as company_name, lc.email as contact_email,
           q.id as quote_id, q.quote_number, q.title as quote_title, q.status as quote_status,
           (CASE WHEN q.id IS NOT NULL THEN 1 ELSE 0 END) as has_quote,
           COALESCE(u.first_name, 'N/A') as created_by_name
    FROM client_access ca
    INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
    LEFT JOIN quotes q ON q.client_access_id = ca.id AND q.status != 'preview'
    LEFT JOIN users u ON ca.created_by = u.id
    ORDER BY ca.created_at DESC
");
$stmt->execute();
$clientAccesses = $stmt->fetchAll();

// Genera contenuto
ob_start();
?>

<!-- CSS Stile Notion Bianco/Nero -->
<style>

    .modal {
        z-index: 99999;
    }
    /* Modal Grande (1000px) */
    .modal-large {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }
    
    .modal-large.show {
        display: flex;
    }
    
    .modal-content-large {
        background: #ffffff;
        border-radius: 6px;
        width: 100%;
        max-width: 1000px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        border: 1px solid #e9e9e7;
    }
    
    .modal-header-notion {
        padding: 24px 32px;
        border-bottom: 1px solid #e9e9e7;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }
    
    .modal-title-notion {
        font-size: 20px;
        font-weight: 600;
        color: #37352f;
        font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    .modal-close-notion {
        background: none;
        border: none;
        font-size: 24px;
        color: #787774;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.15s ease;
    }
    
    .modal-close-notion:hover {
        background: #f7f7f5;
    }
    
    .modal-body-notion {
        padding: 32px;
        overflow-y: auto;
        flex: 1;
        font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    .modal-footer-notion {
        padding: 24px 32px;
        border-top: 1px solid #e9e9e7;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }
    
    /* Wizard Steps */
    .wizard-container {
        max-width: 800px;
        margin: 0 auto;
    }
    
    .wizard-steps {
        display: flex;
        justify-content: space-between;
        margin-bottom: 40px;
        position: relative;
    }
    
    .wizard-steps::before {
        content: '';
        position: absolute;
        top: 20px;
        left: 0;
        right: 0;
        height: 1px;
        background: #e9e9e7;
        z-index: -1;
    }
    
    .wizard-step {
        background: #ffffff;
        padding: 0 10px;
        text-align: center;
        flex: 1;
    }
    
    .step-number {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #f7f7f5;
        color: #787774;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 16px;
        border: 2px solid #e9e9e7;
        margin-bottom: 8px;
    }
    
    .wizard-step.active .step-number {
        background: #37352f;
        color: #ffffff;
        border-color: #37352f;
    }
    
    .wizard-step.completed .step-number {
        background: #37352f;
        color: #ffffff;
        border-color: #37352f;
    }
    
    .wizard-step.completed .step-number::after {
        content: '✓';
        position: absolute;
    }
    
    .step-label {
        font-size: 12px;
        color: #787774;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Forms Notion Style */
    .form-group-notion {
        margin-bottom: 24px;
    }
    
    .form-label-notion {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #37352f;
        margin-bottom: 8px;
    }
    
    .form-control-notion {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d3d3d1;
        border-radius: 4px;
        font-size: 14px;
        font-family: inherit;
        background: #ffffff;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    
    .form-control-notion:focus {
        outline: none;
        border-color: #37352f;
        box-shadow: 0 0 0 1px #37352f;
    }
    
    .form-row-notion {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
    }
    
    /* Bespoke Options */
    .bespoke-container {
        max-height: 400px;
        overflow-y: auto;
        padding: 4px;
    }
    
    .bespoke-option {
        border: 1px solid #e9e9e7;
        border-radius: 6px;
        padding: 20px;
        background: #f7f7f5;
        transition: all 0.15s ease;
        margin-bottom: 16px;
    }
    
    .bespoke-title {
        font-size: 16px;
        font-weight: 600;
        color: #37352f;
        margin-bottom: 12px;
    }
    
    .bespoke-price {
        font-size: 24px;
        font-weight: 700;
        color: #37352f;
        margin-top: 12px;
    }
    
    /* Obiettivi */
    .objective-row {
        display: grid;
        grid-template-columns: 60px 200px 1fr;
        gap: 12px;
        align-items: start;
        margin-bottom: 16px;
        padding: 16px;
        background: #f7f7f5;
        border-radius: 6px;
    }
    
    .objective-number {
        font-size: 24px;
        font-weight: 700;
        color: #37352f;
        text-align: center;
    }
    
    /* Client Details Card */
    .client-card {
        background: #ffffff;
        border: 1px solid #e9e9e7;
        border-radius: 6px;
        overflow: hidden;
    }
    
    .client-card-section {
        padding: 24px;
        border-bottom: 1px solid #e9e9e7;
    }
    
    .client-card-section:last-child {
        border-bottom: none;
    }
    
    .section-title-notion {
        font-size: 16px;
        font-weight: 600;
        color: #37352f;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e9e9e7;
    }
    
    /* Tabs */
    .tabs-container {
        border-bottom: 1px solid #e9e9e7;
        margin-bottom: 24px;
    }
    
    .tabs-list {
        display: flex;
        gap: 32px;
    }
    
    .tab-item {
        padding: 12px 0;
        font-size: 14px;
        font-weight: 500;
        color: #787774;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    
    .tab-item:hover {
        color: #37352f;
    }
    
    .tab-item.active {
        color: #37352f;
        border-bottom-color: #37352f;
    }
    
    .tab-content {
        display: none;
    }
    
    .tab-content.active {
        display: block;
    }
    
    /* Buttons Notion */
    .btn-notion {
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
        border: 1px solid;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    
    .btn-notion-primary {
        background: #37352f;
        color: #ffffff;
        border-color: #37352f;
    }
    
    .btn-notion-primary:hover {
        background: #2f2e29;
    }
    
    .btn-notion-secondary {
        background: #ffffff;
        color: #37352f;
        border-color: #d3d3d1;
    }
    
    .btn-notion-secondary:hover {
        background: #f7f7f5;
        border-color: #787774;
    }
    
    /* Investment Summary */
    .investment-summary {
        background: #f7f7f5;
        border: 1px solid #e9e9e7;
        border-radius: 6px;
        padding: 24px;
        margin-top: 32px;
    }
    
    .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 14px;
    }
    
    .summary-row.total {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #d3d3d1;
        font-size: 18px;
        font-weight: 600;
    }
    
    /* Status badges */
    .status-badge-notion {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }
    
    .status-preventivo {
        background: #f0f9ff;
        color: #0c4a6e;
        border: 1px solid #bae6fd;
    }
    
    .status-cliente {
        background: #f0fdf4;
        color: #14532d;
        border: 1px solid #bbf7d0;
    }
    
    /* Conversion Form */
    .conversion-form {
        padding: 20px;
        background: #f7f7f5;
        border-radius: 6px;
    }
    
    .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-bottom: 20px;
    }
</style>

<div class="task-manager-container">
    <!-- Header -->
    <div class="task-manager-header">
        <div class="task-title-section">
            <h1>Gestione Accessi Clienti</h1>
        </div>
        
        <div class="task-controls">
            <button class="reset-filters-btn" onclick="openWizardModal()">
                + Nuovo Accesso
            </button>
        </div>
    </div>

    <!-- Stats rapide -->
    <div class="task-stats-quick">
        <div class="stat-quick total">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
                <div class="stat-value"><?= count($clientAccesses) ?></div>
                <div class="stat-label">Accessi totali</div>
            </div>
        </div>
        
        <div class="stat-quick assigned">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
                <div class="stat-value">
                    <?= count(array_filter($clientAccesses, fn($a) => !$a['password_hash'])) ?>
                </div>
                <div class="stat-label">Da attivare</div>
            </div>
        </div>
        
        <div class="stat-quick overdue">
            <div class="stat-icon">📄</div>
            <div class="stat-content">
                <div class="stat-value">
                    <?= count(array_filter($clientAccesses, fn($a) => $a['access_type'] === 'preventivo')) ?>
                </div>
                <div class="stat-label">Solo preventivo</div>
            </div>
        </div>
        
        <div class="stat-quick today">
            <div class="stat-icon">🏢</div>
            <div class="stat-content">
                <div class="stat-value">
                    <?= count(array_filter($clientAccesses, fn($a) => $a['access_type'] === 'cliente')) ?>
                </div>
                <div class="stat-label">Dashboard complete</div>
            </div>
        </div>
    </div>

    <!-- Lista accessi -->
    <div class="task-main-area">
        <div style="background: var(--tm-bg-primary); border: 1px solid var(--tm-border); border-radius: var(--tm-radius); overflow: hidden;">
            <div style="padding: 16px 24px; background: var(--tm-bg-secondary); border-bottom: 1px solid var(--tm-border); font-weight: 600;">
                Accessi Clienti
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: var(--tm-bg-secondary);">
                        <th style="text-align: left; padding: 12px 24px; font-size: 12px; font-weight: 500; color: var(--tm-text-secondary); text-transform: uppercase;">Cliente</th>
                        <th style="text-align: left; padding: 12px 24px; font-size: 12px; font-weight: 500; color: var(--tm-text-secondary); text-transform: uppercase;">Username</th>
                        <th style="text-align: left; padding: 12px 24px; font-size: 12px; font-weight: 500; color: var(--tm-text-secondary); text-transform: uppercase;">Tipo</th>
                        <th style="text-align: left; padding: 12px 24px; font-size: 12px; font-weight: 500; color: var(--tm-text-secondary); text-transform: uppercase;">Stato</th>
                        <th style="text-align: left; padding: 12px 24px; font-size: 12px; font-weight: 500; color: var(--tm-text-secondary); text-transform: uppercase;">Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($clientAccesses as $access): ?>
                    <tr style="border-bottom: 1px solid var(--tm-border); cursor: pointer;" onclick="openClientDetails(<?= $access['id'] ?>)">
                        <td style="padding: 16px 24px;">
                            <div style="font-weight: 600; color: var(--tm-text-primary);"><?= htmlspecialchars($access['company_name']) ?></div>
                            <div style="font-size: 12px; color: var(--tm-text-secondary);"><?= htmlspecialchars($access['contact_email']) ?></div>
                        </td>
                        <td style="padding: 16px 24px;"><?= htmlspecialchars($access['username']) ?></td>
                        <td style="padding: 16px 24px;">
                            <span class="status-badge-notion status-<?= $access['access_type'] ?>">
                                <?= $access['access_type'] ?>
                            </span>
                        </td>
                        <td style="padding: 16px 24px;">
                            <?php if ($access['is_active'] && $access['password_hash']): ?>
                                <span style="color: var(--tm-completed);">✅ Attivo</span>
                            <?php elseif ($access['is_active'] && !$access['password_hash']): ?>
                                <span style="color: var(--tm-pending);">⏳ Da attivare</span>
                            <?php else: ?>
                                <span style="color: var(--tm-error);">❌ Non attivo</span>
                            <?php endif; ?>
                        </td>
                        <td style="padding: 16px 24px;" onclick="event.stopPropagation()">
                            <div style="display: flex; gap: 8px;">
                                <?php if ($access['access_type'] === 'preventivo' && $access['has_quote']): ?>
                                    <button class="btn btn-sm btn-secondary" onclick="openSavedQuotePreview(<?= $access['quote_id'] ?>)" title="Anteprima Preventivo">
                                        👁️
                                    </button>
                                <?php endif; ?>
                                <button class="btn btn-sm" onclick="openClientDetails(<?= $access['id'] ?>)">
                                    Dettagli
                                </button>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal Wizard Creazione -->
<div id="wizardModal" class="modal-large">
    <div class="modal-content-large">
        <div class="modal-header-notion">
            <h2 class="modal-title-notion">Nuovo Accesso Cliente</h2>
            <button class="modal-close-notion" onclick="closeWizardModal()">&times;</button>
        </div>
        <div class="modal-body-notion">
            <div class="wizard-container">
                <!-- Steps Indicator -->
                <div class="wizard-steps">
                    <div class="wizard-step active" id="step1-indicator">
                        <div class="step-number">1</div>
                        <div class="step-label">Informazioni Base</div>
                    </div>
                    
                    <div class="wizard-step" id="step2-indicator">
                        <div class="step-number">2</div>
                        <div class="step-label">Dettagli Progetto</div>
                    </div>
                    <div class="wizard-step" id="step3-indicator">
                        <div class="step-number">3</div>
                        <div class="step-label">Riepilogo</div>
                    </div>
                </div>
                
                <!-- Step 1: Base Info -->
                <div id="step1" class="wizard-content">
                    <div class="form-group-notion">
                        <label class="form-label-notion">Cliente *</label>
                        <?= renderContactSelector('wizardContact', 'wizard_contact_id', '', null, true, 'Cerca contatto...') ?>
                    </div>
                    
                    <div class="form-group-notion">
                        <label class="form-label-notion">Username *</label>
                        <input type="text" id="wizardUsername" class="form-control-notion" required 
                               placeholder="es: nome_azienda" pattern="[a-zA-Z0-9_]+">
                        <div style="font-size: 12px; color: #787774; margin-top: 4px;">Solo lettere, numeri e underscore. Min 3 caratteri.</div>
                    </div>
                    
                    <div class="form-group-notion">
                        <label class="form-label-notion">Tipo di Accesso *</label>
                        <select id="wizardAccessType" class="form-control-notion" required onchange="handleAccessTypeChange()">
                            <option value="">-- Seleziona --</option>
                            <option value="preventivo">Preventivo</option>
                            <option value="cliente">Dashboard Cliente</option>
                        </select>
                    </div>
                </div>
                
                <!-- Step 2: Project Details (for preventivo) -->
                <div id="step2" class="wizard-content" style="display: none;">
                    <div class="form-group-notion">
                        <label class="form-label-notion">Tipo di Progetto *</label>
                        <select id="wizardProjectType" class="form-control-notion" required onchange="handleProjectTypeChange()">
                            <option value="">-- Seleziona --</option>
                            <option value="sito">Sito Web</option>
                            <option value="social">Social Media</option>
                            <option value="brand">Brand Identity</option>
                            <option value="grafico">Progetto Grafico</option>
                            <option value="personalizzato">Personalizzato</option>
                        </select>
                    </div>
                    
                    <div id="customProjectTypeDiv" class="form-group-notion" style="display: none;">
                        <label class="form-label-notion">Nome Progetto Personalizzato *</label>
                        <input type="text" id="wizardProjectCustom" class="form-control-notion" 
                               placeholder="es: Campagna Marketing Integrata">
                    </div>
                    
                    <div class="form-group-notion">
                        <label class="form-label-notion">Titolo Preventivo *</label>
                        <input type="text" id="wizardTitle" class="form-control-notion" required 
                               placeholder="es: Restyling Sito Web Aziendale">
                    </div>
                    
                    <div class="form-group-notion">
                        <label class="form-label-notion">Descrizione Progetto</label>
                        <textarea id="wizardDescription" class="form-control-notion" rows="4"
                                  placeholder="Descrivi il progetto e le sue caratteristiche principali..."></textarea>
                    </div>
                    
                    <div class="form-group-notion">
                        <label class="form-label-notion">3 Obiettivi Principali</label>
                        <!-- Obiettivo 1 -->
                        <div class="objective-row">
                            <div class="objective-number">1</div>
                            <input type="text" class="form-control-notion" id="wizardObjective1Title" 
                                   placeholder="Titolo obiettivo">
                            <textarea class="form-control-notion" id="wizardObjective1Desc" rows="2"
                                      placeholder="Descrizione obiettivo"></textarea>
                        </div>
                        <!-- Obiettivo 2 -->
                        <div class="objective-row">
                            <div class="objective-number">2</div>
                            <input type="text" class="form-control-notion" id="wizardObjective2Title" 
                                   placeholder="Titolo obiettivo">
                            <textarea class="form-control-notion" id="wizardObjective2Desc" rows="2"
                                      placeholder="Descrizione obiettivo"></textarea>
                        </div>
                        <!-- Obiettivo 3 -->
                        <div class="objective-row">
                            <div class="objective-number">3</div>
                            <input type="text" class="form-control-notion" id="wizardObjective3Title" 
                                   placeholder="Titolo obiettivo">
                            <textarea class="form-control-notion" id="wizardObjective3Desc" rows="2"
                                      placeholder="Descrizione obiettivo"></textarea>
                        </div>
                    </div>
                    
                    <div class="form-group-notion">
                        <label class="form-label-notion">Opzioni Bespoke (Pacchetti di investimento)</label>
                        <div class="bespoke-container" id="bespokeContainer">
                            <!-- Generato dinamicamente -->
                        </div>
                        <button type="button" class="btn-notion btn-notion-secondary" onclick="addBespokeOption()">
                            + Aggiungi Opzione
                        </button>
                    </div>
                    
                    <div class="form-group-notion">
                        <label class="form-label-notion">Dettagli Investimento</label>
                        <div class="form-row-notion">
                            <div>
                                <label class="form-label-notion">Subtotale € <small style="color: #787774;">(calcolato automaticamente dal pacchetto più basso)</small></label>
                                <input type="number" id="wizardSubtotal" class="form-control-notion"
                                       step="0.01" min="0" value="0" readonly style="background: #f7f7f5;">
                            </div>
                            <div>
                                <label class="form-label-notion">IVA %</label>
                                <input type="number" id="wizardTaxRate" class="form-control-notion"
                                       step="0.01" min="0" value="0" onchange="calculateTotal()">
                            </div>
                        </div>
                        <div class="form-row-notion" style="margin-top: 16px;">
                            <div>
                                <label class="form-label-notion">Sconto Base %</label>
                                <input type="number" id="wizardDiscountPercentage" class="form-control-notion"
                                       step="0.01" min="0" value="0" onchange="calculateTotal()">
                            </div>
                            <div>
                                <label class="form-label-notion">Totale € <small style="color: #787774;">(base, senza pacchetto selezionato)</small></label>
                                <input type="text" id="wizardTotal" class="form-control-notion" readonly value="0.00" style="background: #f7f7f5;">
                            </div>
                        </div>
                    </div>

                    <!-- NUOVO: Sconto su metodo pagamento -->
                    <div class="form-group-notion">
                        <label class="checkbox-label-notion">
                            <input type="checkbox" id="wizardEnablePaymentDiscount" onchange="togglePaymentDiscounts()">
                            <span>Abilita sconto su modalità di pagamento</span>
                        </label>
                        <small style="display: block; margin-top: 8px; color: #787774;">
                            Se abilitato, il cliente potrà scegliere come pagare con sconti personalizzati
                        </small>
                    </div>

                    <div id="paymentDiscountsSection" style="display: none; margin-top: 16px; padding: 20px; background: #f7f7f5; border-radius: 6px;">
                        <h4 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Configura sconti per metodo di pagamento</h4>

                        <div class="form-row-notion">
                            <div>
                                <label class="form-label-notion">Pagamento Unico (Sconto %)</label>
                                <input type="number" id="wizardOneTimeDiscount" class="form-control-notion"
                                       step="0.01" min="0" max="100" value="5" placeholder="Es: 10">
                                <small style="color: #787774; font-size: 11px;">Sconto per chi paga in un'unica soluzione</small>
                            </div>
                            <div>
                                <label class="form-label-notion">2 Rate (Sconto %)</label>
                                <input type="number" id="wizardPayment2Discount" class="form-control-notion"
                                       step="0.01" min="0" max="100" value="0" placeholder="Es: 5">
                                <small style="color: #787774; font-size: 11px;">Sconto per pagamento in 2 rate</small>
                            </div>
                        </div>

                        <div class="form-row-notion" style="margin-top: 12px;">
                            <div>
                                <label class="form-label-notion">3 Rate (Sconto %)</label>
                                <input type="number" id="wizardPayment3Discount" class="form-control-notion"
                                       step="0.01" min="0" max="100" value="0" placeholder="Es: 2">
                                <small style="color: #787774; font-size: 11px;">Sconto per pagamento in 3 rate</small>
                            </div>
                            <div>
                                <label class="form-label-notion">4 Rate (Sconto %)</label>
                                <input type="number" id="wizardPayment4Discount" class="form-control-notion"
                                       step="0.01" min="0" max="100" value="0" placeholder="Es: 0">
                                <small style="color: #787774; font-size: 11px;">Sconto per pagamento in 4 rate</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group-notion">
                        <label class="form-label-notion">Validità Preventivo</label>
                        <div class="form-row-notion">
                            <div>
                                <label class="form-label-notion">Durata (giorni)</label>
                                <select id="wizardValidityDays" class="form-control-notion">
                                    <option value="7">7 giorni</option>
                                    <option value="15">15 giorni</option>
                                    <option value="30" selected>30 giorni</option>
                                    <option value="60">60 giorni</option>
                                    <option value="90">90 giorni</option>
                                    <option value="custom">Personalizzato</option>
                                </select>
                            </div>
                            <div id="customValidityDiv" style="display: none;">
                                <label class="form-label-notion">Data Scadenza</label>
                                <input type="date" id="wizardCustomValidity" class="form-control-notion" 
                                       min="<?= date('Y-m-d', strtotime('+1 day')) ?>">
                            </div>
                        </div>
                        <div style="font-size: 12px; color: #787774; margin-top: 4px;">
                            ⚠️ Alla scadenza, l'accesso al preventivo verrà bloccato automaticamente
                        </div>
                    </div>
                </div>
                
                <!-- Step 3: Summary -->
                <div id="step3" class="wizard-content" style="display: none;">
                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0c4a6e; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                        📝 Riepilogo del nuovo accesso. Verifica tutti i dati prima di salvare.
                    </div>
                    
                    <div id="wizardSummary">
                        <!-- Generato dinamicamente -->
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer-notion">
            <div>
                <button class="btn-notion btn-notion-secondary" id="btnPrevious" onclick="previousStep()" style="display: none;">
                    ← Indietro
                </button>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
                <button class="btn-notion btn-notion-secondary" id="btnPreview" onclick="openPreventivoPrev()" style="display: none;">
                    👁️ Anteprima Preventivo
                </button>
                <button class="btn-notion btn-notion-primary" id="btnNext" onclick="nextStep()">
                    Continua →
                </button>
                <button class="btn-notion btn-notion-primary" id="btnSave" onclick="saveWizard()" style="display: none;">
                    💾 Salva Accesso
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Dettagli Cliente -->
<div id="detailsModal" class="modal-large">
    <div class="modal-content-large">
        <div class="modal-header-notion">
            <h2 class="modal-title-notion" id="detailsTitle">Dettagli Cliente</h2>
            <button class="modal-close-notion" onclick="closeDetailsModal()">&times;</button>
        </div>
        <div class="modal-body-notion">
            <div id="detailsContent">
                <!-- Caricato dinamicamente -->
            </div>
        </div>
        <div class="modal-footer-notion">
            <button class="btn-notion btn-notion-secondary" onclick="closeDetailsModal()">
                Chiudi
            </button>
            <button class="btn-notion btn-notion-primary" id="btnConvert" style="display: none;" onclick="showConversionForm()">
                🔄 Converti in Dashboard
            </button>
        </div>
    </div>
</div>

<!-- JavaScript -->
<script>
    // Variabili globali
    let currentStep = 1;
    let wizardData = {};
    let bespokeCount = 0;
    let currentAccessId = null;
    
    // Wizard functions
    function openWizardModal() {
        document.getElementById('wizardModal').classList.add('show');
        currentStep = 1;
        wizardData = {};
        bespokeCount = 0;
        updateWizardStep();
    }
    
    function closeWizardModal() {
        document.getElementById('wizardModal').classList.remove('show');
        resetWizard();
    }
    
    function resetWizard() {
        currentStep = 1;
        wizardData = {};
        bespokeCount = 0;
        document.getElementById('wizardModal').querySelectorAll('input, textarea, select').forEach(el => {
            el.value = '';
        });
        document.getElementById('bespokeContainer').innerHTML = '';
    }
    
    function handleAccessTypeChange() {
        const type = document.getElementById('wizardAccessType').value;
        if (type === 'cliente') {
            document.getElementById('step2-indicator').style.display = 'none';
        } else {
            document.getElementById('step2-indicator').style.display = 'block';
        }
    }
    
    function handleProjectTypeChange() {
        const type = document.getElementById('wizardProjectType').value;
        const customDiv = document.getElementById('customProjectTypeDiv');
        if (type === 'personalizzato') {
            customDiv.style.display = 'block';
            document.getElementById('wizardProjectCustom').required = true;
        } else {
            customDiv.style.display = 'none';
            document.getElementById('wizardProjectCustom').required = false;
        }
    }
    
    function nextStep() {
        if (validateCurrentStep()) {
            saveStepData();
            
            const accessType = document.getElementById('wizardAccessType').value;
            
            if (currentStep === 1 && accessType === 'cliente') {
                currentStep = 3;
            } else {
                currentStep++;
            }
            
            updateWizardStep();
        }
    }
    
    function previousStep() {
        const accessType = document.getElementById('wizardAccessType').value;
        
        if (currentStep === 3 && accessType === 'cliente') {
            currentStep = 1;
        } else {
            currentStep--;
        }
        
        updateWizardStep();
    }
    
    function validateCurrentStep() {
        switch(currentStep) {
            case 1:
                const contactId = document.querySelector('input[name="wizard_contact_id"]')?.value;
                const username = document.getElementById('wizardUsername').value;
                const accessType = document.getElementById('wizardAccessType').value;
                
                if (!contactId || !username || !accessType) {
                    alert('Compila tutti i campi obbligatori');
                    return false;
                }
                
                if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
                    alert('Username non valido (min 3 caratteri, solo lettere/numeri/underscore)');
                    return false;
                }
                break;
                
            case 2:
                const projectType = document.getElementById('wizardProjectType').value;
                const title = document.getElementById('wizardTitle').value;
                
                if (!projectType || !title) {
                    alert('Compila tipo progetto e titolo');
                    return false;
                }
                
                if (projectType === 'personalizzato') {
                    const customType = document.getElementById('wizardProjectCustom').value;
                    if (!customType) {
                        alert('Inserisci il nome del progetto personalizzato');
                        return false;
                    }
                }
                break;
        }
        
        return true;
    }
    
    function saveStepData() {
        switch(currentStep) {
            case 1:
                wizardData.contact_id = document.querySelector('input[name="wizard_contact_id"]')?.value;
                wizardData.username = document.getElementById('wizardUsername').value;
                wizardData.access_type = document.getElementById('wizardAccessType').value;
                break;
                
            case 2:
                wizardData.project_type = document.getElementById('wizardProjectType').value;
                wizardData.project_type_custom = document.getElementById('wizardProjectCustom').value;
                wizardData.title = document.getElementById('wizardTitle').value;
                wizardData.description = document.getElementById('wizardDescription').value;
                
                // Raccolta obiettivi con numero, titolo e descrizione
                wizardData.objectives = [];
                for (let i = 1; i <= 3; i++) {
                    const title = document.getElementById(`wizardObjective${i}Title`).value;
                    const desc = document.getElementById(`wizardObjective${i}Desc`).value;
                    if (title || desc) {
                        wizardData.objectives.push({
                            number: i,
                            title: title,
                            description: desc
                        });
                    }
                }
                
                // Raccogli opzioni bespoke (tutte, senza limite)
                wizardData.bespoke_options = [];
                document.querySelectorAll('.bespoke-option').forEach((option, index) => {
                    const title = option.querySelector('.bespoke-title-input')?.value;
                    const price = option.querySelector('.bespoke-price-input')?.value;
                    const features = Array.from(option.querySelectorAll('.bespoke-feature-input'))
                        .map(input => input.value)
                        .filter(f => f);
                    
                    if (title && price) {
                        wizardData.bespoke_options.push({ 
                            id: index + 1,
                            title, 
                            price, 
                            features 
                        });
                    }
                });
                
                wizardData.subtotal = parseFloat(document.getElementById('wizardSubtotal').value) || 0;
                wizardData.tax_rate = parseFloat(document.getElementById('wizardTaxRate').value) || 0;
                wizardData.discount_percentage = parseFloat(document.getElementById('wizardDiscountPercentage').value) || 0;

                // NUOVO: Sconti su metodo pagamento
                wizardData.enable_payment_discount = document.getElementById('wizardEnablePaymentDiscount').checked ? 1 : 0;
                if (wizardData.enable_payment_discount) {
                    wizardData.one_time_discount = parseFloat(document.getElementById('wizardOneTimeDiscount').value) || 0;
                    wizardData.payment_2_discount = parseFloat(document.getElementById('wizardPayment2Discount').value) || 0;
                    wizardData.payment_3_discount = parseFloat(document.getElementById('wizardPayment3Discount').value) || 0;
                    wizardData.payment_4_discount = parseFloat(document.getElementById('wizardPayment4Discount').value) || 0;
                } else {
                    wizardData.one_time_discount = 0;
                    wizardData.payment_2_discount = 0;
                    wizardData.payment_3_discount = 0;
                    wizardData.payment_4_discount = 0;
                }

                // Gestione validità preventivo
                const validitySelect = document.getElementById('wizardValidityDays');
                if (validitySelect.value === 'custom') {
                    wizardData.custom_validity = document.getElementById('wizardCustomValidity').value;
                } else {
                    wizardData.validity_days = validitySelect.value;
                }
                break;
        }
    }
    
    function updateWizardStep() {
        document.querySelectorAll('.wizard-content').forEach(content => {
            content.style.display = 'none';
        });

        document.getElementById(`step${currentStep}`).style.display = 'block';

        document.querySelectorAll('.wizard-step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < currentStep) {
                step.classList.add('completed');
            } else if (index + 1 === currentStep) {
                step.classList.add('active');
            }
        });

        document.getElementById('btnPrevious').style.display = currentStep > 1 ? 'inline-block' : 'none';
        document.getElementById('btnNext').style.display = currentStep < 3 ? 'inline-block' : 'none';
        document.getElementById('btnSave').style.display = currentStep === 3 ? 'inline-block' : 'none';

        // Mostra pulsante anteprima solo nello step 3 e se è tipo preventivo
        const accessType = document.getElementById('wizardAccessType')?.value || wizardData.access_type;
        document.getElementById('btnPreview').style.display =
            (currentStep === 3 && accessType === 'preventivo') ? 'inline-block' : 'none';

        if (currentStep === 3) {
            generateSummary();
        }
    }
    
    function generateSummary() {
        const container = document.getElementById('wizardSummary');
        
        let html = `
            <div class="client-card">
                <div class="client-card-section">
                    <h3 class="section-title-notion">Informazioni Base</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                        <div>
                            <div style="font-size: 12px; color: #787774; margin-bottom: 4px;">Cliente</div>
                            <div style="font-size: 14px; font-weight: 500;">${wizardData.contact_id || '-'}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #787774; margin-bottom: 4px;">Username</div>
                            <div style="font-size: 14px; font-weight: 500;">${wizardData.username}</div>
                        </div>
                    </div>
                </div>
            `;
            
        if (wizardData.access_type === 'preventivo' && wizardData.title) {
            const subtotal = wizardData.subtotal || 0;
            const discountAmount = subtotal * (wizardData.discount_percentage / 100);
            const afterDiscount = subtotal - discountAmount;
            const taxAmount = afterDiscount * (wizardData.tax_rate / 100);
            const total = afterDiscount + taxAmount;
            
            html += `
                <div class="client-card-section">
                    <h3 class="section-title-notion">Dettagli Preventivo</h3>
                    <div>
                        <strong>Tipo:</strong> ${wizardData.project_type_custom || wizardData.project_type}<br>
                        <strong>Titolo:</strong> ${wizardData.title}<br>
                        ${wizardData.description ? `<strong>Descrizione:</strong> ${wizardData.description}<br>` : ''}
                    </div>
                    
                    ${wizardData.objectives && wizardData.objectives.length > 0 ? `
                        <div style="margin-top: 16px;">
                            <strong>Obiettivi:</strong>
                            <ol style="margin-top: 8px; padding-left: 20px;">
                                ${wizardData.objectives.map(obj => `
                                    <li>
                                        <strong>${obj.title}</strong>
                                        ${obj.description ? `<br><small style="color: #787774;">${obj.description}</small>` : ''}
                                    </li>
                                `).join('')}
                            </ol>
                        </div>
                    ` : ''}
                    
                    ${wizardData.bespoke_options && wizardData.bespoke_options.length > 0 ? `
                        <div style="margin-top: 16px;">
                            <strong>Opzioni Bespoke:</strong>
                            <div style="display: grid; gap: 12px; margin-top: 8px;">
                                ${wizardData.bespoke_options.map(opt => `
                                    <div style="padding: 12px; background: #f7f7f5; border-radius: 4px;">
                                        <strong>${opt.title}</strong> - € ${parseFloat(opt.price).toFixed(2)}
                                        ${opt.features && opt.features.length > 0 ? `
                                            <ul style="margin-top: 4px; padding-left: 20px; font-size: 13px;">
                                                ${opt.features.map(f => `<li>${f}</li>`).join('')}
                                            </ul>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="investment-summary">
                    <h3 class="section-title-notion">Riepilogo Investimento</h3>
                    <div class="summary-row">
                        <span>Subtotale</span>
                        <span>€ ${subtotal.toFixed(2)}</span>
                    </div>
                    ${wizardData.discount_percentage > 0 ? `
                        <div class="summary-row">
                            <span>Sconto ${wizardData.discount_percentage}%</span>
                            <span>- € ${discountAmount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="summary-row">
                        <span>IVA ${wizardData.tax_rate}%</span>
                        <span>€ ${taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="summary-row total">
                        <span>Totale</span>
                        <span>€ ${total.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        container.innerHTML = html;
    }
    
    function addBespokeOption() {
        bespokeCount++;
        const container = document.getElementById('bespokeContainer');

        const optionHtml = `
            <div class="bespoke-option" id="bespoke-${bespokeCount}">
                <button type="button" style="float: right; background: none; border: none; cursor: pointer; font-size: 20px;"
                        onclick="removeBespokeOption(${bespokeCount})">×</button>
                <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Opzione ${bespokeCount}</div>
                <input type="text" class="form-control-notion bespoke-title-input" style="margin-bottom: 8px;"
                       placeholder="Titolo opzione">
                <input type="number" class="form-control-notion bespoke-price-input" style="margin-bottom: 8px;"
                       placeholder="Prezzo €" step="0.01" min="0" onchange="updateSubtotalFromPackages()">
                <div>
                    <label style="font-size: 12px; color: #787774;">Caratteristiche:</label>
                    <div class="bespoke-features-list">
                        <input type="text" class="form-control-notion bespoke-feature-input" style="margin-bottom: 8px;"
                               placeholder="Caratteristica 1">
                        <input type="text" class="form-control-notion bespoke-feature-input" style="margin-bottom: 8px;"
                               placeholder="Caratteristica 2">
                        <input type="text" class="form-control-notion bespoke-feature-input" style="margin-bottom: 8px;"
                               placeholder="Caratteristica 3">
                    </div>
                    <button type="button" class="btn-notion btn-notion-secondary" style="font-size: 12px; padding: 4px 8px;"
                            onclick="addFeatureInput(${bespokeCount})">
                        + Aggiungi caratteristica
                    </button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', optionHtml);
    }

    /**
     * Calcola automaticamente il subtotale dal pacchetto con prezzo più basso
     */
    function updateSubtotalFromPackages() {
        const priceInputs = document.querySelectorAll('.bespoke-price-input');
        const prices = Array.from(priceInputs)
            .map(input => parseFloat(input.value) || 0)
            .filter(price => price > 0);

        if (prices.length > 0) {
            const lowestPrice = Math.min(...prices);
            document.getElementById('wizardSubtotal').value = lowestPrice.toFixed(2);
            calculateTotal();
        }
    }

    /**
     * Toggle della sezione sconti pagamento
     */
    function togglePaymentDiscounts() {
        const checkbox = document.getElementById('wizardEnablePaymentDiscount');
        const section = document.getElementById('paymentDiscountsSection');
        section.style.display = checkbox.checked ? 'block' : 'none';
    }
    
    function addFeatureInput(bespokeId) {
        const container = document.querySelector(`#bespoke-${bespokeId} .bespoke-features-list`);
        const count = container.querySelectorAll('input').length + 1;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control-notion bespoke-feature-input';
        input.style.marginBottom = '8px';
        input.placeholder = `Caratteristica ${count}`;
        container.appendChild(input);
    }
    
    function removeBespokeOption(id) {
        document.getElementById(`bespoke-${id}`).remove();
        // Non decrementiamo bespokeCount per mantenere ID univoci
        // Ricalcola il subtotale dopo la rimozione
        updateSubtotalFromPackages();
    }
    
    function calculateTotal() {
        const subtotal = parseFloat(document.getElementById('wizardSubtotal').value) || 0;
        const taxRate = parseFloat(document.getElementById('wizardTaxRate').value) || 0;
        const discountPercentage = parseFloat(document.getElementById('wizardDiscountPercentage').value) || 0;
        
        const discountAmount = subtotal * (discountPercentage / 100);
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = afterDiscount * (taxRate / 100);
        const total = afterDiscount + taxAmount;
        
        document.getElementById('wizardTotal').value = total.toFixed(2);
    }
    
    async function saveWizard() {
        saveStepData();

        const formData = new FormData();

        // Se esiste un accessId, crea solo il preventivo per l'accesso esistente
        if (window.existingAccessId) {
            formData.append('action', 'create_quote_for_existing_access');
            formData.append('access_id', window.existingAccessId);
            formData.append('quote_data', JSON.stringify(wizardData));
        } else {
            // Altrimenti crea nuovo accesso + preventivo
            formData.append('action', 'create_access_wizard');
            formData.append('contact_id', wizardData.contact_id);
            formData.append('username', wizardData.username);
            formData.append('access_type', wizardData.access_type);

            if (wizardData.access_type === 'preventivo') {
                formData.append('quote_data', JSON.stringify(wizardData));
            }
        }

        try {
            const response = await fetch('', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                if (window.existingAccessId) {
                    alert(`✅ Nuovo preventivo creato!\n\nIl cliente riceverà una notifica email.`);
                } else {
                    alert(`✅ Accesso creato!\n\nUsername: ${data.data.username}\nLink attivazione:\n${data.data.activation_link}`);

                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(data.data.activation_link);
                    }
                }

                // Reset esistingAccessId
                window.existingAccessId = null;

                closeWizardModal();
                location.reload();
            } else {
                alert('❌ Errore: ' + data.message);
            }
        } catch (error) {
            console.error('Errore:', error);
            alert('Errore durante il salvataggio');
        }
    }
    
    async function openClientDetails(accessId) {
        currentAccessId = accessId;
        
        const formData = new FormData();
        formData.append('action', 'get_client_details');
        formData.append('access_id', accessId);
        
        try {
            const response = await fetch('', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                showClientDetails(data.data);
                document.getElementById('detailsModal').classList.add('show');
            }
        } catch (error) {
            console.error('Errore:', error);
        }
    }
    
    function showClientDetails(data) {
        const { access, quote, quotes, logs, stats } = data;
        
        // Salva dati correnti globalmente per uso futuro
        currentAccessData = data;
        
        document.getElementById('detailsTitle').textContent = access.contact_name;
        
        const btnConvert = document.getElementById('btnConvert');
        if (access.access_type === 'preventivo') {
            btnConvert.style.display = 'inline-block';
            btnConvert.innerHTML = '🔄 Converti in Dashboard';
            btnConvert.onclick = showConversionForm;
        } else if (access.access_type === 'cliente') {
            btnConvert.style.display = 'inline-block';
            btnConvert.innerHTML = '✏️ Modifica Dashboard';
            btnConvert.onclick = showEditDashboardForm;
        } else {
            btnConvert.style.display = 'none';
        }
        
        // Aggiungi bottone lucchetto nella sezione azioni
        const lockButton = `
            <button class="btn-notion ${access.is_active == 1 ? 'btn-notion-secondary' : 'btn-notion-primary'}" 
                    onclick="toggleAccessLock(${access.id}, '${access.is_active == 1 ? 'lock' : 'unlock'}')">
                ${access.is_active == 1 ? '🔒 Blocca Accesso' : '🔓 Sblocca Accesso'}
            </button>
        `;
        
        let html = `
            <div class="tabs-container">
                <div class="tabs-list">
                    <div class="tab-item active" onclick="switchTab('general')">Generale</div>
                    ${(quotes && quotes.length > 0) ? '<div class="tab-item" onclick="switchTab(\'quote\')">Preventivi (' + quotes.length + ')</div>' : ''}
                    <div class="tab-item" onclick="switchTab('logs')">Log Accessi</div>
                </div>
            </div>
            
            <div id="tab-general" class="tab-content active">
                <div class="client-card">
                    <div class="client-card-section">
                        <h3 class="section-title-notion">Informazioni Cliente</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                            <div>
                                <div style="font-size: 12px; color: #787774;">Ragione Sociale</div>
                                <div style="font-weight: 500;">${access.contact_name}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #787774;">Email</div>
                                <div style="font-weight: 500;">${access.contact_email}</div>
                            </div>
                        </div>
                    </div>
                    <div class="client-card-section">
                        <h3 class="section-title-notion">Informazioni Accesso</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                            <div>
                                <div style="font-size: 12px; color: #787774;">Username</div>
                                <div style="font-weight: 500;">${access.username}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #787774;">Stato</div>
                                <div style="font-weight: 500;">
                                    ${access.is_active && access.password_hash 
                                        ? '<span style="color: var(--tm-completed);">✅ Attivo</span>'
                                        : '<span style="color: var(--tm-pending);">⏳ Non attivo</span>'}
                                </div>
                            </div>
                            <div class="client-card-section" style="
                                    padding: 0;
                                ">
                        <h3 class="section-title-notion">Gestione Accesso</h3>
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <button class="btn-notion ${access.is_active == 1 ? 'btn-notion-secondary' : 'btn-notion-primary'}" 
                                    onclick="toggleAccessLock(${access.id}, '${access.is_active == 1 ? 'lock' : 'unlock'}')">
                                ${access.is_active == 1 ? '🔒 Blocca Accesso' : '🔓 Sblocca Accesso'}
                            </button>
                            <span style="font-size: 12px; color: #787774;">
                                Stato attuale: ${access.is_active == 1 ? '✅ Attivo' : '🔒 Bloccato'}
                            </span>
                        </div>
                    </div>
                        </div>
                        
                        ${access.activation_token && !access.password_hash ? `
                            <div style="margin-top: 16px; padding: 12px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 4px;">
                                <strong>Link di attivazione:</strong><br>
                                <code style="font-size: 12px;">https://portale.studiomismo.it/client-activation.php?token=${access.activation_token}</code>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Tab Preventivi (TUTTI i preventivi, non solo l'ultimo)
        if (quotes && quotes.length > 0) {
            html += `
                <div id="tab-quote" class="tab-content">
                    ${quotes.length > 1 ? `
                        <div class="client-card" style="margin-bottom: 20px;">
                            <div class="client-card-section">
                                <h3 class="section-title-notion">📋 Tutti i Preventivi (${quotes.length})</h3>
                                <div style="display: grid; gap: 12px;">
                                    ${quotes.map((q, index) => `
                                        <div style="padding: 16px; background: ${index === 0 ? '#f0f9ff' : '#f7f7f5'}; border: 1px solid ${index === 0 ? '#0ea5e9' : '#e9e9e7'}; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                                            <div>
                                                <strong style="font-size: 16px;">${q.quote_number}</strong> - ${q.title}
                                                <div style="font-size: 13px; color: #787774; margin-top: 4px;">
                                                    <span class="status-badge-notion status-${q.status}">
                                                        ${q.status === 'viewed' ? '👁️ Visualizzato' :
                                                          q.status === 'accepted' ? '✅ Accettato' :
                                                          q.status === 'rejected' ? '❌ Rifiutato' :
                                                          q.status === 'sent' ? '📧 Inviato' :
                                                          q.status === 'expired' ? '⏰ Scaduto' : q.status}
                                                    </span>
                                                    • Creato: ${new Date(q.created_at).toLocaleDateString('it-IT')}
                                                    • Scadenza: ${new Date(q.valid_until).toLocaleDateString('it-IT')}
                                                </div>
                                            </div>
                                            <button class="btn-notion btn-notion-${index === 0 ? 'primary' : 'secondary'}" onclick="openSavedQuotePreview(${q.id})" style="display: flex; align-items: center; gap: 6px;">
                                                👁️ Visualizza
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    ` : ''}`;

            // Mostra i dettagli dell'ultimo preventivo (quello più recente)
            const quote = quotes[0];
            const objectives = quote.objectives ? JSON.parse(quote.objectives) : [];
            const bespokeOptions = quote.bespoke_options ? JSON.parse(quote.bespoke_options) : [];

            html += `
                    <div class="client-card">
                        <div class="client-card-section">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                                <h3 class="section-title-notion" style="margin: 0;">Dettagli Ultimo Preventivo</h3>
                                <button class="btn-notion btn-notion-primary" onclick="openSavedQuotePreview(${quote.id})" style="display: flex; align-items: center; gap: 6px;">
                                    👁️ Anteprima Preventivo
                                </button>
                            </div>
                            <p><strong>Numero:</strong> ${quote.quote_number}</p>
                            <p><strong>Tipo:</strong> ${quote.project_type_custom || quote.project_type}</p>
                            <p><strong>Titolo:</strong> ${quote.title}</p>
                            ${quote.description ? `<p><strong>Descrizione:</strong> ${quote.description}</p>` : ''}
                        </div>
                        
                        ${objectives.length > 0 ? `
                        <div class="client-card-section">
                            <h3 class="section-title-notion">Obiettivi</h3>
                            ${objectives.map(obj => `
                                <div style="margin-bottom: 12px; padding: 12px; background: #f7f7f5; border-radius: 4px;">
                                    <div style="font-size: 18px; font-weight: 600; color: #37352f; margin-bottom: 4px;">
                                        ${obj.number}. ${obj.title}
                                    </div>
                                    ${obj.description ? `<div style="font-size: 14px; color: #787774;">${obj.description}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                        
                        ${bespokeOptions.length > 0 ? `
                        <div class="client-card-section">
                            <h3 class="section-title-notion">Opzioni Bespoke</h3>
                            <div style="display: grid; gap: 12px;">
                                ${bespokeOptions.map(opt => `
                                    <div style="padding: 16px; background: #f7f7f5; border: 1px solid #e9e9e7; border-radius: 4px;">
                                        <div style="display: flex; justify-content: space-between; align-items: start;">
                                            <strong style="font-size: 16px;">${opt.title}</strong>
                                            <span style="font-size: 20px; font-weight: 700; color: #37352f;">€ ${parseFloat(opt.price).toFixed(2)}</span>
                                        </div>
                                        ${opt.features && opt.features.length > 0 ? `
                                            <ul style="margin-top: 8px; padding-left: 20px; color: #787774;">
                                                ${opt.features.map(f => `<li>${f}</li>`).join('')}
                                            </ul>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="investment-summary">
                            <h3 class="section-title-notion">Dettagli Investimento</h3>
                            <div class="summary-row">
                                <span>Subtotale</span>
                                <span>€ ${parseFloat(quote.subtotal).toFixed(2)}</span>
                            </div>
                            ${quote.discount_percentage > 0 ? `
                                <div class="summary-row">
                                    <span>Sconto ${quote.discount_percentage}%</span>
                                    <span>- € ${parseFloat(quote.discount_amount).toFixed(2)}</span>
                                </div>
                            ` : ''}
                            <div class="summary-row">
                                <span>IVA ${quote.tax_rate}%</span>
                                <span>€ ${parseFloat(quote.tax_amount).toFixed(2)}</span>
                            </div>
                            <div class="summary-row total">
                                <span>Totale</span>
                                <span>€ ${parseFloat(quote.total).toFixed(2)}</span>
                            </div>
                        </div>

                        <!-- Stato Preventivo e Azioni -->
                        <div class="client-card-section" style="border-top: 1px solid #e9e9e7; margin-top: 20px; padding-top: 20px;">
                            <h3 class="section-title-notion">Stato Preventivo</h3>
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                                <div>
                                    <div style="font-size: 14px; color: #787774; margin-bottom: 4px;">Stato attuale</div>
                                    <span class="status-badge-notion status-${quote.status}" style="text-transform: uppercase;">
                                        ${quote.status === 'viewed' ? '👁️ Visualizzato' :
                                          quote.status === 'accepted' ? '✅ Accettato' :
                                          quote.status === 'rejected' ? '❌ Rifiutato' :
                                          quote.status === 'sent' ? '📧 Inviato' :
                                          quote.status === 'expired' ? '⏰ Scaduto' : quote.status}
                                    </span>
                                </div>
                                <div>
                                    <div style="font-size: 14px; color: #787774; margin-bottom: 4px;">Valido fino al</div>
                                    <strong>${new Date(quote.valid_until).toLocaleDateString('it-IT')}</strong>
                                </div>
                            </div>

                            ${(quote.status === 'rejected' || quote.status === 'expired' || new Date(quote.valid_until) < new Date()) ? `
                                <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 4px; padding: 12px; margin-bottom: 12px;">
                                    <strong style="color: #92400e;">⚠️ Preventivo non più valido</strong>
                                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350f;">
                                        Questo preventivo è ${quote.status === 'rejected' ? 'stato rifiutato' : 'scaduto'}.
                                        Puoi riattivarlo o crearne uno nuovo.
                                    </p>
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn-notion btn-notion-secondary"
                                            onclick="reactivateQuote(${quote.id})"
                                            style="flex: 1;">
                                        🔄 Riattiva Preventivo
                                    </button>
                                    <button class="btn-notion btn-notion-primary"
                                            onclick="createNewQuote(${access.contact_id}, ${access.id})"
                                            style="flex: 1;">
                                        ➕ Nuovo Preventivo
                                    </button>
                                </div>
                            ` : ''}

                            ${quote.status === 'accepted' ? `
                                <div style="background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 12px; margin-bottom: 12px;">
                                    <strong style="color: #065f46;">✅ Preventivo Accettato</strong>
                                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #065f46;">
                                        Il cliente ha accettato il preventivo il ${new Date(quote.accepted_date).toLocaleDateString('it-IT')}.
                                    </p>
                                    ${quote.selected_package_id ? `
                                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #a7f3d0;">
                                            <strong style="color: #047857;">📦 Pacchetto selezionato:</strong>
                                            <span style="color: #065f46;">ID #${quote.selected_package_id}</span>
                                        </div>
                                    ` : ''}
                                    ${quote.selected_payment_option ? `
                                        <div style="margin-top: 4px;">
                                            <strong style="color: #047857;">💳 Metodo pagamento:</strong>
                                            <span style="color: #065f46;">
                                                ${quote.selected_payment_option === 'one_time' ? '💵 Pagamento Unico' :
                                                  quote.selected_payment_option === 'payment_2' ? '📅 2 Rate' :
                                                  quote.selected_payment_option === 'payment_3' ? '📅 3 Rate' :
                                                  quote.selected_payment_option === 'payment_4' ? '📅 4 Rate' : quote.selected_payment_option}
                                            </span>
                                        </div>
                                        <div style="margin-top: 8px; padding: 12px; background: #ecfdf5; border-radius: 4px;">
                                            <strong style="color: #047857;">💰 Totale da versare:</strong>
                                            <span style="color: #065f46; font-size: 18px; font-weight: 700;">
                                                € ${(() => {
                                                    const baseTotal = parseFloat(quote.total);
                                                    let discount = 0;
                                                    if (quote.selected_payment_option === 'one_time' && quote.one_time_discount) {
                                                        discount = parseFloat(quote.one_time_discount);
                                                    } else if (quote.selected_payment_option === 'payment_2' && quote.payment_2_discount) {
                                                        discount = parseFloat(quote.payment_2_discount);
                                                    } else if (quote.selected_payment_option === 'payment_3' && quote.payment_3_discount) {
                                                        discount = parseFloat(quote.payment_3_discount);
                                                    } else if (quote.selected_payment_option === 'payment_4' && quote.payment_4_discount) {
                                                        discount = parseFloat(quote.payment_4_discount);
                                                    }
                                                    const finalTotal = baseTotal * (1 - discount / 100);
                                                    return finalTotal.toFixed(2);
                                                })()}
                                            </span>
                                            ${(() => {
                                                let discount = 0;
                                                if (quote.selected_payment_option === 'one_time' && quote.one_time_discount) {
                                                    discount = parseFloat(quote.one_time_discount);
                                                } else if (quote.selected_payment_option === 'payment_2' && quote.payment_2_discount) {
                                                    discount = parseFloat(quote.payment_2_discount);
                                                } else if (quote.selected_payment_option === 'payment_3' && quote.payment_3_discount) {
                                                    discount = parseFloat(quote.payment_3_discount);
                                                } else if (quote.selected_payment_option === 'payment_4' && quote.payment_4_discount) {
                                                    discount = parseFloat(quote.payment_4_discount);
                                                }
                                                return discount > 0 ? `<span style="font-size: 12px; color: #059669;"> (sconto ${discount}% applicato)</span>` : '';
                                            })()}
                                        </div>
                                    ` : ''}
                                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #059669;">
                                        Puoi comunque creare un nuovo preventivo se necessario.
                                    </p>
                                </div>
                                <button class="btn-notion btn-notion-secondary"
                                        onclick="createNewQuote(${access.contact_id}, ${access.id})"
                                        style="width: 100%;">
                                    ➕ Crea Nuovo Preventivo
                                </button>
                            ` : ''}

                            ${quote.status === 'viewed' || quote.status === 'sent' ? `
                                <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 4px; padding: 12px; margin-bottom: 12px;">
                                    <strong style="color: #0c4a6e;">📋 Preventivo Attivo</strong>
                                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #0c4a6e;">
                                        Il preventivo è attualmente attivo${quote.status === 'viewed' ? ' ed è stato visualizzato dal cliente' : ''}.
                                        Scade il ${new Date(quote.valid_until).toLocaleDateString('it-IT')}.
                                    </p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Tab Logs
        html += `
            <div id="tab-logs" class="tab-content">
                <div class="client-card">
                    <div class="client-card-section">
                        <h3 class="section-title-notion">Statistiche Accesso</h3>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px;">
                            <div style="text-align: center; padding: 16px; background: #f7f7f5; border-radius: 4px;">
                                <div style="font-size: 24px; font-weight: 700; color: #37352f;">${stats.total_logins || 0}</div>
                                <div style="font-size: 12px; color: #787774;">Login totali</div>
                            </div>
                            <div style="text-align: center; padding: 16px; background: #f7f7f5; border-radius: 4px;">
                                <div style="font-size: 24px; font-weight: 700; color: #37352f;">${stats.unique_ips || 0}</div>
                                <div style="font-size: 12px; color: #787774;">IP unici</div>
                            </div>
                            <div style="text-align: center; padding: 16px; background: #f7f7f5; border-radius: 4px;">
                                <div style="font-size: 24px; font-weight: 700; color: #37352f;">${stats.active_days || 0}</div>
                                <div style="font-size: 12px; color: #787774;">Giorni attivi</div>
                            </div>
                            <div style="text-align: center; padding: 16px; background: #f7f7f5; border-radius: 4px;">
                                <div style="font-size: 14px; font-weight: 500; color: #37352f;">
                                    ${stats.last_login ? new Date(stats.last_login).toLocaleDateString('it-IT') : 'Mai'}
                                </div>
                                <div style="font-size: 12px; color: #787774;">Ultimo accesso</div>
                            </div>
                        </div>
                    </div>
                    <div class="client-card-section">
                        <h3 class="section-title-notion">Log Accessi e Attività</h3>
                        <table style="width: 100%; font-size: 13px;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e9e9e7;">Data/Ora</th>
                                    <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e9e9e7;">Azione</th>
                                    <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e9e9e7;">Dettagli</th>
                                    <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e9e9e7;">IP</th>
                                    <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e9e9e7;">User Agent</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        if (logs && logs.length > 0) {
            logs.forEach(log => {
                const date = new Date(log.created_at);
                const actionLabels = {
                    'login': '🔐 Login',
                    'logout': '🚪 Logout',
                    'account_activated': '✅ Account Attivato',
                    'password_reset': '🔄 Reset Password',
                    'view_quote': '📄 Vista Preventivo',
                    'accept_quote': '✅ Preventivo Accettato',
                    'reject_quote': '❌ Preventivo Rifiutato',
                    'access_created': '🆕 Accesso Creato',
                    'converted_to_dashboard': '🔄 Convertito in Dashboard'
                };
                
                const actionLabel = actionLabels[log.action] || log.action;
                const deviceInfo = log.device_info ? `(${log.device_info})` : '';
                const userAgent = log.user_agent ? log.user_agent.substring(0, 50) + '...' : '-';
                
                html += `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #f7f7f5;">
                            ${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}
                        </td>
                        <td style="padding: 8px; border-bottom: 1px solid #f7f7f5;">${actionLabel}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #f7f7f5; font-size: 12px; color: #787774;">
                            ${log.details || '-'} ${deviceInfo}
                        </td>
                        <td style="padding: 8px; border-bottom: 1px solid #f7f7f5; font-size: 12px;">${log.ip_address || '-'}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #f7f7f5; font-size: 11px; color: #787774;" title="${log.user_agent}">
                            ${userAgent}
                        </td>
                    </tr>
                `;
            });
        } else {
            html += '<tr><td colspan="5" style="text-align: center; padding: 16px; color: #787774;">Nessuna attività registrata</td></tr>';
        }
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // Form conversione se è preventivo
        if (access.access_type === 'preventivo') {
            html += `
                <div id="conversionForm" style="display: none;">
                    <div class="conversion-form">
                        <h3 class="section-title-notion">Converti in Dashboard Cliente</h3>
                        <div class="form-grid">
                            <div class="form-group-notion">
                                <label class="form-label-notion">Nome Progetto</label>
                                <input type="text" id="conv_project_name" class="form-control-notion" 
                                       value="${quote ? quote.title : ''}">
                            </div>
                            <div class="form-group-notion">
                                <label class="form-label-notion">Budget Totale €</label>
                                <input type="number" id="conv_project_budget" class="form-control-notion" 
                                       step="0.01" value="${quote ? quote.total : 0}">
                            </div>
                            <div class="form-group-notion">
                                <label class="form-label-notion">Canone Mensile €</label>
                                <input type="number" id="conv_monthly_fee" class="form-control-notion" 
                                       step="0.01" value="0">
                            </div>
                            <div class="form-group-notion">
                                <label class="form-label-notion">Ore Supporto Incluse</label>
                                <input type="number" id="conv_support_hours" class="form-control-notion" 
                                       step="1" min="0" value="0" placeholder="0">
                                <div style="font-size: 12px; color: #787774; margin-top: 4px;">
                                    Ore di assistenza ticket incluse nel contratto (0 = illimitate)
                                </div>
                            </div>
                            <div class="form-group-notion">
                                <label class="form-label-notion">Data Inizio</label>
                                <input type="date" id="conv_start_date" class="form-control-notion" 
                                       value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group-notion">
                                <label class="form-label-notion">Data Fine</label>
                                <input type="date" id="conv_end_date" class="form-control-notion">
                            </div>
                            <div class="form-group-notion">
                                <label class="form-label-notion">Link Notion</label>
                                <input type="text" id="conv_drive_folder" class="form-control-notion" 
                                       placeholder="https://notion.so/...">
                            </div>
                            <div class="form-group-notion">
                                <label class="form-label-notion">Cartella Documenti</label>
                                <input type="text" id="conv_documents_folder" class="form-control-notion"
                                       placeholder="https://drive.google.com/...">
                            </div>
                            <div class="form-group-notion">
                                <label class="form-label-notion">Cartella Assets</label>
                                <input type="text" id="conv_assets_folder" class="form-control-notion"
                                       placeholder="https://drive.google.com/...">
                            </div>
                        </div>
                        <div class="form-group-notion">
                            <label class="form-label-notion">Descrizione Progetto</label>
                            <textarea id="conv_project_description" class="form-control-notion" rows="4">${quote ? quote.description : ''}</textarea>
                        </div>
                        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                            <button class="btn-notion btn-notion-secondary" onclick="hideConversionForm()">
                                Annulla
                            </button>
                            <button class="btn-notion btn-notion-primary" onclick="convertToDashboard()">
                                🔄 Converti
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('detailsContent').innerHTML = html;
    }
    
    function closeDetailsModal() {
        document.getElementById('detailsModal').classList.remove('show');
    }
    
    function switchTab(tabName) {
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        event.target.classList.add('active');
        const tabContent = document.getElementById(`tab-${tabName}`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
    }
    
    function showConversionForm() {
        const form = document.getElementById('conversionForm');
        if (form) {
            // Nascondi altri contenuti
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
            });
            document.querySelector('.tabs-container').style.display = 'none';
            
            // Mostra form
            form.style.display = 'block';
        }
    }
    
    function hideConversionForm() {
        const form = document.getElementById('conversionForm');
        if (form) {
            form.style.display = 'none';
            
            // Ripristina visualizzazione tabs
            document.querySelector('.tabs-container').style.display = 'block';
            document.querySelector('.tab-content.active').style.display = 'block';
        }
    }
    
    async function convertToDashboard() {
        if (!confirm('Vuoi convertire questo preventivo in Dashboard Cliente?\n\nQuesto permetterà al cliente di accedere alla dashboard completa.')) {
            return;
        }
        
        const formData = new FormData();
        formData.append('action', 'convert_to_dashboard');
        formData.append('access_id', currentAccessId);
        formData.append('project_name', document.getElementById('conv_project_name').value);
        formData.append('project_description', document.getElementById('conv_project_description').value);
        formData.append('project_budget', document.getElementById('conv_project_budget').value);
        formData.append('monthly_fee', document.getElementById('conv_monthly_fee').value);
        formData.append('project_start_date', document.getElementById('conv_start_date').value);
        formData.append('project_end_date', document.getElementById('conv_end_date').value);
        formData.append('drive_folder_link', document.getElementById('conv_drive_folder').value);
        formData.append('documents_folder', document.getElementById('conv_documents_folder').value);
        formData.append('assets_folder', document.getElementById('conv_assets_folder').value);
        formData.append('support_hours_included', document.getElementById('conv_support_hours').value);
        
        try {
            const response = await fetch('', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('✅ ' + data.message);
                closeDetailsModal();
                location.reload();
            } else {
                alert('❌ Errore: ' + data.message);
            }
        } catch (error) {
            console.error('Errore:', error);
            alert('Errore durante la conversione');
        }
    }
    
    
    
    function showEditDashboardForm() {
        // Nascondi tab e mostra form modifica per dashboard esistente
        const access = currentAccessData.access; // Salviamo i dati quando apriamo i dettagli
        
        const formHtml = `
            <div class="conversion-form">
                <h3 class="section-title-notion">Modifica Dashboard Cliente</h3>
                <div class="form-grid">
                    <div class="form-group-notion">
                        <label class="form-label-notion">Nome Progetto</label>
                        <input type="text" id="edit_project_name" class="form-control-notion" 
                               value="${access.project_name || ''}">
                    </div>
                    <div class="form-group-notion">
                        <label class="form-label-notion">Budget Totale €</label>
                        <input type="number" id="edit_project_budget" class="form-control-notion" 
                               step="0.01" value="${access.project_budget || 0}">
                    </div>
                    <div class="form-group-notion">
                        <label class="form-label-notion">Canone Mensile €</label>
                        <input type="number" id="edit_monthly_fee" class="form-control-notion" 
                               step="0.01" value="${access.monthly_fee || 0}">
                    </div>
                    <div class="form-group-notion">
                        <label class="form-label-notion">Ore Supporto Incluse</label>
                        <input type="number" id="edit_support_hours" class="form-control-notion" 
                               step="1" min="0" value="${access.support_hours_included || 0}">
                        <div style="font-size: 12px; color: #787774; margin-top: 4px;">
                            Ore utilizzate: ${access.support_hours_used || 0}h
                        </div>
                    </div>
                    <div class="form-group-notion">
                        <label class="form-label-notion">Data Inizio</label>
                        <input type="date" id="edit_start_date" class="form-control-notion" 
                               value="${access.project_start_date || ''}">
                    </div>
                    <div class="form-group-notion">
                        <label class="form-label-notion">Data Fine</label>
                        <input type="date" id="edit_end_date" class="form-control-notion"
                               value="${access.project_end_date || ''}">
                    </div>
                    <div class="form-group-notion">
                        <label class="form-label-notion">Link Notion</label>
                        <input type="text" id="edit_drive_folder" class="form-control-notion" 
                               value="${access.drive_folder_link || ''}">
                    </div>
                    <div class="form-group-notion">
                        <label class="form-label-notion">Cartella Documenti</label>
                        <input type="text" id="edit_documents_folder" class="form-control-notion"
                               value="${access.documents_folder || ''}">
                    </div>
                    <div class="form-group-notion">
                        <label class="form-label-notion">Cartella Assets</label>
                        <input type="text" id="edit_assets_folder" class="form-control-notion"
                               value="${access.assets_folder || ''}">
                    </div>
                    <div class="form-group-notion">
                        <label class="form-label-notion">Cartella Fatture</label>
                        <input type="text" id="edit_invoice_folder" class="form-control-notion"
                               value="${access.invoice_folder || ''}">
                    </div>
                </div>
                <div class="form-group-notion">
                    <label class="form-label-notion">Descrizione Progetto</label>
                    <textarea id="edit_project_description" class="form-control-notion" rows="4">${access.project_description || ''}</textarea>
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                    <button class="btn-notion btn-notion-secondary" onclick="closeEditForm()">
                        Annulla
                    </button>
                    <button class="btn-notion btn-notion-primary" onclick="updateDashboard()">
                        💾 Salva Modifiche
                    </button>
                </div>
            </div>
        `;
        
        // Nascondi contenuto normale e mostra form
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        document.querySelector('.tabs-container').style.display = 'none';
        
        // Inserisci form
        const contentDiv = document.getElementById('detailsContent');
        const editDiv = document.createElement('div');
        editDiv.id = 'editDashboardForm';
        editDiv.innerHTML = formHtml;
        contentDiv.appendChild(editDiv);
    }
    
    function closeEditForm() {
        const editForm = document.getElementById('editDashboardForm');
        if (editForm) {
            editForm.remove();
        }
        // Ripristina visualizzazione tabs
        document.querySelector('.tabs-container').style.display = 'block';
        document.querySelector('.tab-content.active').style.display = 'block';
    }
    
    async function updateDashboard() {
        const formData = new FormData();
        formData.append('action', 'update_dashboard');
        formData.append('access_id', currentAccessId);
        formData.append('project_name', document.getElementById('edit_project_name').value);
        formData.append('project_description', document.getElementById('edit_project_description').value);
        formData.append('project_budget', document.getElementById('edit_project_budget').value);
        formData.append('monthly_fee', document.getElementById('edit_monthly_fee').value);
        formData.append('project_start_date', document.getElementById('edit_start_date').value);
        formData.append('project_end_date', document.getElementById('edit_end_date').value);
        formData.append('drive_folder_link', document.getElementById('edit_drive_folder').value);
        formData.append('documents_folder', document.getElementById('edit_documents_folder').value);
        formData.append('assets_folder', document.getElementById('edit_assets_folder').value);
        formData.append('invoice_folder', document.getElementById('edit_invoice_folder').value);
        formData.append('support_hours_included', document.getElementById('edit_support_hours').value);
        
        try {
            const response = await fetch('', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('✅ ' + data.message);
                closeDetailsModal();
                location.reload();
            } else {
                alert('❌ Errore: ' + data.message);
            }
        } catch (error) {
            console.error('Errore:', error);
            alert('Errore durante l\'aggiornamento');
        }
    }
    
    async function toggleAccessLock(accessId, action) {
        const confirmMsg = action === 'lock' 
            ? 'Vuoi bloccare questo accesso?\n\nIl cliente non potrà più accedere al portale.'
            : 'Vuoi sbloccare questo accesso?\n\nIl cliente potrà nuovamente accedere al portale.';
            
        if (!confirm(confirmMsg)) return;
        
        const formData = new FormData();
        formData.append('action', 'toggle_access');
        formData.append('access_id', accessId);
        formData.append('toggle_action', action);
        
        try {
            const response = await fetch('', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('✅ ' + data.message);
                location.reload();
            } else {
                alert('❌ Errore: ' + data.message);
            }
        } catch (error) {
            console.error('Errore:', error);
            alert('Errore durante l\'operazione');
        }
    }
    
    // Aggiungi gestione validità preventivo personalizzata
    document.getElementById('wizardValidityDays')?.addEventListener('change', function() {
        const customDiv = document.getElementById('customValidityDiv');
        if (this.value === 'custom') {
            customDiv.style.display = 'block';
        } else {
            customDiv.style.display = 'none';
        }
    });
    
    // Variabile globale per salvare i dati correnti
    let currentAccessData = null;
    let savedQuoteId = null; // ID preventivo dopo il salvataggio

    /**
     * Apre l'anteprima del preventivo
     * Può essere chiamata in due modi:
     * 1. Prima del salvataggio (step 3) - crea un preventivo temporaneo
     * 2. Dopo il salvataggio - usa il preventivo salvato
     */
    async function openPreventivoPrev() {
        // Se abbiamo già salvato il preventivo, usa quell'ID
        if (savedQuoteId) {
            const previewUrl = `/preventivo.php?preview=1&quote_id=${savedQuoteId}`;
            window.open(previewUrl, 'PreventivoPreview', 'width=1200,height=900,scrollbars=yes');
            return;
        }

        // Altrimenti dobbiamo creare un preventivo temporaneo
        // Verifica che siamo nello step 3 e abbiamo tutti i dati
        if (currentStep !== 3) {
            alert('⚠️ Completa tutti i passaggi prima di vedere l\'anteprima');
            return;
        }

        saveStepData();

        if (!wizardData.contact_id || !wizardData.title) {
            alert('⚠️ Dati preventivo incompleti. Torna indietro e completa tutti i campi.');
            return;
        }

        // Crea preventivo temporaneo
        const formData = new FormData();
        formData.append('action', 'create_temp_preview');
        formData.append('quote_data', JSON.stringify(wizardData));

        try {
            const response = await fetch('', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success && data.data.quote_id) {
                // Apri anteprima in nuova finestra con parametro preview=1
                const previewUrl = `/preventivo.php?preview=1&quote_id=${data.data.quote_id}`;
                window.open(previewUrl, 'PreventivoPreview', 'width=1200,height=900,scrollbars=yes');
            } else {
                alert('❌ Errore nella creazione dell\'anteprima: ' + (data.message || 'Errore sconosciuto'));
            }
        } catch (error) {
            console.error('Errore:', error);
            alert('❌ Errore durante la creazione dell\'anteprima');
        }
    }

    /**
     * Apre anteprima di un preventivo già salvato
     */
    function openSavedQuotePreview(quoteId) {
        if (!quoteId) {
            alert('❌ ID preventivo non valido');
            return;
        }

        // Usa preventivo.php con parametro preview=1 per modalità admin
        const previewUrl = `/preventivo.php?preview=1&quote_id=${quoteId}`;
        window.open(previewUrl, 'PreventivoPreview', 'width=1200,height=900,scrollbars=yes');
    }

    /**
     * Riattiva un preventivo scaduto/rifiutato
     */
    function reactivateQuote(quoteId) {
        if (!confirm('Vuoi riattivare questo preventivo? La data di scadenza verrà estesa di 30 giorni.')) {
            return;
        }

        fetch('', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `action=reactivate_quote&quote_id=${quoteId}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('✅ Preventivo riattivato con successo!');
                location.reload();
            } else {
                alert('❌ Errore: ' + (data.error || 'Impossibile riattivare il preventivo'));
            }
        })
        .catch(error => {
            console.error('Errore:', error);
            alert('❌ Errore di comunicazione con il server');
        });
    }

    /**
     * Crea un nuovo preventivo per il cliente
     */
    function createNewQuote(contactId, accessId) {
        if (!confirm('Vuoi creare un nuovo preventivo per questo cliente? Il cliente riceverà una notifica email.')) {
            return;
        }

        // Chiudi il modal dettagli se esiste
        const clientDetailsModal = document.getElementById('clientDetailsModal');
        if (clientDetailsModal) {
            clientDetailsModal.classList.remove('show');
        }

        // Apri il wizard di creazione preventivo
        setTimeout(() => {
            const wizardModal = document.getElementById('wizardModal');
            if (!wizardModal) {
                alert('Errore: modal wizard non trovato');
                return;
            }

            // Reset del wizard prima di aprire
            resetWizard();

            wizardModal.classList.add('show');

            // Se c'è già un access_id, salta direttamente allo Step 2 (preventivo)
            if (accessId) {
                currentStep = 2;

                // Precompila wizardData con le informazioni esistenti
                wizardData.contact_id = contactId;
                wizardData.access_type = 'preventivo';

                // Memorizza l'accessId esistente per il salvataggio
                window.existingAccessId = accessId;
                currentAccessId = accessId;

                // Cambia il titolo del modal per indicare che è un nuovo preventivo
                const modalTitle = document.querySelector('#wizardModal .modal-title-notion');
                if (modalTitle) {
                    modalTitle.textContent = 'Nuovo Preventivo';
                }

                // Nascondi Step 1 e mostra Step 2
                updateWizardStep();

            } else {
                // Nuovo cliente: inizia dallo Step 1
                currentStep = 1;
                wizardData.access_type = 'preventivo';

                // Ripristina il titolo originale
                const modalTitle = document.querySelector('#wizardModal .modal-title-notion');
                if (modalTitle) {
                    modalTitle.textContent = 'Nuovo Accesso Cliente';
                }

                updateWizardStep();

                // Pre-compila il campo contact con il cliente corrente
                setTimeout(() => {
                    const contactField = document.querySelector('input[name="wizard_contact_id"]');
                    if (contactField) {
                        contactField.value = contactId;
                    }

                    // Imposta tipo accesso su preventivo
                    const typeField = document.getElementById('wizardAccessType');
                    if (typeField) {
                        typeField.value = 'preventivo';
                    }
                }, 100);
            }
        }, 300);
    }
</script>

<?php
$pageContent = ob_get_clean();

// Pulizia automatica preventivi di anteprima vecchi (oltre 24 ore)
try {
    $stmt = $pdo->prepare("
        DELETE FROM quotes
        WHERE status = 'preview'
        AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ");
    $stmt->execute();

    // Log per debug (facoltativo)
    $deletedCount = $stmt->rowCount();
    if ($deletedCount > 0) {
        error_log("Puliti $deletedCount preventivi di anteprima vecchi");
    }
} catch (Exception $e) {
    error_log("Errore pulizia preventivi preview: " . $e->getMessage());
}

// CSS aggiuntivi
$additionalCSS = [
    '/assets/css/task_manager.css?v=' . time(),
    '/assets/css/contact-selector.css?v=' . time()
];

// JS aggiuntivi
$additionalJS = [
    '/assets/js/contact-selector.js?v=' . time(),
    '/assets/js/notifications.js',
    '/assets/js/toast.js'
];

// Rendering con il layout base del CRM
if (function_exists('renderPage')) {
    renderPage('Gestione Accessi Clienti', $pageContent, $additionalCSS, $additionalJS);
} else {
    // Fallback se renderPage non esiste
    require_once __DIR__ . '/../../core/includes/layout_base.php';
    renderPage('Gestione Accessi Clienti', $pageContent, $additionalCSS, $additionalJS);
}
?>
<?php
// File: /preventivo.php
// Pagina visualizzazione preventivo per clienti - CRM Studio Mismo

session_start();

// MODALITÀ ANTEPRIMA ADMIN
// Se c'è il parametro preview=1 e l'utente è admin, mostra in modalità anteprima
$isAdminPreview = false;
$adminUser = null;

if (isset($_GET['preview']) && $_GET['preview'] == '1') {
    // Verifica se è un admin loggato
    require_once __DIR__ . '/core/includes/auth_helper.php';

    try {
        $adminUser = getCurrentUser();
        if ($adminUser && in_array($adminUser['role'], ['admin', 'super_admin'])) {
            $isAdminPreview = true;
        }
    } catch (Exception $e) {
        // Non è admin, continua con controllo normale
    }
}

// Se non è admin preview, verifica autenticazione cliente normale
if (!$isAdminPreview) {
    if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'] ||
        !isset($_SESSION['user_type']) || $_SESSION['user_type'] !== 'client') {
        header('Location: /');
        exit;
    }

    // Verifica che sia un accesso tipo preventivo o cliente
    $accessType = $_SESSION['client_access_type'] ?? '';
    if (!in_array($accessType, ['preventivo', 'cliente'])) {
        header('Location: /');
        exit;
    }
}

// Connessione database diretta
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die('Errore connessione database: ' . $e->getMessage());
}

// ===== GESTIONE AJAX PER SALVATAGGIO SELEZIONI =====
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action'])) {
    header('Content-Type: application/json');

    $input = json_decode(file_get_contents('php://input'), true);

    // Salva selezione pacchetto
    if ($_GET['action'] === 'save_package_selection') {
        try {
            $quoteId = (int)($input['quote_id'] ?? 0);
            $packageId = (int)($input['package_id'] ?? 0);

            if ($quoteId <= 0 || $packageId <= 0) {
                echo json_encode(['success' => false, 'error' => 'Parametri non validi']);
                exit;
            }

            // Aggiorna il preventivo con il pacchetto selezionato
            $stmt = $pdo->prepare("UPDATE quotes SET selected_package_id = ? WHERE id = ?");
            $stmt->execute([$packageId, $quoteId]);

            echo json_encode(['success' => true]);
            exit;

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }

    // Salva selezione metodo pagamento
    if ($_GET['action'] === 'save_payment_selection') {
        try {
            $quoteId = (int)($input['quote_id'] ?? 0);
            $paymentOption = $input['payment_option'] ?? '';

            if ($quoteId <= 0 || !in_array($paymentOption, ['one_time', 'payment_2', 'payment_3', 'payment_4'])) {
                echo json_encode(['success' => false, 'error' => 'Parametri non validi']);
                exit;
            }

            // Aggiorna il preventivo con il metodo di pagamento selezionato
            $stmt = $pdo->prepare("UPDATE quotes SET selected_payment_option = ? WHERE id = ?");
            $stmt->execute([$paymentOption, $quoteId]);

            echo json_encode(['success' => true]);
            exit;

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }

    echo json_encode(['success' => false, 'error' => 'Azione non riconosciuta']);
    exit;
}

// CARICAMENTO DATI IN BASE ALLA MODALITÀ
if ($isAdminPreview) {
    // MODALITÀ ADMIN PREVIEW - Carica preventivo da quote_id o access_id
    $quote = null;

    if (isset($_GET['quote_id'])) {
        $quoteId = (int)$_GET['quote_id'];

        $stmt = $pdo->prepare("
            SELECT q.*,
                   u.first_name as created_by_name,
                   u.last_name as created_by_surname,
                   lc.name as company_name,
                   lc.email as company_email,
                   lc.phone as company_phone,
                   lc.address as company_address,
                   lc.partita_iva,
                   lc.codice_fiscale
            FROM quotes q
            LEFT JOIN users u ON q.created_by = u.id
            LEFT JOIN leads_contacts lc ON q.contact_id = lc.id
            WHERE q.id = ?
        ");
        $stmt->execute([$quoteId]);
        $quote = $stmt->fetch();

    } elseif (isset($_GET['access_id'])) {
        $accessId = (int)$_GET['access_id'];

        $stmt = $pdo->prepare("
            SELECT q.*,
                   u.first_name as created_by_name,
                   u.last_name as created_by_surname,
                   lc.name as company_name,
                   lc.email as company_email,
                   lc.phone as company_phone,
                   lc.address as company_address,
                   lc.partita_iva,
                   lc.codice_fiscale
            FROM quotes q
            LEFT JOIN users u ON q.created_by = u.id
            LEFT JOIN leads_contacts lc ON q.contact_id = lc.id
            WHERE q.client_access_id = ?
            ORDER BY q.created_at DESC
            LIMIT 1
        ");
        $stmt->execute([$accessId]);
        $quote = $stmt->fetch();
    }

    if (!$quote) {
        die('Preventivo non trovato');
    }

    // Dati fittizi per currentUser (non usati in preview)
    $currentUser = [
        'client_name' => $quote['company_name'],
        'contact_id' => $quote['contact_id']
    ];
    $clientId = 0; // Non usato in preview
    $clientUsername = 'admin_preview';

} else {
    // MODALITÀ CLIENTE NORMALE
    $clientId = $_SESSION['client_id'];
    $clientUsername = $_SESSION['client_username'];

    // Assicurati che client_access_id sia impostato per le API
    if (!isset($_SESSION['client_access_id'])) {
        $_SESSION['client_access_id'] = $clientId;
    }

    // Carica informazioni accesso cliente
    $stmt = $pdo->prepare("
        SELECT ca.*, lc.name as client_name, lc.email as client_email,
               lc.phone as client_phone, lc.address as client_address,
               lc.partita_iva, lc.codice_fiscale
        FROM client_access ca
        INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
        WHERE ca.id = ?
    ");
    $stmt->execute([$clientId]);
    $currentUser = $stmt->fetch();

    if (!$currentUser) {
        die('Errore: Account non trovato');
    }

    // Carica preventivo associato
    $stmt = $pdo->prepare("
        SELECT q.*,
               u.first_name as created_by_name,
               u.last_name as created_by_surname,
               lc.name as company_name,
               lc.email as company_email,
               lc.phone as company_phone,
               lc.address as company_address,
               lc.partita_iva,
               lc.codice_fiscale
        FROM quotes q
        LEFT JOIN users u ON q.created_by = u.id
        LEFT JOIN leads_contacts lc ON q.contact_id = lc.id
        WHERE q.client_access_id = ?
        ORDER BY q.created_at DESC
        LIMIT 1
    ");
    $stmt->execute([$clientId]);
    $quote = $stmt->fetch();

    if (!$quote) {
        // Se non c'è un preventivo legato all'accesso, cerca per contact_id
        $stmt = $pdo->prepare("
            SELECT q.*,
                   u.first_name as created_by_name,
                   u.last_name as created_by_surname,
                   lc.name as company_name,
                   lc.email as company_email,
                   lc.phone as company_phone,
                   lc.address as company_address,
                   lc.partita_iva,
                   lc.codice_fiscale
            FROM quotes q
            LEFT JOIN users u ON q.created_by = u.id
            LEFT JOIN leads_contacts lc ON q.contact_id = lc.id
            WHERE q.contact_id = ?
            AND q.status NOT IN ('cancelled', 'deleted')
            ORDER BY q.created_at DESC
            LIMIT 1
        ");
        $stmt->execute([$currentUser['contact_id']]);
        $quote = $stmt->fetch();
    }

    if (!$quote) {
        die('Nessun preventivo disponibile per questo account.');
    }
}

// Decodifica dati JSON
$objectives = [];
if (!empty($quote['objectives'])) {
    $decoded = json_decode($quote['objectives'], true);
    $objectives = is_array($decoded) ? $decoded : [];
}

$bespokeOptions = [];
if (!empty($quote['bespoke_options'])) {
    $decoded = json_decode($quote['bespoke_options'], true);
    $bespokeOptions = is_array($decoded) ? $decoded : [];
}

// Log visualizzazione preventivo (SOLO SE NON È ADMIN PREVIEW)
if (!$isAdminPreview) {
    // Solo se non già visto negli ultimi 30 minuti
    $stmt = $pdo->prepare("
        SELECT id FROM client_activity_logs
        WHERE client_access_id = ?
        AND action = 'view_quote'
        AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        LIMIT 1
    ");
    $stmt->execute([$clientId]);
    if (!$stmt->fetch()) {
        // Registra visualizzazione
        $stmt = $pdo->prepare("
            INSERT INTO client_activity_logs (
                client_access_id, username, action, ip_address,
                user_agent, device_info, details
            ) VALUES (?, ?, 'view_quote', ?, ?, ?, ?)
        ");

        $deviceInfo = 'desktop';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        if (preg_match('/Mobile|Android|iPhone/i', $userAgent)) {
            $deviceInfo = 'mobile';
        } elseif (preg_match('/iPad|Tablet/i', $userAgent)) {
            $deviceInfo = 'tablet';
        }

        $stmt->execute([
            $clientId,
            $clientUsername,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $userAgent,
            $deviceInfo,
            'Visualizzato preventivo ' . $quote['quote_number']
        ]);
    }

    // Aggiorna stato a "viewed" se era "sent"
    if (in_array($quote['status'], ['sent', 'draft'])) {
        $stmt = $pdo->prepare("
            UPDATE quotes
            SET status = 'viewed',
                viewed_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$quote['id']]);
        $quote['status'] = 'viewed';
        $quote['viewed_at'] = date('Y-m-d H:i:s');
    }
}

// Funzione per inviare email agli admin
function sendAdminNotification($pdo, $quote, $currentUser, $action) {
    // Recupera tutti gli admin
    $stmt = $pdo->prepare("
        SELECT email, first_name, last_name 
        FROM users 
        WHERE role IN ('admin', 'super_admin') 
        AND is_active = 1
    ");
    $stmt->execute();
    $admins = $stmt->fetchAll();
    
    if (empty($admins)) {
        return;
    }
    
    // Prepara il contenuto della mail
    $subject = $action === 'accept' ? 
        "✅ Preventivo #{$quote['quote_number']} ACCETTATO" : 
        "❌ Preventivo #{$quote['quote_number']} RIFIUTATO";
    
    $actionText = $action === 'accept' ? 'ACCETTATO' : 'RIFIUTATO';
    $emoji = $action === 'accept' ? '🎉' : '😔';
    
    $message = "
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; }
            .header { background: linear-gradient(135deg, #37352f 0%, #787774 100%); color: white; padding: 30px; text-align: center; }
            .content { background: white; padding: 30px; margin: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            .accepted { background: #d1fae5; color: #065f46; }
            .rejected { background: #fee2e2; color: #991b1b; }
            .details { background: #f7f7f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>{$emoji} Preventivo {$actionText}</h1>
                <p>Studio Mismo CRM</p>
            </div>
            <div class='content'>
                <h2>Ciao Team!</h2>
                <p>Il preventivo <strong>#{$quote['quote_number']}</strong> è stato <strong>{$actionText}</strong> dal cliente.</p>
                
                <div class='details'>
                    <h3>Dettagli Preventivo:</h3>
                    <p><strong>Numero:</strong> #{$quote['quote_number']}</p>
                    <p><strong>Titolo:</strong> {$quote['title']}</p>
                    <p><strong>Cliente:</strong> {$currentUser['client_name']}</p>
                    <p><strong>Email:</strong> {$currentUser['client_email']}</p>
                    <p><strong>Importo:</strong> € " . number_format($quote['total'], 2, ',', '.') . "</p>
                    <p><strong>Data Emissione:</strong> " . date('d/m/Y', strtotime($quote['created_at'])) . "</p>
                    <p><strong>Data {$actionText}:</strong> " . date('d/m/Y H:i') . "</p>
                </div>
                
                <div style='text-align: center; margin: 30px 0;'>
                    <span class='status-badge " . ($action === 'accept' ? 'accepted' : 'rejected') . "'>
                        {$actionText}
                    </span>
                </div>
                
                " . ($action === 'accept' ? "
                <div style='background: #d1fae5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;'>
                    <p><strong>📋 Azione Richiesta:</strong></p>
                    <p>Il cliente è stato reindirizzato al form di onboarding. Preparati a contattarlo per iniziare il progetto!</p>
                </div>
                " : "") . "
                
                <div class='footer'>
                    <p>Questa email è stata generata automaticamente dal CRM di Studio Mismo</p>
                    <p>Non rispondere a questa email</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";
    
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: CRM Studio Mismo <noreply@studiomismo.it>',
        'Reply-To: noreply@studiomismo.it',
        'X-Mailer: PHP/' . phpversion()
    ];
    
    // Invia email a tutti gli admin
    foreach ($admins as $admin) {
        $personalizedMessage = str_replace(
            'Ciao Team!', 
            "Ciao {$admin['first_name']}!", 
            $message
        );
        
        mail(
            $admin['email'],
            $subject,
            $personalizedMessage,
            implode("\r\n", $headers)
        );
    }
}

// Gestione accettazione/rifiuto
$successMessage = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'accept') {
        $stmt = $pdo->prepare("
            UPDATE quotes 
            SET status = 'accepted',
                accepted_date = NOW()
            WHERE id = ? AND contact_id = ?
        ");
        $stmt->execute([$quote['id'], $currentUser['contact_id']]);
        
        // Log accettazione
        $stmt = $pdo->prepare("
            INSERT INTO client_activity_logs (
                client_access_id, username, action, ip_address, details
            ) VALUES (?, ?, 'accept_quote', ?, ?)
        ");
        $stmt->execute([
            $clientId,
            $clientUsername,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'Accettato preventivo ' . $quote['quote_number']
        ]);
        
        // Invia notifica agli admin
        sendAdminNotification($pdo, $quote, $currentUser, 'accept');
        
        // Reindirizza al form Google
        header('Location: https://forms.gle/gtRCMzVcXgHhFRfY8');
        exit;
        
    } elseif ($action === 'reject') {
        $reason = $_POST['rejection_reason'] ?? '';
        
        $stmt = $pdo->prepare("
            UPDATE quotes 
            SET status = 'rejected',
                rejected_date = NOW(),
                rejection_reason = ?
            WHERE id = ? AND contact_id = ?
        ");
        $stmt->execute([$reason, $quote['id'], $currentUser['contact_id']]);
        
        // Log rifiuto
        $stmt = $pdo->prepare("
            INSERT INTO client_activity_logs (
                client_access_id, username, action, ip_address, details
            ) VALUES (?, ?, 'reject_quote', ?, ?)
        ");
        $stmt->execute([
            $clientId,
            $clientUsername,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'Rifiutato preventivo ' . $quote['quote_number'] . ($reason ? ' - Motivo: ' . $reason : '')
        ]);
        
        // Invia notifica agli admin
        sendAdminNotification($pdo, $quote, $currentUser, 'reject');
        
        $successMessage = 'Grazie per il feedback. Il preventivo è stato rifiutato.';
        $quote['status'] = 'rejected';
    }
}

// Gestione messaggio da URL
if (isset($_GET['msg'])) {
    $successMessage = $_GET['msg'];
}
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <!-- Meta Tag Base -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    
    <!-- SEO Meta Tag Principali -->
    <title>Preventivo #<?= htmlspecialchars($quote['quote_number']) ?> - MISMO STUDIO</title>
    <meta name="description" content="MISMO STUDIO - Specialisti nel rifacimento e redesign di siti web aziendali. Trasformiamo il tuo sito in uno strumento di business moderno e performante.">
    <meta name="keywords" content="rifacimento sito web, redesign sito, web design Milano, agenzia web, sviluppo siti web, MISMO STUDIO, restyling sito aziendale, Web Agency Milano, Web agency Verona">
    <meta name="author" content="MISMO STUDIO">
    <meta name="robots" content="index, follow">
    <meta name="language" content="Italian">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    
    <!-- Adobe Fonts -->
    <link rel="stylesheet" href="https://use.typekit.net/ekm2csm.css">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <style>
        :root {
            --primary-black: #000;
            --primary-white: #fff;
            --gray: #AAAAAA;
            --blue-accent: #0033FF;
            --green-price: #62E74B;
            --success-green: #d1fae5;
            --success-text: #065f46;
            --error-red: #fee2e2;
            --error-text: #991b1b;
        }

        html, body {
            max-width: 100%;
            overflow-x: hidden;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: "Elza", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-weight: 300;
            color: var(--primary-black);
            background: var(--primary-white);
        }

        .menu-principale {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 2em;
        }

        .menu-principale h1 {
            font-size: 1.5em;
            font-weight: 300;
            text-transform: uppercase;
            padding: 1em 0;
        }

        .numero-preventivo {
            text-align: right;
            font-size: 0.8em;
        }

        .logout-btn {
            background: none;
            border: 1px solid var(--gray);
            padding: 0.5em 1em;
            font-family: "martian-mono-variable", sans-serif;
            font-size: 12px;
            text-transform: uppercase;
            cursor: pointer;
            text-decoration: none;
            color: var(--primary-black);
            margin-left: 1em;
        }

        .logout-btn:hover {
            background: var(--gray);
            color: var(--primary-white);
        }

        .riga {
            padding: 1em;
            border-bottom: 1px solid var(--gray);
        }

        .container {
            padding: 0 2em;
        }

        /* Alert Messages */
        .alert {
            background: var(--success-green);
            border: 1px solid var(--success-text);
            color: var(--success-text);
            padding: 1em 2em;
            margin: 2em 0;
            font-family: "martian-mono-variable", sans-serif;
            font-size: 14px;
            text-transform: uppercase;
        }

        .alert.warning {
            background: #fffbeb;
            border-color: #fcd34d;
            color: #92400e;
        }

        .alert.error {
            background: var(--error-red);
            border-color: var(--error-text);
            color: var(--error-text);
        }

        .informazioni-iniziali {
            margin-top: 2em;
            display: flex;
            flex-direction: column;
        }

        .titolo-preventivo {
            font-size: 48px;
            font-weight: 300;
            text-transform: uppercase;
            margin-bottom: 0.5em;
        }

        .data-preventivo {
            display: flex;
            align-items: center;
            padding-bottom: 0.5em;
        }

        .data-preventivo p {
            margin: 0;
            padding-left: 0.5em;
            font-family: "martian-mono-variable", sans-serif;
            font-weight: 200;
            font-size: 16px;
        }

        .status-badge {
            display: inline-block;
            padding: 0.5em 1em;
            font-family: "martian-mono-variable", sans-serif;
            font-size: 12px;
            text-transform: uppercase;
            margin-left: 1em;
        }

        .status-viewed { background: var(--gray); color: var(--primary-white); }
        .status-accepted { background: var(--success-green); color: var(--success-text); }
        .status-rejected { background: var(--error-red); color: var(--error-text); }

        .dati-cliente {
            margin-top: 1em;
            display: flex;
            flex-direction: column;
        }

        .titolo-dati-cliente {
            font-size: 24px;
            font-weight: 300;
            text-transform: uppercase;
            margin-bottom: 1em;
        }

        .dati-specifici {
            margin-bottom: 1.5em;
        }

        .dati-specifici h2 {
            font-size: 20px;
            font-weight: 300;
            margin-bottom: 0em;
        }

        .dati-specifici p {
            font-size: 36px;
            font-weight: 300;
            color: var(--gray);
        }

        .riepologo-progetto {
            margin-top: 1em;
            display: flex;
            flex-direction: column;
        }

        .riepilogo {
            font-size: 16px;
            font-family: "martian-mono-variable", sans-serif;
            font-weight: 300;
            margin-top: 1em;
            margin-bottom: 2em;
        }

        .obiettivi {
            margin-top: 1em;
            display: flex;
            flex-wrap: wrap;
            gap: 2em;
        }

        .obiettivi h2 {
            width: 100%;
            margin-bottom: 1.5em;
        }

        .box-obiettivo {
            flex: 1;
            min-width: 300px;
        }

        .box-obiettivo h3 {
            font-size: 36px;
            font-weight: 300;
            color: var(--gray);
            margin-bottom: 0.5em;
        }

        .box-obiettivo p {
            font-size: 18px;
            padding-right: 2em;
        }

        .proposte {
            display: flex;
            gap: 1em;
            flex-wrap: wrap;
        }

        .proposta-box {
            border: 1px solid var(--primary-black);
            padding: 2em;
            flex: 1;
            min-width: 300px;
        }

        .prima-parte {
            border-bottom: 1px solid var(--primary-black);
            margin-bottom: 1em;
        }

        .prima-parte h2 {
            font-size: 48px;
            font-weight: 300;
        }

        .prima-parte p {
            font-size: 15px;
            font-weight: 300;
            font-family: "martian-mono-variable", sans-serif;
            margin-bottom: 1em;
        }

        .lista-proposta {
            list-style: none;
            padding-left: 0;
            margin-top: 1em;
        }

        .lista-proposta li {
            font-size: 15px;
            font-family: "martian-mono-variable", sans-serif;
            font-weight: 300;
            text-transform: uppercase;
            padding-bottom: 0.5em;
            display: flex;
            align-items: center;
        }

        .lista-proposta li:before {
            content: "→";
            padding-right: 1em;
            font-weight: bold;
        }

        .durata {
            display: flex;
            align-items: center;
            margin: 1em 0;
        }

        .durata:before {
            content: "⏱";
            padding-right: 0.5em;
        }

        .durata p {
            font-size: 15px;
            font-weight: 300;
            font-family: "martian-mono-variable", sans-serif;
            margin: 0;
        }

        .investimento {
            margin-top: 1.5em;
        }

        .investimento h3 {
            font-size: 16px;
            font-weight: 300;
            margin: 0;
        }

        .investimento p {
            font-size: 36px;
            font-weight: 400;
            color: var(--green-price);
            margin: 0;
        }

        .totals {
            background: #f8f8f8;
            padding: 2em;
            margin: 2em 0;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5em;
            font-family: "martian-mono-variable", sans-serif;
            font-size: 16px;
        }

        .total-row.final {
            border-top: 1px solid var(--primary-black);
            padding-top: 0.5em;
            margin-top: 1em;
            font-size: 24px;
            font-weight: 600;
        }

        .total-row.discount {
            color: var(--green-price);
        }

        .notes-box {
            background: #fffbeb;
            border: 1px solid #fcd34d;
            padding: 2em;
            margin: 2em 0;
        }

        .notes-title {
            font-size: 16px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 1em;
            text-transform: uppercase;
        }

        .notes-content {
            font-family: "martian-mono-variable", sans-serif;
            font-size: 14px;
            color: #78350f;
            line-height: 1.6;
        }

        /* Actions Section */
        .actions-section {
            background: #f8f8f8;
            border-top: 1px solid var(--primary-black);
            padding: 3em 2em;
            text-align: center;
            margin-top: 3em;
        }

        .actions-title {
            font-size: 24px;
            font-weight: 300;
            text-transform: uppercase;
            margin-bottom: 1em;
        }

        .actions-subtitle {
            font-family: "martian-mono-variable", sans-serif;
            font-size: 14px;
            margin-bottom: 2em;
        }

        .actions-buttons {
            display: flex;
            gap: 1em;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn {
            padding: 1em 2em;
            border: 1px solid var(--primary-black);
            background: var(--primary-white);
            color: var(--primary-black);
            font-family: "martian-mono-variable", sans-serif;
            font-size: 14px;
            text-transform: uppercase;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s;
        }

        .btn:hover {
            background: var(--primary-black);
            color: var(--primary-white);
        }

        .btn-accept {
            background: var(--green-price);
            border-color: var(--green-price);
            color: var(--primary-black);
        }

        .btn-accept:hover {
            background: var(--primary-black);
            color: var(--primary-white);
        }

        .btn-reject {
            background: var(--error-red);
            border-color: var(--error-text);
            color: var(--error-text);
        }

        .btn-reject:hover {
            background: var(--error-text);
            color: var(--primary-white);
        }

        /* Status specific actions */
        .actions-section.accepted {
            background: var(--success-green);
            color: var(--success-text);
        }

        .actions-section.rejected {
            background: var(--error-red);
            color: var(--error-text);
        }

        /* Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: var(--primary-white);
            padding: 3em;
            width: 90%;
            max-width: 500px;
            border: 1px solid var(--primary-black);
        }

        .modal-title {
            font-size: 24px;
            font-weight: 300;
            text-transform: uppercase;
            margin-bottom: 1em;
        }

        .form-group {
            margin-bottom: 2em;
        }

        .form-label {
            display: block;
            font-family: "martian-mono-variable", sans-serif;
            font-size: 14px;
            text-transform: uppercase;
            margin-bottom: 0.5em;
        }

        .form-control {
            width: 100%;
            padding: 1em;
            border: 1px solid var(--gray);
            font-family: "martian-mono-variable", sans-serif;
            font-size: 14px;
            resize: vertical;
            min-height: 120px;
        }

        .modal-actions {
            display: flex;
            gap: 1em;
            justify-content: flex-end;
        }

        @media (max-width: 768px) {
            .container {
                padding: 0 1em;
            }
            
            .menu-principale {
                padding: 0 1em;
                flex-direction: column;
                text-align: center;
            }
            
            .numero-preventivo {
                text-align: center;
            }
            
            .titolo-preventivo {
                font-size: 32px;
            }
            
            .dati-specifici p {
                font-size: 24px;
            }
            
            .obiettivi {
                flex-direction: column;
            }
            
            .box-obiettivo {
                min-width: auto;
            }
            
            .box-obiettivo h3 {
                font-size: 24px;
            }
            
            .proposte {
                flex-direction: column;
            }
            
            .proposta-box {
                min-width: auto;
            }
            
            .prima-parte h2 {
                font-size: 32px;
            }
            
            .actions-buttons {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
        }

        /* ===== STILI PER SELEZIONE PACCHETTI E METODI PAGAMENTO ===== */

        /* Pacchetto selezionato */
        .bespoke-option.selected-package {
            border: 3px solid var(--primary-black) !important;
            box-shadow: 0 8px 24px rgba(55, 53, 47, 0.2);
            transform: scale(1.02);
            transition: all 0.3s ease;
        }

        .bespoke-option {
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .bespoke-option:hover {
            box-shadow: 0 4px 16px rgba(55, 53, 47, 0.15);
            transform: translateY(-2px);
        }

        /* Grid per opzioni di pagamento */
        .payment-options-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        /* Singola opzione di pagamento */
        .payment-option {
            background: white;
            border: 2px solid #e5e5e5;
            border-radius: 12px;
            padding: 24px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            text-align: center;
        }

        .payment-option:hover {
            border-color: var(--gray);
            box-shadow: 0 4px 16px rgba(55, 53, 47, 0.1);
            transform: translateY(-2px);
        }

        .payment-option.selected-payment {
            border: 3px solid var(--primary-black);
            box-shadow: 0 8px 24px rgba(55, 53, 47, 0.2);
            background: #f8f8f8;
        }

        /* Icona opzione pagamento */
        .payment-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }

        /* Label opzione pagamento */
        .payment-label {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--primary-black);
        }

        /* Descrizione opzione pagamento */
        .payment-description {
            font-family: "martian-mono-variable", sans-serif;
            font-size: 12px;
            color: #666;
            margin-bottom: 12px;
        }

        /* Badge sconto */
        .payment-discount-badge {
            display: inline-block;
            padding: 6px 12px;
            background: var(--success-green);
            color: var(--success-text);
            border-radius: 6px;
            font-family: "martian-mono-variable", sans-serif;
            font-size: 12px;
            font-weight: 600;
            margin-top: 8px;
        }

        .payment-discount-badge.no-discount {
            background: #e5e5e5;
            color: #666;
        }

        /* Check di selezione */
        .payment-selected-check {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 32px;
            height: 32px;
            background: var(--primary-black);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
        }

        /* Responsive per opzioni pagamento */
        @media (max-width: 768px) {
            .payment-options-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <?php if ($isAdminPreview): ?>
    <!-- BANNER ADMIN PREVIEW -->
    <div style="position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 12px 20px; z-index: 10000; box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-family: 'Inter Tight', sans-serif; font-size: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div>
            <strong style="font-weight: 700;">🔍 MODALITÀ ANTEPRIMA ADMIN</strong>
            <span style="margin-left: 15px;">Stai visualizzando l'anteprima come la vedrebbe il cliente</span>
        </div>
        <div style="display: flex; gap: 20px; font-size: 12px; opacity: 0.9; align-items: center;">
            <span>👤 <?= htmlspecialchars($adminUser['first_name'] . ' ' . $adminUser['last_name']) ?></span>
            <span>📅 <?= date('d/m/Y H:i:s') ?></span>
            <span>📋 ID: <?= $quote['id'] ?></span>
            <span>Status: <?= strtoupper($quote['status']) ?></span>
            <button onclick="window.close()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">✕ Chiudi</button>
        </div>
    </div>
    <div style="height: 50px;"></div> <!-- Spacer per il banner -->
    <?php endif; ?>

    <nav class="container menu-principale">
        <div>
            <h1>Mismo®Studio</h1>
        </div>
        <div class="numero-preventivo">
            <h1>Preventivo <?= htmlspecialchars($quote['quote_number']) ?></h1>
            <?php if (!$isAdminPreview): ?>
            <a href="/core/auth/logout.php" class="logout-btn">Esci</a>
            <?php endif; ?>
        </div>
    </nav>

    <div class="container">
        <div class="col-sm-12 riga"></div>
    </div>

    <?php if ($successMessage): ?>
    <div class="container">
        <div class="alert">
            ✓ <?= htmlspecialchars($successMessage) ?>
        </div>
    </div>
    <?php endif; ?>

    <?php
    // Verifica validità preventivo
    $validUntil = strtotime($quote['valid_until']);
    $daysRemaining = ceil(($validUntil - time()) / 86400);
    
    if ($daysRemaining <= 0): ?>
    <div class="container">
        <div class="alert error">
            ⚠️ Questo preventivo è scaduto il <?= date('d/m/Y', $validUntil) ?>
        </div>
    </div>
    <?php elseif ($daysRemaining <= 7): ?>
    <div class="container">
        <div class="alert warning">
            ⏰ Attenzione: questo preventivo scade tra <?= $daysRemaining ?> giorni
        </div>
    </div>
    <?php endif; ?>

    <div class="container informazioni-iniziali">
        <div class="col-sm-12">
            <h1 class="titolo-preventivo"><?= htmlspecialchars($quote['title']) ?></h1>
        </div>
        <div class="col-sm-6 data-preventivo">
            <p>📅 Emesso <?= date('l d F Y', strtotime($quote['created_at'])) ?></p>
        </div>
        <div class="col-sm-6 data-preventivo">
            <p>⏳ Valido fino a <?= date('l d F Y', $validUntil) ?></p>
            <span class="status-badge status-<?= $quote['status'] ?>">
                <?= $quote['status'] === 'viewed' ? 'Visualizzato' : 
                    ($quote['status'] === 'accepted' ? 'Accettato' : 
                    ($quote['status'] === 'rejected' ? 'Rifiutato' : ucfirst($quote['status']))) ?>
            </span>
        </div>
    </div>

    <div class="container">
        <div class="col-sm-12 riga"></div>
    </div>

    <div class="container dati-cliente">
        <div class="col-sm-12">
            <h2 class="titolo-dati-cliente">I tuoi dati</h2>
        </div>
        <div class="col-sm-12 dati-specifici">
            <h2>Ragione sociale</h2>
            <p><?= htmlspecialchars($quote['company_name']) ?></p>
        </div>
        <?php if ($quote['partita_iva']): ?>
        <div class="col-sm-12 dati-specifici">
            <h2>Partita IVA</h2>
            <p><?= htmlspecialchars($quote['partita_iva']) ?></p>
        </div>
        <?php endif; ?>
        <?php if ($quote['codice_fiscale']): ?>
        <div class="col-sm-12 dati-specifici">
            <h2>Codice Fiscale</h2>
            <p><?= htmlspecialchars($quote['codice_fiscale']) ?></p>
        </div>
        <?php endif; ?>
        <div class="col-sm-12 dati-specifici">
            <h2>Email</h2>
            <p><?= htmlspecialchars($quote['company_email']) ?></p>
        </div>
        <?php if ($quote['company_phone']): ?>
        <div class="col-sm-12 dati-specifici">
            <h2>Telefono</h2>
            <p><?= htmlspecialchars($quote['company_phone']) ?></p>
        </div>
        <?php endif; ?>
        <?php if ($quote['company_address']): ?>
        <div class="col-sm-12 dati-specifici">
            <h2>Indirizzo</h2>
            <p><?= htmlspecialchars($quote['company_address']) ?></p>
        </div>
        <?php endif; ?>
    </div>

    <div class="container">
        <div class="col-sm-12 riga"></div>
    </div>

    <div class="container riepologo-progetto">
        <div class="col-sm-12">
            <h2 class="titolo-dati-cliente">Riepilogo del progetto</h2>
        </div>
        <div class="col-sm-12 dati-specifici">
            <h2>Tipologia</h2>
            <p><?= $quote['project_type_custom'] ?: ucfirst($quote['project_type']) ?></p>
        </div>
        <?php if ($quote['description']): ?>
        <div class="col-sm-6">
            <p class="riepilogo"><?= nl2br(htmlspecialchars($quote['description'])) ?></p>
        </div>
        <?php endif; ?>
    </div>

    <?php if (!empty($objectives)): ?>
    <div class="container">
        <div class="col-sm-12 riga"></div>
    </div>

    <div class="container" style="margin-top: 2em; margin-bottom: 2em;">
        <div class="col-sm-12 dati-specifici">
            <h2>Obiettivi del progetto</h2>
        </div>
    </div>

    <div class="container obiettivi">
        <?php foreach ($objectives as $index => $obj): ?>
        <div class="box-obiettivo">
            <h3><?= isset($obj['title']) ? htmlspecialchars($obj['title']) : 'Obiettivo ' . chr(65 + $index) ?></h3>
            <?php if (!empty($obj['description'])): ?>
            <p><?= nl2br(htmlspecialchars($obj['description'])) ?></p>
            <?php endif; ?>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <?php if (!empty($bespokeOptions)): ?>
    <div class="container">
        <div class="col-sm-12 riga"></div>
    </div>

    <div class="container" style="margin-top: 2em; margin-bottom: 2em;">
        <div class="col-sm-12">
            <h2 class="titolo-dati-cliente">Proposte di investimento</h2>
            <p style="font-family: 'martian-mono-variable', sans-serif; font-size: 14px; color: #666; margin-top: 1em;">
                Seleziona il pacchetto più adatto alle tue esigenze. Il prezzo si aggiornerà automaticamente.
            </p>
        </div>
    </div>

    <div class="container proposte">
        <?php
        $selectedPackageId = $quote['selected_package_id'] ?? null;
        foreach ($bespokeOptions as $index => $option):
            $packageId = $option['id'] ?? ($index + 1);
            $isSelected = ($selectedPackageId == $packageId);
        ?>
        <div class="proposta-box bespoke-option <?= $isSelected ? 'selected-package' : '' ?> <?= !$isAdminPreview ? 'selectable-package' : '' ?>"
             data-package-id="<?= $packageId ?>"
             data-package-price="<?= (float)$option['price'] ?>"
             data-package-name="<?= htmlspecialchars($option['title']) ?>"
             style="cursor: <?= !$isAdminPreview ? 'pointer' : 'default' ?>; position: relative; transition: all 0.3s ease;">

            <?php if ($isSelected): ?>
            <div class="package-selected-badge" style="position: absolute; top: 10px; right: 10px; background: #22c55e; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                ✓ Selezionato
            </div>
            <?php endif; ?>

            <div class="prima-parte">
                <h2><?= htmlspecialchars($option['title']) ?></h2>
                <p>Opzione <?= $index + 1 ?></p>
            </div>
            <?php if (!empty($option['features']) && is_array($option['features'])): ?>
            <ul class="lista-proposta">
                <?php foreach ($option['features'] as $feature): ?>
                    <?php if (!empty($feature)): ?>
                    <li><?= htmlspecialchars($feature) ?></li>
                    <?php endif; ?>
                <?php endforeach; ?>
            </ul>
            <?php endif; ?>
            <div class="durata">
                <p>Durata progetto inclusa</p>
            </div>
            <div class="investimento">
                <h3>Investimento proposto</h3>
                <p><?= number_format((float)$option['price'], 2, ',', '.') ?> EUR</p>
            </div>

            <?php if (!$isAdminPreview && !$isSelected): ?>
            <div class="select-package-btn" style="text-align: center; margin-top: 1em; padding: 12px; background: #37352f; color: white; border-radius: 8px; font-weight: 600;">
                Seleziona questo pacchetto
            </div>
            <?php endif; ?>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <!-- Riepilogo Investimento -->
    <div class="container">
        <div class="col-sm-12 riga"></div>
    </div>

    <div class="container">
        <h2 class="titolo-dati-cliente">Riepilogo Investimento</h2>

        <?php if (empty($quote['selected_package_id']) && !empty($bespokeOptions)): ?>
            <!-- Nessun pacchetto selezionato: mostra "A partire da" -->
            <div class="totals" id="summary-starting-from">
                <div class="total-row" style="background: #f0f9ff; padding: 20px; border-radius: 8px;">
                    <span style="font-size: 18px; font-weight: 600;">A partire da</span>
                    <span id="starting-price" style="font-size: 24px; font-weight: 700; color: #37352f;">
                        € <?= number_format($quote['subtotal'], 2, ',', '.') ?>
                    </span>
                </div>
                <p style="font-family: 'martian-mono-variable', sans-serif; font-size: 13px; color: #666; margin-top: 12px; text-align: center;">
                    + IVA <?= number_format($quote['tax_rate'], 0) ?>% | Seleziona un pacchetto per vedere il totale completo
                </p>
            </div>
        <?php else: ?>
            <!-- Pacchetto selezionato: mostra riepilogo completo -->
            <div class="totals" id="summary-detailed">
                <div class="total-row">
                    <span>Subtotale</span>
                    <span id="summary-subtotal">€ <?= number_format($quote['subtotal'], 2, ',', '.') ?></span>
                </div>

                <?php if ($quote['discount_percentage'] > 0): ?>
                <div class="total-row discount">
                    <span>Sconto Base (<?= number_format($quote['discount_percentage'], 0) ?>%)</span>
                    <span>- € <?= number_format($quote['discount_amount'], 2, ',', '.') ?></span>
                </div>
                <?php endif; ?>

                <!-- Sconto modalità pagamento (dinamico o statico se già selezionato) -->
                <?php
                $paymentDiscountAmount = 0;
                $paymentDiscountLabel = 'Sconto Pagamento';

                if (!empty($quote['selected_payment_option'])) {
                    $selectedPaymentKey = $quote['selected_payment_option'];
                    $discountField = '';

                    switch($selectedPaymentKey) {
                        case 'one_time':
                            $discountField = 'one_time_discount';
                            $paymentDiscountLabel = 'Sconto Pagamento Unico';
                            break;
                        case 'payment_2':
                            $discountField = 'payment_2_discount';
                            $paymentDiscountLabel = 'Sconto 2 Rate';
                            break;
                        case 'payment_3':
                            $discountField = 'payment_3_discount';
                            $paymentDiscountLabel = 'Sconto 3 Rate';
                            break;
                        case 'payment_4':
                            $discountField = 'payment_4_discount';
                            $paymentDiscountLabel = 'Sconto 4 Rate';
                            break;
                    }

                    if ($discountField && isset($quote[$discountField]) && $quote[$discountField] > 0) {
                        $subtotalForDiscount = $quote['subtotal'];
                        $paymentDiscountAmount = ($subtotalForDiscount * $quote[$discountField]) / 100;
                        $paymentDiscountLabel .= ' (' . number_format($quote[$discountField], 0) . '%)';
                    }
                }
                ?>

                <div class="total-row discount" id="summary-discount-row" style="display: <?= $paymentDiscountAmount > 0 ? 'flex' : 'none' ?>;">
                    <span id="payment-discount-label"><?= $paymentDiscountLabel ?></span>
                    <span id="summary-discount">- € <?= number_format($paymentDiscountAmount, 2, ',', '.') ?></span>
                </div>

                <?php
                // Ricalcola IVA e totale se c'è sconto pagamento
                $finalSubtotal = $quote['subtotal'] - ($quote['discount_amount'] ?? 0) - $paymentDiscountAmount;
                $finalTaxAmount = ($finalSubtotal * $quote['tax_rate']) / 100;
                $finalTotal = $finalSubtotal + $finalTaxAmount;
                ?>

                <?php if ($quote['tax_rate'] > 0): ?>
                <div class="total-row">
                    <span>IVA (<?= number_format($quote['tax_rate'], 0) ?>%)</span>
                    <span id="summary-iva">€ <?= number_format($finalTaxAmount, 2, ',', '.') ?></span>
                </div>
                <?php else: ?>
                <div class="total-row">
                    <span>IVA</span>
                    <span>Esente</span>
                </div>
                <?php endif; ?>

                <div class="total-row final">
                    <span>Totale</span>
                    <span id="summary-total">€ <?= number_format($finalTotal, 2, ',', '.') ?></span>
                </div>
            </div>
        <?php endif; ?>
    </div>

    <?php if ($quote['notes']): ?>
    <div class="container">
        <div class="notes-box">
            <div class="notes-title">Note</div>
            <div class="notes-content">
                <?= nl2br(htmlspecialchars($quote['notes'])) ?>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <?php if ($quote['terms_conditions']): ?>
    <div class="container">
        <div class="col-sm-12 riga"></div>
    </div>
    <div class="container">
        <h2 class="titolo-dati-cliente">Termini e Condizioni</h2>
        <div class="notes-content" style="margin-top: 1em;">
            <?= nl2br(htmlspecialchars($quote['terms_conditions'])) ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Sezione Scelta Metodo di Pagamento (visibile solo se abilitata e pacchetto selezionato) -->
    <?php if (!empty($quote['enable_payment_discount']) && $quote['status'] === 'viewed' && $daysRemaining > 0): ?>
    <div class="container" id="payment-method-section" style="display: <?= !empty($quote['selected_package_id']) ? 'block' : 'none' ?>; margin-top: 40px;">
        <div class="col-sm-12 riga"></div>
        <h2 class="titolo-dati-cliente" style="margin-bottom: 20px;">Come vuoi pagare?</h2>
        <p style="font-family: 'martian-mono-variable', sans-serif; font-size: 14px; color: #666; margin-bottom: 30px;">
            Scegli la modalità di pagamento più adatta alle tue esigenze. Gli sconti vengono applicati automaticamente.
        </p>

        <div class="payment-options-grid">
            <?php
            $paymentOptions = [];

            if (!empty($quote['one_time_discount'])) {
                $paymentOptions[] = [
                    'key' => 'one_time',
                    'label' => 'Pagamento Unico',
                    'icon' => '💵',
                    'description' => 'Soluzione unica e conveniente',
                    'discount' => $quote['one_time_discount'],
                    'installments' => 1
                ];
            }

            if (!empty($quote['payment_2_discount']) || $quote['payment_2_discount'] == 0) {
                $paymentOptions[] = [
                    'key' => 'payment_2',
                    'label' => '2 Rate',
                    'icon' => '📅',
                    'description' => 'Dividi in 2 pagamenti',
                    'discount' => $quote['payment_2_discount'],
                    'installments' => 2
                ];
            }

            if (!empty($quote['payment_3_discount']) || $quote['payment_3_discount'] == 0) {
                $paymentOptions[] = [
                    'key' => 'payment_3',
                    'label' => '3 Rate',
                    'icon' => '📅',
                    'description' => 'Dividi in 3 pagamenti',
                    'discount' => $quote['payment_3_discount'],
                    'installments' => 3
                ];
            }

            if (!empty($quote['payment_4_discount']) || $quote['payment_4_discount'] == 0) {
                $paymentOptions[] = [
                    'key' => 'payment_4',
                    'label' => '4 Rate',
                    'icon' => '📅',
                    'description' => 'Dividi in 4 pagamenti',
                    'discount' => $quote['payment_4_discount'],
                    'installments' => 4
                ];
            }

            foreach ($paymentOptions as $option):
                $isSelected = ($quote['selected_payment_option'] === $option['key']);
            ?>
                <div class="payment-option <?= $isSelected ? 'selected-payment' : '' ?>"
                     data-payment-option="<?= $option['key'] ?>"
                     data-installments="<?= $option['installments'] ?>">
                    <div class="payment-icon"><?= $option['icon'] ?></div>
                    <div class="payment-label"><?= htmlspecialchars($option['label']) ?></div>
                    <div class="payment-description"><?= htmlspecialchars($option['description']) ?></div>

                    <?php if ($option['discount'] > 0): ?>
                        <div class="payment-discount-badge">
                            Sconto <?= number_format($option['discount'], 0) ?>%
                        </div>
                    <?php else: ?>
                        <div class="payment-discount-badge no-discount">
                            Nessuno sconto
                        </div>
                    <?php endif; ?>

                    <!-- Prezzo mensile (nascosto inizialmente, mostrato via JS) -->
                    <div class="payment-monthly-price" style="display: none; margin-top: 12px; padding: 8px 12px; background: #f0f9ff; border-radius: 6px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 700; color: #37352f;">
                            <span class="monthly-amount">-</span>
                        </div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                            per <span class="monthly-duration">-</span> mesi
                        </div>
                    </div>

                    <!-- Badge selezionato (inizialmente generato da PHP, poi gestito via JS) -->
                    <?php if ($isSelected): ?>
                        <div class="payment-selected-check">✓</div>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <?php if ($quote['status'] === 'viewed' && $daysRemaining > 0): ?>
    <div class="actions-section" id="accept-button" style="display: <?= (!empty($quote['enable_payment_discount']) && empty($quote['selected_payment_option'])) ? 'none' : 'block' ?>">
        <h2 class="actions-title">Sei interessato a questo preventivo?</h2>
        <p class="actions-subtitle">
            Accetta il preventivo per iniziare la collaborazione o rifiutalo con un feedback
        </p>
        <div class="actions-buttons">
            <form method="POST" style="display: inline;">
                <input type="hidden" name="action" value="accept">
                <button type="submit" class="btn btn-accept" <?= $isAdminPreview ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '' ?>>
                    ✓ Accetta Preventivo
                </button>
            </form>
            <button class="btn btn-reject" onclick="<?= $isAdminPreview ? 'return false;' : 'openRejectModal()' ?>" <?= $isAdminPreview ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '' ?>>
                ✗ Rifiuta Preventivo
            </button>
        </div>
        <?php if ($isAdminPreview): ?>
        <p style="text-align: center; margin-top: 16px; color: #ff6b6b; font-size: 12px; font-weight: 600;">
            ⚠️ Pulsanti disabilitati in modalità anteprima
        </p>
        <?php endif; ?>
    </div>
    <?php elseif ($quote['status'] === 'accepted'): ?>
    <div class="actions-section accepted">
        <h2 class="actions-title">
            ✓ Preventivo Accettato
        </h2>
        <p class="actions-subtitle">
            Accettato il <?= date('d/m/Y alle H:i', strtotime($quote['accepted_date'])) ?>
        </p>
    </div>
    <?php elseif ($quote['status'] === 'rejected'): ?>
    <div class="actions-section rejected">
        <h2 class="actions-title">
            ✗ Preventivo Rifiutato
        </h2>
        <p class="actions-subtitle">
            Rifiutato il <?= date('d/m/Y alle H:i', strtotime($quote['rejected_date'])) ?>
            <?php if ($quote['rejection_reason']): ?>
            <br>Motivo: <?= htmlspecialchars($quote['rejection_reason']) ?>
            <?php endif; ?>
        </p>
    </div>
    <?php endif; ?>

    <div class="space" style="padding: 5em;"></div>

    <!-- Modal Rifiuto -->
    <div id="rejectModal" class="modal">
        <div class="modal-content">
            <h2 class="modal-title">Rifiuta Preventivo</h2>
            <p style="font-family: 'martian-mono-variable', sans-serif; font-size: 14px; margin-bottom: 2em;">
                Ci dispiace che il preventivo non soddisfi le tue esigenze. 
                Il tuo feedback è importante per noi.
            </p>
            <form method="POST">
                <input type="hidden" name="action" value="reject">
                <div class="form-group">
                    <label class="form-label">Motivo del rifiuto (opzionale)</label>
                    <textarea name="rejection_reason" class="form-control" 
                              placeholder="Aiutaci a capire come possiamo migliorare..."></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn" onclick="closeRejectModal()">
                        Annulla
                    </button>
                    <button type="submit" class="btn btn-reject">
                        Conferma Rifiuto
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    
    <script>
        function openRejectModal() {
            document.getElementById('rejectModal').classList.add('active');
        }
        
        function closeRejectModal() {
            document.getElementById('rejectModal').classList.remove('active');
        }
        
        // Chiudi modal cliccando fuori
        document.getElementById('rejectModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeRejectModal();
            }
        });

        // ===== SELEZIONE PACCHETTI E METODO PAGAMENTO =====

        let selectedPackageId = <?= !empty($quote['selected_package_id']) ? $quote['selected_package_id'] : 'null' ?>;
        let selectedPackagePrice = <?= !empty($quote['selected_package_id']) ? $quote['subtotal'] : 'null' ?>;
        let selectedPaymentOption = <?= !empty($quote['selected_payment_option']) ? "'" . $quote['selected_payment_option'] . "'" : 'null' ?>;

        const paymentDiscounts = {
            one_time: <?= !empty($quote['one_time_discount']) ? $quote['one_time_discount'] : '0' ?>,
            payment_2: <?= !empty($quote['payment_2_discount']) ? $quote['payment_2_discount'] : '0' ?>,
            payment_3: <?= !empty($quote['payment_3_discount']) ? $quote['payment_3_discount'] : '0' ?>,
            payment_4: <?= !empty($quote['payment_4_discount']) ? $quote['payment_4_discount'] : '0' ?>
        };

        const ivaRate = <?= !empty($quote['iva_percentage']) ? $quote['iva_percentage'] : ($quote['tax_rate'] ?? 22) ?>;
        const enablePaymentDiscount = <?= !empty($quote['enable_payment_discount']) ? 'true' : 'false' ?>;

        /**
         * Seleziona un pacchetto bespoke
         */
        function selectPackage(packageId, price, packageName) {
            console.log('Selezionato pacchetto:', packageId, price, packageName);

            // Aggiorna variabili globali
            selectedPackageId = packageId;
            selectedPackagePrice = parseFloat(price);
            selectedPaymentOption = null; // Reset payment option quando cambia pacchetto

            // Rimuovi selezione da tutti i pacchetti E i loro badge
            document.querySelectorAll('.bespoke-option').forEach(opt => {
                opt.classList.remove('selected-package');
                // Rimuovi badge "Selezionato" se presente
                const badge = opt.querySelector('.package-selected-badge');
                if (badge) {
                    badge.remove();
                }
                // Mostra di nuovo il bottone "Seleziona questo pacchetto"
                const selectBtn = opt.querySelector('.select-package-btn');
                if (selectBtn) {
                    selectBtn.style.display = 'block';
                }
            });

            // Aggiungi classe al pacchetto selezionato
            const selectedElement = document.querySelector(`[data-package-id="${packageId}"]`);
            if (selectedElement) {
                selectedElement.classList.add('selected-package');

                // Aggiungi badge "Selezionato"
                const badge = document.createElement('div');
                badge.className = 'package-selected-badge';
                badge.style.cssText = 'position: absolute; top: 10px; right: 10px; background: #22c55e; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;';
                badge.textContent = '✓ Selezionato';
                selectedElement.insertBefore(badge, selectedElement.firstChild);

                // Nascondi il bottone "Seleziona questo pacchetto" del pacchetto selezionato
                const selectBtn = selectedElement.querySelector('.select-package-btn');
                if (selectBtn) {
                    selectBtn.style.display = 'none';
                }
            }

            // Nascondi selezione metodo pagamento precedente E rimuovi badge
            document.querySelectorAll('.payment-option').forEach(opt => {
                opt.classList.remove('selected-payment');
                // Rimuovi badge "✓" se presente
                const badge = opt.querySelector('.payment-selected-check');
                if (badge) {
                    badge.remove();
                }
            });

            // Nascondi "A partire da" e mostra riepilogo completo
            const startingFromSection = document.getElementById('summary-starting-from');
            const detailedSummary = document.getElementById('summary-detailed');

            if (startingFromSection) startingFromSection.style.display = 'none';
            if (detailedSummary) detailedSummary.style.display = 'block';

            // Aggiorna i valori nel riepilogo
            recalculateTotal();

            // Mostra sezione pagamento se abilitata
            if (enablePaymentDiscount) {
                const paymentSection = document.getElementById('payment-method-section');
                if (paymentSection) {
                    paymentSection.style.display = 'block';
                    // Scroll smooth alla sezione pagamento
                    paymentSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                // Se non ci sono sconti pagamento, mostra direttamente il pulsante accetta
                showAcceptButton();
            }

            // Salva selezione nel database via AJAX
            savePackageSelection(packageId);
        }

        /**
         * Seleziona metodo di pagamento
         */
        function selectPaymentMethod(option) {
            console.log('Selezionato metodo pagamento:', option);

            selectedPaymentOption = option;

            // Rimuovi selezione da tutti i metodi E i loro badge
            document.querySelectorAll('.payment-option').forEach(opt => {
                opt.classList.remove('selected-payment');
                // Rimuovi badge "✓" se presente
                const badge = opt.querySelector('.payment-selected-check');
                if (badge) {
                    badge.remove();
                }
            });

            // Aggiungi classe al metodo selezionato
            const selectedElement = document.querySelector(`[data-payment-option="${option}"]`);
            if (selectedElement) {
                selectedElement.classList.add('selected-payment');

                // Aggiungi badge "✓" dinamicamente
                const existingBadge = selectedElement.querySelector('.payment-selected-check');
                if (!existingBadge) {
                    const badge = document.createElement('div');
                    badge.className = 'payment-selected-check';
                    badge.textContent = '✓';
                    selectedElement.appendChild(badge);
                }
            }

            // Ricalcola totale con sconto
            recalculateTotal();

            // Mostra pulsante accetta
            showAcceptButton();

            // Salva selezione nel database via AJAX
            savePaymentSelection(option);
        }

        /**
         * Ricalcola il totale in base alle selezioni
         */
        function recalculateTotal() {
            if (!selectedPackagePrice) return;

            let subtotal = selectedPackagePrice;
            let discountPercent = 0;
            let discountAmount = 0;

            // Calcola sconto se è stato selezionato un metodo di pagamento
            if (selectedPaymentOption && paymentDiscounts[selectedPaymentOption]) {
                discountPercent = paymentDiscounts[selectedPaymentOption];
                discountAmount = (subtotal * discountPercent) / 100;
            }

            const subtotalAfterDiscount = subtotal - discountAmount;
            const ivaAmount = (subtotalAfterDiscount * ivaRate) / 100;
            const total = subtotalAfterDiscount + ivaAmount;

            // Aggiorna DOM
            const subtotalEl = document.getElementById('summary-subtotal');
            const discountRowEl = document.getElementById('summary-discount-row');
            const discountEl = document.getElementById('summary-discount');
            const ivaEl = document.getElementById('summary-iva');
            const totalEl = document.getElementById('summary-total');

            if (subtotalEl) subtotalEl.textContent = '€ ' + subtotal.toFixed(2).replace('.', ',');

            // Mostra/nascondi riga sconto
            if (discountAmount > 0 && discountRowEl && discountEl) {
                discountRowEl.style.display = 'flex';
                discountEl.textContent = '- € ' + discountAmount.toFixed(2).replace('.', ',') +
                                        ' (' + discountPercent.toFixed(0) + '%)';
            } else if (discountRowEl) {
                discountRowEl.style.display = 'none';
            }

            if (ivaEl) ivaEl.textContent = '€ ' + ivaAmount.toFixed(2).replace('.', ',');
            if (totalEl) totalEl.textContent = '€ ' + total.toFixed(2).replace('.', ',');

            // Aggiorna i prezzi mensili per tutte le opzioni di pagamento
            updateMonthlyPrices(total);

            console.log('Totale ricalcolato:', {
                subtotal,
                discountPercent,
                discountAmount,
                subtotalAfterDiscount,
                ivaAmount,
                total
            });
        }

        /**
         * Aggiorna i prezzi mensili per ogni opzione di pagamento
         */
        function updateMonthlyPrices(totalWithIva) {
            document.querySelectorAll('.payment-option').forEach(option => {
                const installments = parseInt(option.getAttribute('data-installments') || 1);
                const paymentKey = option.getAttribute('data-payment-option');
                const monthlyPriceDiv = option.querySelector('.payment-monthly-price');
                const monthlyAmountSpan = option.querySelector('.monthly-amount');
                const monthlyDurationSpan = option.querySelector('.monthly-duration');

                if (!monthlyPriceDiv || !monthlyAmountSpan || !monthlyDurationSpan) return;

                // Calcola il totale con lo sconto specifico per questa opzione
                let optionTotal = totalWithIva;

                // Se c'è un pacchetto selezionato, calcola il prezzo con lo sconto specifico
                if (selectedPackagePrice) {
                    const discountPercent = paymentDiscounts[paymentKey] || 0;
                    const subtotal = selectedPackagePrice;
                    const discountAmount = (subtotal * discountPercent) / 100;
                    const subtotalAfterDiscount = subtotal - discountAmount;
                    const ivaAmount = (subtotalAfterDiscount * ivaRate) / 100;
                    optionTotal = subtotalAfterDiscount + ivaAmount;
                }

                if (installments > 1) {
                    // Calcola il prezzo mensile
                    const monthlyPrice = optionTotal / installments;

                    // Mostra il prezzo mensile
                    monthlyPriceDiv.style.display = 'block';
                    monthlyAmountSpan.textContent = '€ ' + monthlyPrice.toFixed(2).replace('.', ',') + '/mese';
                    monthlyDurationSpan.textContent = installments;
                } else {
                    // Per pagamento unico, mostra il totale
                    monthlyPriceDiv.style.display = 'block';
                    monthlyAmountSpan.textContent = '€ ' + optionTotal.toFixed(2).replace('.', ',');
                    monthlyDurationSpan.parentElement.style.display = 'none';
                }
            });
        }

        /**
         * Mostra pulsante di accettazione
         */
        function showAcceptButton() {
            const acceptButton = document.getElementById('accept-button');
            if (acceptButton) {
                acceptButton.style.display = 'block';
                acceptButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        /**
         * Salva selezione pacchetto nel database
         */
        function savePackageSelection(packageId) {
            fetch('preventivo.php?action=save_package_selection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    quote_id: <?= $quote['id'] ?>,
                    package_id: packageId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Pacchetto salvato con successo');
                } else {
                    console.error('Errore nel salvataggio:', data.error);
                }
            })
            .catch(error => {
                console.error('Errore AJAX:', error);
            });
        }

        /**
         * Salva selezione metodo pagamento nel database
         */
        function savePaymentSelection(option) {
            fetch('preventivo.php?action=save_payment_selection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    quote_id: <?= $quote['id'] ?>,
                    payment_option: option
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Metodo pagamento salvato con successo');
                } else {
                    console.error('Errore nel salvataggio:', data.error);
                }
            })
            .catch(error => {
                console.error('Errore AJAX:', error);
            });
        }

        // Inizializza al caricamento se c'è già un pacchetto selezionato
        document.addEventListener('DOMContentLoaded', function() {
            // Event delegation per selezione pacchetti
            document.querySelectorAll('.selectable-package').forEach(function(element) {
                element.addEventListener('click', function() {
                    const packageId = parseInt(this.getAttribute('data-package-id'));
                    const price = parseFloat(this.getAttribute('data-package-price'));
                    const name = this.getAttribute('data-package-name');
                    selectPackage(packageId, price, name);
                });
            });

            // Event delegation per selezione metodi di pagamento
            document.querySelectorAll('.payment-option').forEach(function(element) {
                element.addEventListener('click', function() {
                    const option = this.getAttribute('data-payment-option');
                    selectPaymentMethod(option);
                });
            });

            if (selectedPackageId) {
                // Evidenzia pacchetto già selezionato
                const selectedOption = document.querySelector(`[data-package-id="${selectedPackageId}"]`);
                if (selectedOption) {
                    selectedOption.classList.add('selected-package');
                }

                // Nascondi "A partire da" e mostra dettagliato
                const startingFromSection = document.getElementById('summary-starting-from');
                const detailedSummary = document.getElementById('summary-detailed');
                if (startingFromSection) startingFromSection.style.display = 'none';
                if (detailedSummary) detailedSummary.style.display = 'block';

                // Mostra sezione pagamento se abilitata
                if (enablePaymentDiscount) {
                    const paymentSection = document.getElementById('payment-method-section');
                    if (paymentSection) paymentSection.style.display = 'block';
                }
            }

            if (selectedPaymentOption) {
                // Evidenzia metodo pagamento già selezionato
                const selectedPayment = document.querySelector(`[data-payment-option="${selectedPaymentOption}"]`);
                if (selectedPayment) {
                    selectedPayment.classList.add('selected-payment');
                }

                // Mostra pulsante accetta
                showAcceptButton();
            }

            // Ricalcola totale iniziale se necessario
            if (selectedPackageId) {
                recalculateTotal();
            }
        });
    </script>
</body>
</html>
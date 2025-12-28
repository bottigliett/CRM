<?php
// File: /client-activation.php
// Pagina di attivazione account clienti CON VERIFICA EMAIL OBBLIGATORIA

// Avvia sessione
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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

$error = '';
$success = '';
$step = 'username'; // username, email_verify, password_setup
$accessData = null;

// Gestione invio codice verifica email
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    
    if ($_POST['action'] === 'send_verification_code') {
        $email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
        $accessId = (int)$_POST['access_id'];
        
        if (!$email) {
            echo json_encode(['success' => false, 'message' => 'Email non valida']);
            exit;
        }
        
        // Genera codice di verifica
        $code = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 minuti
        
        // Salva codice in sessione (per semplicità, in produzione usa il DB)
        $_SESSION['email_verification'] = [
            'code' => $code,
            'email' => $email,
            'expires' => $expiresAt,
            'access_id' => $accessId
        ];
        
        // Invia email con codice
        $subject = "🔐 Codice di Verifica - Studio Mismo";
        $message = "
        <html>
        <body style='font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px;'>
            <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>
                <h2 style='color: #37352f; text-align: center; margin-bottom: 30px;'>Verifica la tua Email</h2>
                <p style='font-size: 16px; color: #333; margin-bottom: 20px;'>
                    Il tuo codice di verifica è:
                </p>
                <div style='background: #f7f7f5; border: 2px dashed #37352f; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;'>
                    <span style='font-size: 36px; font-weight: bold; color: #37352f; letter-spacing: 5px;'>{$code}</span>
                </div>
                <p style='color: #666; font-size: 14px; text-align: center;'>
                    <strong>Questo codice scade tra 10 minuti.</strong>
                </p>
                <hr style='margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;'>
                <p style='font-size: 12px; color: #9ca3af; text-align: center;'>
                    Studio Mismo - Via Esempio 123, Verona<br>
                    Se non hai richiesto questo codice, ignora questa email.
                </p>
            </div>
        </body>
        </html>";
        
        $headers = [
            'From: Studio Mismo <noreply@studiomismo.it>',
            'Reply-To: info@studiomismo.it',
            'Content-Type: text/html; charset=UTF-8',
            'MIME-Version: 1.0'
        ];
        
        if (mail($email, $subject, $message, implode("\r\n", $headers))) {
            echo json_encode(['success' => true, 'message' => 'Codice inviato']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Errore invio email']);
        }
        exit;
    }
    
    if ($_POST['action'] === 'verify_code') {
        $inputCode = $_POST['verification_code'];
        $sessionData = $_SESSION['email_verification'] ?? null;
        
        if (!$sessionData) {
            echo json_encode(['success' => false, 'message' => 'Sessione scaduta']);
            exit;
        }
        
        if (strtotime($sessionData['expires']) < time()) {
            echo json_encode(['success' => false, 'message' => 'Codice scaduto']);
            exit;
        }
        
        if ($inputCode !== $sessionData['code']) {
            echo json_encode(['success' => false, 'message' => 'Codice non valido']);
            exit;
        }
        
        // Codice valido - salva email verificata
        $_SESSION['email_verified'] = true;
        $_SESSION['verified_email'] = $sessionData['email'];
        $_SESSION['verified_access_id'] = $sessionData['access_id'];
        
        echo json_encode(['success' => true, 'message' => 'Email verificata']);
        exit;
    }
}

// Gestione form principale
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['action'])) {
    
    // Step 1: Verifica username
    if (isset($_POST['check_username'])) {
        $username = trim($_POST['username']);
        
        if (!empty($username)) {
            $stmt = $pdo->prepare("
                SELECT ca.*, lc.name as contact_name, lc.email as contact_email
                FROM client_access ca
                INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
                WHERE ca.username = ? 
                AND ca.password_hash IS NULL
            ");
            $stmt->execute([$username]);
            $accessData = $stmt->fetch();
            
            if ($accessData) {
                $_SESSION['activation_access_id'] = $accessData['id'];
                $_SESSION['activation_username'] = $username;
                $step = 'email_verify';
            } else {
                $error = 'Username non trovato o già attivato.';
            }
        }
    }
    
    // Step 3: Setup password finale
    if (isset($_POST['setup_password']) && $_SESSION['email_verified']) {
        $password = $_POST['password'];
        $confirmPassword = $_POST['confirm_password'];
        $accessId = $_SESSION['verified_access_id'];
        $verifiedEmail = $_SESSION['verified_email'];
        
        try {
            if (strlen($password) < 8) {
                throw new Exception('La password deve essere di almeno 8 caratteri');
            }
            
            if ($password !== $confirmPassword) {
                throw new Exception('Le password non coincidono');
            }
            
            // Hash password
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            
            // Aggiorna account
            $stmt = $pdo->prepare("
                UPDATE client_access 
                SET password_hash = ?,
                    email_verified = 1,
                    activation_token = NULL,
                    activation_expires = NULL,
                    is_active = 1
                WHERE id = ?
            ");
            $stmt->execute([$passwordHash, $accessId]);
            
            // Aggiorna email del contatto
            $stmt = $pdo->prepare("
                UPDATE leads_contacts lc
                INNER JOIN client_access ca ON ca.contact_id = lc.id
                SET lc.email = ?
                WHERE ca.id = ?
            ");
            $stmt->execute([$verifiedEmail, $accessId]);
            
            // Pulizia sessione
            unset($_SESSION['email_verification']);
            unset($_SESSION['email_verified']);
            unset($_SESSION['verified_email']);
            unset($_SESSION['verified_access_id']);
            unset($_SESSION['activation_access_id']);
            unset($_SESSION['activation_username']);
            
            $success = 'Account attivato con successo! Ora puoi effettuare il login.';
            $step = 'completed';
            
        } catch (Exception $e) {
            $error = $e->getMessage();
        }
    }
}

// Verifica token da URL (link diretto)
$token = $_GET['token'] ?? '';
if (!empty($token) && $step === 'username') {
    $stmt = $pdo->prepare("
        SELECT ca.*, lc.name as contact_name, lc.email as contact_email
        FROM client_access ca
        INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
        WHERE ca.activation_token = ? 
        AND ca.activation_expires > NOW()
        AND ca.password_hash IS NULL
    ");
    $stmt->execute([$token]);
    $accessData = $stmt->fetch();
    
    if ($accessData) {
        $_SESSION['activation_access_id'] = $accessData['id'];
        $_SESSION['activation_username'] = $accessData['username'];
        $step = 'email_verify';
    }
}

// Recupera dati se in sessione
if (isset($_SESSION['activation_access_id']) && !$accessData) {
    $stmt = $pdo->prepare("
        SELECT ca.*, lc.name as contact_name, lc.email as contact_email
        FROM client_access ca
        INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
        WHERE ca.id = ?
    ");
    $stmt->execute([$_SESSION['activation_access_id']]);
    $accessData = $stmt->fetch();
}

// Se email già verificata, vai allo step password
if (isset($_SESSION['email_verified']) && $_SESSION['email_verified']) {
    $step = 'password_setup';
}
?>

<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attivazione Account - CRM Studio Mismo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
            background: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #37352f;
            font-size: 14px;
        }
        
        .activation-container {
            background: #ffffff;
            border-radius: 6px;
            border: 1px solid #e9e9e7;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 480px;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 3px;
            background: #f7f7f5;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            background: #37352f;
            transition: width 0.3s ease;
        }
        
        .activation-header {
            padding: 32px;
            text-align: center;
            border-bottom: 1px solid #e9e9e7;
        }
        
        .activation-title {
            font-size: 24px;
            font-weight: 700;
            color: #37352f;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        
        .activation-subtitle {
            font-size: 14px;
            color: #787774;
        }
        
        .activation-body {
            padding: 32px;
        }
        
        .step-indicator {
            display: flex;
            justify-content: space-between;
            margin-bottom: 32px;
            padding: 0 20px;
        }
        
        .step {
            flex: 1;
            text-align: center;
            position: relative;
        }
        
        .step:not(:last-child)::after {
            content: '';
            position: absolute;
            top: 15px;
            left: 50%;
            width: 100%;
            height: 1px;
            background: #e9e9e7;
        }
        
        .step.active::after {
            background: #37352f;
        }
        
        .step-number {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #f7f7f5;
            color: #787774;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 14px;
            position: relative;
            z-index: 1;
            border: 1px solid #e9e9e7;
        }
        
        .step.active .step-number {
            background: #37352f;
            color: white;
            border-color: #37352f;
        }
        
        .step.completed .step-number {
            background: #37352f;
            color: white;
            border-color: #37352f;
        }
        
        .step.completed .step-number::after {
            content: '✓';
            position: absolute;
            font-size: 12px;
        }
        
        .step-label {
            font-size: 12px;
            color: #787774;
            margin-top: 8px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #37352f;
            margin-bottom: 6px;
        }
        
        .form-control {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d3d3d1;
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
            background: #ffffff;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        
        .form-control:focus {
            outline: none;
            border-color: #37352f;
            box-shadow: 0 0 0 1px #37352f;
        }
        
        .form-hint {
            display: block;
            margin-top: 4px;
            font-size: 12px;
            color: #787774;
        }
        
        .verification-input {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin: 24px 0;
        }
        
        .verification-input input {
            width: 45px;
            height: 50px;
            text-align: center;
            font-size: 20px;
            font-weight: 600;
            border: 1px solid #d3d3d1;
            border-radius: 4px;
            background: #ffffff;
            transition: all 0.15s ease;
        }
        
        .verification-input input:focus {
            border-color: #37352f;
            outline: none;
            box-shadow: 0 0 0 1px #37352f;
        }
        
        .btn {
            width: 100%;
            background: #37352f;
            color: #ffffff;
            border: none;
            padding: 10px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn:hover {
            background: #2f2e29;
        }
        
        .btn:disabled {
            background: #787774;
            cursor: not-allowed;
        }
        
        .btn-secondary {
            background: #f7f7f5;
            color: #37352f;
            border: 1px solid #e9e9e7;
        }
        
        .btn-secondary:hover {
            background: #f1f1ef;
            border-color: #d3d3d1;
        }
        
        .alert {
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 16px;
            font-size: 14px;
            border: 1px solid;
        }
        
        .alert-error {
            background: #fdf2f2;
            color: #d73502;
            border-color: #fed7d7;
        }
        
        .alert-success {
            background: #f7f7f5;
            color: #37352f;
            border-color: #e9e9e7;
        }
        
        .alert-info {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            color: #0c4a6e;
        }
        
        .resend-link {
            text-align: center;
            margin-top: 16px;
        }
        
        .resend-link button {
            background: none;
            border: none;
            color: #37352f;
            text-decoration: underline;
            cursor: pointer;
            font-size: 13px;
            transition: color 0.15s ease;
        }
        
        .resend-link button:hover {
            color: #787774;
        }
        
        .resend-link button:disabled {
            color: #d3d3d1;
            cursor: not-allowed;
            text-decoration: none;
        }
        
        .timer {
            color: #787774;
            font-size: 13px;
            text-align: center;
            margin-top: 12px;
        }
        
        .password-strength {
            display: flex;
            gap: 4px;
            margin-top: 8px;
        }
        
        .strength-bar {
            flex: 1;
            height: 3px;
            background: #e9e9e7;
            border-radius: 2px;
            transition: background 0.2s ease;
        }
        
        .strength-bar.active {
            background: #37352f;
        }
        
        .loading {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 1.5px solid transparent;
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .success-container {
            text-align: center;
            padding: 32px 0;
        }
        
        .success-icon {
            font-size: 64px;
            margin-bottom: 24px;
        }
        
        .success-text {
            font-size: 16px;
            color: #37352f;
            margin-bottom: 32px;
            line-height: 1.5;
        }
        
        .back-link {
            text-align: center;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid #e9e9e7;
        }
        
        .back-link a {
            color: #787774;
            text-decoration: none;
            font-size: 13px;
            transition: color 0.15s ease;
        }
        
        .back-link a:hover {
            color: #37352f;
            text-decoration: underline;
        }
        
        @media (max-width: 480px) {
            .activation-container {
                border-radius: 0;
                border: none;
            }
            
            .activation-header,
            .activation-body {
                padding: 24px;
            }
            
            .step-indicator {
                padding: 0 10px;
            }
        }
    </style>
</head>
<body>
    <div class="activation-container">
        <!-- Progress Bar -->
        <div class="progress-bar">
            <div class="progress-fill" style="width: <?= $step === 'username' ? '33%' : ($step === 'email_verify' ? '66%' : ($step === 'password_setup' ? '90%' : '100%')) ?>"></div>
        </div>
        
        <div class="activation-header">
            <h1 class="activation-title">
                <?= $step === 'completed' ? '✅ Account Attivato!' : '🔐 Attivazione Account' ?>
            </h1>
            <p class="activation-subtitle">
                <?= $step === 'completed' ? 'Il tuo account è pronto per l\'uso' : 'Completa i passaggi per attivare il tuo account' ?>
            </p>
        </div>
        
        <div class="activation-body">
            <!-- Step Indicators -->
            <?php if ($step !== 'completed'): ?>
            <div class="step-indicator">
                <div class="step <?= in_array($step, ['username', 'email_verify', 'password_setup']) ? 'active' : '' ?> <?= in_array($step, ['email_verify', 'password_setup']) ? 'completed' : '' ?>">
                    <div class="step-number">1</div>
                    <div class="step-label">Username</div>
                </div>
                <div class="step <?= in_array($step, ['email_verify', 'password_setup']) ? 'active' : '' ?> <?= $step === 'password_setup' ? 'completed' : '' ?>">
                    <div class="step-number">2</div>
                    <div class="step-label">Verifica Email</div>
                </div>
                <div class="step <?= $step === 'password_setup' ? 'active' : '' ?>">
                    <div class="step-number">3</div>
                    <div class="step-label">Password</div>
                </div>
            </div>
            <?php endif; ?>
            
            <?php if ($error): ?>
                <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
            <?php endif; ?>
            
            <!-- Step 1: Username -->
            <?php if ($step === 'username'): ?>
            <form method="POST">
                <div class="form-group">
                    <label class="form-label">Inserisci il tuo username</label>
                    <input type="text" name="username" class="form-control" required 
                           placeholder="Il tuo username" autofocus>
                    <small class="form-hint">L'username che ti è stato fornito dal nostro team</small>
                </div>
                <button type="submit" name="check_username" value="1" class="btn">
                    Continua →
                </button>
            </form>
            <?php endif; ?>
            
            <!-- Step 2: Email Verification -->
            <?php if ($step === 'email_verify' && $accessData): ?>
            <div class="alert alert-info">
                👋 Ciao <?= htmlspecialchars($accessData['contact_name']) ?>! Verifica la tua email per continuare.
            </div>
            
            <form id="emailForm">
                <div class="form-group">
                    <label class="form-label">Email *</label>
                    <input type="email" id="email" class="form-control" required 
                           value="<?= htmlspecialchars($accessData['contact_email']) ?>"
                           placeholder="tua@email.com">
                    <small class="form-hint">Inserisci la tua email per ricevere il codice di verifica</small>
                </div>
                <button type="button" onclick="sendVerificationCode()" class="btn" id="sendCodeBtn">
                    Invia Codice di Verifica
                </button>
            </form>
            
            <div id="verificationSection" style="display: none; margin-top: 24px;">
                <div class="alert alert-success">
                    📧 Abbiamo inviato un codice di verifica alla tua email
                </div>
                
                <div class="form-group">
                    <label class="form-label">Inserisci il codice a 6 cifre</label>
                    <div class="verification-input">
                        <input type="text" maxlength="1" id="code1" oninput="moveToNext(this, 'code2')">
                        <input type="text" maxlength="1" id="code2" oninput="moveToNext(this, 'code3')">
                        <input type="text" maxlength="1" id="code3" oninput="moveToNext(this, 'code4')">
                        <input type="text" maxlength="1" id="code4" oninput="moveToNext(this, 'code5')">
                        <input type="text" maxlength="1" id="code5" oninput="moveToNext(this, 'code6')">
                        <input type="text" maxlength="1" id="code6" oninput="verifyCode()">
                    </div>
                </div>
                
                <div class="timer" id="timer">Il codice scade tra: <span id="countdown">10:00</span></div>
                
                <div class="resend-link">
                    <button onclick="sendVerificationCode()" id="resendBtn" disabled>
                        Reinvia codice
                    </button>
                </div>
            </div>
            <?php endif; ?>
            
            <!-- Step 3: Password Setup -->
            <?php if ($step === 'password_setup'): ?>
            <div class="alert alert-success">
                ✅ Email verificata! Ora crea la tua password.
            </div>
            
            <form method="POST">
                <div class="form-group">
                    <label class="form-label">Password *</label>
                    <input type="password" name="password" id="password" class="form-control" 
                           required minlength="8" placeholder="Minimo 8 caratteri">
                    <div class="password-strength" id="passwordStrength">
                        <div class="strength-bar"></div>
                        <div class="strength-bar"></div>
                        <div class="strength-bar"></div>
                        <div class="strength-bar"></div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Conferma Password *</label>
                    <input type="password" name="confirm_password" class="form-control" 
                           required placeholder="Ripeti la password">
                </div>
                
                <button type="submit" name="setup_password" value="1" class="btn">
                    🔐 Attiva Account
                </button>
            </form>
            <?php endif; ?>
            
            <!-- Completed -->
            <?php if ($step === 'completed'): ?>
            <div class="success-container">
                <div class="success-icon">🎉</div>
                <p class="success-text">
                    Il tuo account è stato attivato con successo!<br>
                    Ora puoi accedere con le tue credenziali.
                </p>
                <a href="/" class="btn">Vai al Login</a>
            </div>
            <?php endif; ?>
            
            <div class="back-link">
                <a href="/">← Torna al login</a>
            </div>
        </div>
    </div>
    
    <script>
        let timerInterval;
        let secondsLeft = 600; // 10 minuti
        
        function sendVerificationCode() {
            const email = document.getElementById('email').value;
            const accessId = <?= json_encode($accessData['id'] ?? 0) ?>;
            
            if (!email) {
                alert('Inserisci un\'email valida');
                return;
            }
            
            const sendBtn = document.getElementById('sendCodeBtn');
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<span class="loading"></span> Invio...';
            
            fetch('', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `action=send_verification_code&email=${email}&access_id=${accessId}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('verificationSection').style.display = 'block';
                    document.getElementById('emailForm').style.display = 'none';
                    startTimer();
                } else {
                    alert(data.message);
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = 'Invia Codice di Verifica';
                }
            });
        }
        
        function moveToNext(current, nextId) {
            if (current.value.length === 1 && nextId) {
                document.getElementById(nextId).focus();
            }
        }
        
        function verifyCode() {
            const code = ['code1', 'code2', 'code3', 'code4', 'code5', 'code6']
                .map(id => document.getElementById(id).value)
                .join('');
            
            if (code.length !== 6) return;
            
            fetch('', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `action=verify_code&verification_code=${code}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Ricarica la pagina per andare allo step successivo
                    window.location.reload();
                } else {
                    alert(data.message);
                    // Reset inputs
                    ['code1', 'code2', 'code3', 'code4', 'code5', 'code6'].forEach(id => {
                        document.getElementById(id).value = '';
                    });
                    document.getElementById('code1').focus();
                }
            });
        }
        
        function startTimer() {
            timerInterval = setInterval(() => {
                secondsLeft--;
                const minutes = Math.floor(secondsLeft / 60);
                const seconds = secondsLeft % 60;
                document.getElementById('countdown').textContent = 
                    `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                if (secondsLeft <= 0) {
                    clearInterval(timerInterval);
                    document.getElementById('resendBtn').disabled = false;
                    document.getElementById('timer').textContent = 'Codice scaduto';
                }
            }, 1000);
        }
        
        // Password strength checker
        document.getElementById('password')?.addEventListener('input', function(e) {
            const password = e.target.value;
            const bars = document.querySelectorAll('.strength-bar');
            let strength = 0;
            
            if (password.length >= 8) strength++;
            if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
            if (password.match(/[0-9]/)) strength++;
            if (password.match(/[^a-zA-Z0-9]/)) strength++;
            
            bars.forEach((bar, index) => {
                bar.classList.toggle('active', index < strength);
            });
        });
        
        // Handle paste for verification codes
        document.getElementById('code1')?.addEventListener('paste', function(e) {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const digits = paste.replace(/\D/g, '').substring(0, 6);
            
            if (digits.length === 6) {
                ['code1', 'code2', 'code3', 'code4', 'code5', 'code6'].forEach((id, index) => {
                    document.getElementById(id).value = digits[index];
                });
                verifyCode();
            }
        });
    </script>
</body>
</html>
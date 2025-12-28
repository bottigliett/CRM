<?php
// File: /client-password-reset.php
// Sistema recupero password per clienti

// Headers anti-cache
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

session_start();

// Connessione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die('Errore connessione database');
}

$error = '';
$success = '';
$step = 'email'; // email, reset

// Gestione invio email reset
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['send_reset'])) {
    $email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
    
    // Debug temporaneo (rimuovi dopo il test)
    error_log("Reset password attempt for email: " . $email);
    
    if (!$email) {
        $error = 'Email non valida';
    } else {
        // Cerca cliente con questa email
        $stmt = $pdo->prepare("
            SELECT ca.*, lc.name, lc.email
            FROM client_access ca
            INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
            WHERE lc.email = ? AND ca.is_active = 1 AND ca.password_hash IS NOT NULL
        ");
        $stmt->execute([$email]);
        $client = $stmt->fetch();
        
        // Debug temporaneo
        error_log("Client found: " . ($client ? "YES - ID: " . $client['id'] : "NO"));
        
        if ($client) {
            // Genera token reset
            $resetToken = bin2hex(random_bytes(32));
            $resetExpires = date('Y-m-d H:i:s', time() + 3600); // 1 ora
            
            // Salva token
            $stmt = $pdo->prepare("
                UPDATE client_access 
                SET password_reset_token = ?, password_reset_expires = ?
                WHERE id = ?
            ");
            $stmt->execute([$resetToken, $resetExpires, $client['id']]);
            
            // Invia email
            $resetLink = "https://portale.studiomismo.it/client-password-reset.php?token=" . $resetToken;
            
            $subject = "Reset Password - Studio Mismo";
            $message = "
            <html>
            <body style='font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px;'>
                <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;'>
                    <h2 style='color: #3b82f6;'>Reset Password</h2>
                    <p>Ciao {$client['name']},</p>
                    <p>Hai richiesto di reimpostare la tua password. Clicca il link qui sotto:</p>
                    <a href='{$resetLink}' style='display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0;'>
                        Reset Password
                    </a>
                    <p style='color: #666; font-size: 14px;'>Questo link scade tra 1 ora.</p>
                    <p style='color: #666; font-size: 14px;'>Se non hai richiesto il reset, ignora questa email.</p>
                </div>
            </body>
            </html>";
            
            $headers = [
                'From: Studio Mismo <noreply@studiomismo.it>',
                'Reply-To: info@studiomismo.it',
                'Content-Type: text/html; charset=UTF-8',
                'MIME-Version: 1.0',
                'X-Mailer: PHP/' . phpversion()
            ];
            
            // Invia email
            $mailSent = @mail($email, $subject, $message, implode("\r\n", $headers));
            
            // Debug temporaneo
            error_log("Mail sent: " . ($mailSent ? "YES" : "NO"));
            
            if ($mailSent) {
                $success = 'Email di reset inviata! Controlla la tua casella di posta.';
            } else {
                // Prova con configurazione più semplice
                $simpleHeaders = "From: noreply@studiomismo.it\r\nContent-Type: text/html; charset=UTF-8";
                $mailSent2 = @mail($email, $subject, $message, $simpleHeaders);
                
                if ($mailSent2) {
                    $success = 'Email di reset inviata! Controlla la tua casella di posta.';
                } else {
                    $error = 'Errore durante l\'invio dell\'email. Riprova più tardi.';
                    error_log("Mail error - Check server mail configuration");
                }
            }
        } else {
            $error = 'Email non trovata nel sistema o account non attivo.';
        }
    }
}

// Gestione reset password con token
$token = $_GET['token'] ?? '';
if ($token) {
    $stmt = $pdo->prepare("
        SELECT * FROM client_access 
        WHERE password_reset_token = ? 
        AND password_reset_expires > NOW()
    ");
    $stmt->execute([$token]);
    $resetClient = $stmt->fetch();
    
    if ($resetClient) {
        $step = 'reset';
        
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['reset_password'])) {
            $newPassword = $_POST['new_password'];
            $confirmPassword = $_POST['confirm_password'];
            
            if (strlen($newPassword) < 8) {
                $error = 'La password deve essere di almeno 8 caratteri';
            } elseif ($newPassword !== $confirmPassword) {
                $error = 'Le password non coincidono';
            } else {
                // Aggiorna password
                $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
                
                $stmt = $pdo->prepare("
                    UPDATE client_access 
                    SET password_hash = ?, 
                        password_reset_token = NULL,
                        password_reset_expires = NULL
                    WHERE id = ?
                ");
                $stmt->execute([$passwordHash, $resetClient['id']]);
                
                $success = 'Password reimpostata con successo! Ora puoi fare login.';
                $step = 'completed';
            }
        }
    } else {
        $error = 'Link di reset non valido o scaduto';
    }
}
?>

<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recupero Password - Studio Mismo</title>
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
        
        .reset-container {
            background: #ffffff;
            border-radius: 6px;
            border: 1px solid #e9e9e7;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 420px;
            padding: 40px;
        }
        
        .reset-header {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .reset-title {
            font-size: 24px;
            font-weight: 700;
            color: #37352f;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        
        .reset-subtitle {
            font-size: 14px;
            color: #787774;
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
        
        .btn-primary {
            background: #37352f;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2f2e29;
        }
        
        .alert {
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 16px;
            font-size: 14px;
            border: 1px solid;
        }
        
        .alert-danger {
            background: #fdf2f2;
            color: #d73502;
            border-color: #fed7d7;
        }
        
        .alert-success {
            background: #f7f7f5;
            color: #37352f;
            border-color: #e9e9e7;
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
        
        .success-icon {
            font-size: 64px;
            text-align: center;
            margin-bottom: 24px;
        }
        
        .success-text {
            margin-bottom: 24px;
            color: #787774;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .info-box {
            background: #f7f7f5;
            border: 1px solid #e9e9e7;
            border-radius: 4px;
            padding: 16px;
            margin-bottom: 20px;
        }
        
        .info-box h4 {
            margin: 0 0 8px 0;
            color: #37352f;
            font-size: 15px;
            font-weight: 600;
        }
        
        .info-box p {
            margin: 0;
            color: #787774;
            font-size: 13px;
            line-height: 1.4;
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
        
        .spinner {
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
        
        @media (max-width: 480px) {
            .reset-container {
                padding: 24px;
                border-radius: 0;
                border: none;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="reset-container">
        <div class="reset-header">
            <h1 class="reset-title">
                <?= $step === 'completed' ? '✅ Password Reimpostata!' : '🔐 Recupero Password' ?>
            </h1>
            <p class="reset-subtitle">
                <?= $step === 'completed' ? 'La tua password è stata aggiornata' : 'Reimposta la password del tuo account' ?>
            </p>
        </div>
        
        <?php if ($error): ?>
            <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        
        <?php if ($success): ?>
            <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
        <?php endif; ?>
        
        <?php if ($step === 'email'): ?>
        
        <?php if (!$success): ?>
        <div class="info-box">
            <h4>📧 Come funziona?</h4>
            <p>Inserisci l'email associata al tuo account. Ti invieremo un link per reimpostare la password.</p>
        </div>
        <?php endif; ?>
        
        <form method="POST">
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" name="email" class="form-control" required 
                       placeholder="tua@email.com" autofocus>
                <small class="form-hint">L'email associata al tuo account</small>
            </div>
            
            <button type="submit" name="send_reset" value="1" class="btn btn-primary">
                Invia Link di Reset
            </button>
        </form>
        
        <?php elseif ($step === 'reset'): ?>
        
        <div class="info-box">
            <h4>🔒 Crea una nuova password</h4>
            <p>La password deve contenere almeno 8 caratteri. Ti consigliamo di usare una combinazione di lettere, numeri e simboli.</p>
        </div>
        
        <form method="POST">
            <div class="form-group">
                <label class="form-label">Nuova Password</label>
                <input type="password" name="new_password" id="password" class="form-control" 
                       required minlength="8" placeholder="Minimo 8 caratteri" autofocus>
                <div class="password-strength" id="passwordStrength">
                    <div class="strength-bar"></div>
                    <div class="strength-bar"></div>
                    <div class="strength-bar"></div>
                    <div class="strength-bar"></div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Conferma Password</label>
                <input type="password" name="confirm_password" class="form-control" 
                       required placeholder="Ripeti la password">
            </div>
            
            <button type="submit" name="reset_password" value="1" class="btn btn-primary">
                Reimposta Password
            </button>
        </form>
        
        <?php elseif ($step === 'completed'): ?>
        <div style="text-align: center;">
            <div class="success-icon">🎉</div>
            <p class="success-text">
                La tua password è stata reimpostata con successo!<br>
                Ora puoi accedere con le tue nuove credenziali.
            </p>
            <a href="/" class="btn btn-primary">Vai al Login</a>
        </div>
        <?php endif; ?>
        
        <div class="back-link">
            <a href="/">← Torna al Login</a>
        </div>
    </div>
    
    <script>
        // Password strength checker
        document.getElementById('password')?.addEventListener('input', function(e) {
            const password = e.target.value;
            const bars = document.querySelectorAll('.strength-bar');
            let strength = 0;
            
            // Check password strength
            if (password.length >= 8) strength++;
            if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
            if (password.match(/[0-9]/)) strength++;
            if (password.match(/[^a-zA-Z0-9]/)) strength++;
            
            // Update visual indicators
            bars.forEach((bar, index) => {
                bar.classList.toggle('active', index < strength);
            });
        });
        
        // Auto-focus first input
        window.addEventListener('load', function() {
            const firstInput = document.querySelector('input[type="email"], input[type="password"]');
            if (firstInput) {
                firstInput.focus();
            }
        });
    </script>
</body>
</html>
<?php
// File: /core/auth/reset_password.php
// Pagina reset password per CRM Studio Mismo

require_once __DIR__ . '/../config/database.php';

$token = $_GET['token'] ?? '';
$validToken = false;
$expired = false;
$userEmail = '';

if (!empty($token)) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            SELECT email, expires_at, used 
            FROM password_resets 
            WHERE token = ?
        ");
        $stmt->execute([$token]);
        $resetData = $stmt->fetch();
        
        if ($resetData) {
            if ($resetData['used']) {
                $expired = true;
            } elseif (strtotime($resetData['expires_at']) < time()) {
                $expired = true;
            } else {
                $validToken = true;
                $userEmail = $resetData['email'];
            }
        }
    } catch (Exception $e) {
        error_log("Reset password validation error: " . $e->getMessage());
    }
}

// Handle form submission
$successMessage = '';
$errorMessage = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $validToken) {
    $newPassword = $_POST['new_password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    
    if (empty($newPassword) || empty($confirmPassword)) {
        $errorMessage = 'Tutti i campi sono obbligatori';
    } elseif (strlen($newPassword) < PASSWORD_MIN_LENGTH) {
        $errorMessage = 'La password deve essere di almeno ' . PASSWORD_MIN_LENGTH . ' caratteri';
    } elseif ($newPassword !== $confirmPassword) {
        $errorMessage = 'Le password non coincidono';
    } else {
        try {
            $db = getDB();
            
            // Aggiorna password utente
            $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $db->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ?");
            $stmt->execute([$passwordHash, $userEmail]);
            
            // Marca il token come usato
            $stmt = $db->prepare("UPDATE password_resets SET used = 1 WHERE token = ?");
            $stmt->execute([$token]);
            
            // Rimuovi tutte le sessioni dell'utente per sicurezza
            $stmt = $db->prepare("
                DELETE s FROM user_sessions s 
                JOIN users u ON s.user_id = u.id 
                WHERE u.email = ?
            ");
            $stmt->execute([$userEmail]);
            
            // Log dell'azione
            $stmt = $db->prepare("SELECT id, username FROM users WHERE email = ?");
            $stmt->execute([$userEmail]);
            $user = $stmt->fetch();
            
            if ($user) {
                logAccess($user['id'], $user['username'], 'password_reset', 'success', 'Password reset completed');
            }
            
            $successMessage = 'Password aggiornata con successo! Ora puoi effettuare il login.';
            
        } catch (Exception $e) {
            error_log("Reset password error: " . $e->getMessage());
            $errorMessage = 'Errore interno. Riprova più tardi.';
        }
    }
}
?>

<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - CRM Studio Mismo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter Tight', sans-serif;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1f2937;
        }

        .reset-container {
            background: white;
            padding: 2.5rem;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            width: 100%;
            max-width: 420px;
            position: relative;
            overflow: hidden;
        }

        .reset-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
        }

        .header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #22c55e;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 1.5rem;
            transition: color 0.2s ease;
        }

        .back-link:hover {
            color: #16a34a;
        }

        .logo h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #1f2937;
            letter-spacing: -0.025em;
            margin-bottom: 0.5rem;
        }

        .header p {
            color: #6b7280;
            font-size: 0.875rem;
            line-height: 1.6;
        }

        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            font-size: 0.875rem;
        }

        .alert-error {
            background: #fef2f2;
            color: #991b1b;
            border-left: 4px solid #ef4444;
        }

        .alert-success {
            background: #f0fdf4;
            color: #166534;
            border-left: 4px solid #22c55e;
        }

        .alert-warning {
            background: #fffbeb;
            color: #992f00;
            border-left: 4px solid #f59e0b;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            font-weight: 500;
            color: #374151;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
        }

        .form-group input {
            width: 100%;
            padding: 0.875rem 1rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            background: #fafafa;
        }

        .form-group input:focus {
            outline: none;
            border-color: #22c55e;
            background: white;
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
        }

        .form-group small {
            display: block;
            margin-top: 0.25rem;
            font-size: 0.75rem;
            color: #6b7280;
        }

        .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            border: none;
            padding: 0.875rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.3);
        }

        .btn-submit:active {
            transform: translateY(0);
        }

        .btn-login {
            width: 100%;
            background: #6b7280;
            color: white;
            border: none;
            padding: 0.875rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            text-align: center;
            transition: all 0.2s ease;
        }

        .btn-login:hover {
            background: #4b5563;
            transform: translateY(-1px);
        }

        .error-state {
            text-align: center;
        }

        .error-icon {
            width: 64px;
            height: 64px;
            background: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            color: white;
            font-size: 1.5rem;
        }

        .success-state {
            text-align: center;
        }

        .success-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            color: white;
            font-size: 1.5rem;
        }

        .footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e5e7eb;
            font-size: 0.75rem;
            color: #6b7280;
        }

        @media (max-width: 480px) {
            .reset-container {
                margin: 1rem;
                padding: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="reset-container">
        <a href="/index.php" class="back-link">
            ← Torna al login
        </a>

        <?php if (!$validToken): ?>
            <div class="error-state">
                <div class="error-icon">
                    ✕
                </div>
                <h2>Token non valido</h2>
                <p>Il link di reset password non è valido o è scaduto.</p>
                <?php if ($expired): ?>
                    <div class="alert alert-warning" style="margin-top: 1.5rem;">
                        Il token è scaduto o è già stato utilizzato. Richiedi un nuovo reset password.
                    </div>
                <?php endif; ?>
                <div style="margin-top: 2rem;">
                    <a href="/core/auth/forgot_password.php" class="btn-login">
                        Richiedi nuovo reset
                    </a>
                </div>
            </div>
        <?php elseif ($successMessage): ?>
            <div class="success-state">
                <div class="success-icon">
                    ✓
                </div>
                <h2>Password aggiornata!</h2>
                <p>La tua password è stata aggiornata con successo.</p>
                <div style="margin-top: 2rem;">
                    <a href="/index.php" class="btn-login">
                        Vai al Login
                    </a>
                </div>
            </div>
        <?php else: ?>
            <div class="header">
                <div class="logo">
                    <h1>Nuova Password</h1>
                </div>
                <p>Scegli una nuova password sicura per il tuo account</p>
            </div>

            <?php if ($errorMessage): ?>
            <div class="alert alert-error">
                <?= htmlspecialchars($errorMessage) ?>
            </div>
            <?php endif; ?>

            <form method="POST" id="resetForm">
                <div class="form-group">
                    <label for="new_password">Nuova Password</label>
                    <input type="password" id="new_password" name="new_password" 
                           minlength="<?= PASSWORD_MIN_LENGTH ?>" required 
                           placeholder="Inserisci la nuova password">
                    <small>Minimo <?= PASSWORD_MIN_LENGTH ?> caratteri</small>
                </div>

                <div class="form-group">
                    <label for="confirm_password">Conferma Password</label>
                    <input type="password" id="confirm_password" name="confirm_password" 
                           minlength="<?= PASSWORD_MIN_LENGTH ?>" required 
                           placeholder="Conferma la nuova password">
                </div>

                <button type="submit" class="btn-submit">
                    Aggiorna Password
                </button>
            </form>
        <?php endif; ?>

        <div class="footer">
            <p>&copy; 2025 Studio Mismo. Tutti i diritti riservati.</p>
        </div>
    </div>

    <script>
        // Password confirmation validation
        document.getElementById('confirm_password')?.addEventListener('input', function() {
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = this.value;
            
            if (newPassword !== confirmPassword) {
                this.setCustomValidity('Le password non coincidono');
            } else {
                this.setCustomValidity('');
            }
        });

        // Password strength indicator (basic)
        document.getElementById('new_password')?.addEventListener('input', function() {
            const password = this.value;
            const minLength = <?= PASSWORD_MIN_LENGTH ?>;
            
            if (password.length >= minLength) {
                this.style.borderColor = '#22c55e';
            } else {
                this.style.borderColor = '#e5e7eb';
            }
        });
    </script>
</body>
</html>
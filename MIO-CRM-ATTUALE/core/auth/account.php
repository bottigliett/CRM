<?php
// File: /core/auth/account.php
// Account page completa per CRM Studio Mismo - Stile Notion

// Avvia sessione
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verifica autenticazione
if (!isset($_SESSION['user_id']) || !isset($_SESSION['username'])) {
    header('Location: /index.php');
    exit;
}

// Include helper
require_once __DIR__ . '/../includes/email_2fa_helpers.php';

// Connessione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Ottieni dati utente corrente con campo email_verified
    $stmt = $pdo->prepare("
        SELECT id, username, email, email_verified, first_name, last_name, role, 
               profile_image, two_fa_enabled, two_fa_secret 
        FROM users WHERE id = ?
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $currentUser = $stmt->fetch();
    
    if (!$currentUser) {
        session_destroy();
        header('Location: /index.php');
        exit;
    }
    
} catch (Exception $e) {
    error_log("Account page error: " . $e->getMessage());
    die("Errore database: " . $e->getMessage());
}

// Variabili per gestire stato
$successMessage = '';
$errorMessage = '';
$showEmailVerification = false;
$pendingEmail = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    try {
        // ======== AGGIORNA PROFILO ========
        if ($action === 'update_profile') {
            $firstName = trim($_POST['first_name'] ?? '');
            $lastName = trim($_POST['last_name'] ?? '');
            $email = trim($_POST['email'] ?? '');
            
            if (empty($firstName) || empty($lastName) || empty($email)) {
                $errorMessage = 'Tutti i campi sono obbligatori';
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errorMessage = 'Email non valida';
            } else {
                // Se email è cambiata, richiedi verifica
                if ($email !== $currentUser['email']) {
                    // Verifica se email è già in uso
                    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
                    $stmt->execute([$email, $currentUser['id']]);
                    if ($stmt->fetch()) {
                        $errorMessage = 'Email già in uso da un altro utente';
                    } else {
                        // Invia codice verifica
                        if (sendVerificationEmail($currentUser['id'], $email)) {
                            $showEmailVerification = true;
                            $pendingEmail = $email;
                            $successMessage = 'Codice di verifica inviato alla nuova email';
                            
                            // Aggiorna solo nome e cognome per ora
                            $stmt = $pdo->prepare("UPDATE users SET first_name = ?, last_name = ?, updated_at = NOW() WHERE id = ?");
                            $stmt->execute([$firstName, $lastName, $currentUser['id']]);
                            
                            $currentUser['first_name'] = $firstName;
                            $currentUser['last_name'] = $lastName;
                        } else {
                            $errorMessage = 'Errore nell\'invio dell\'email di verifica';
                        }
                    }
                } else {
                    // Email non cambiata
                    $stmt = $pdo->prepare("UPDATE users SET first_name = ?, last_name = ?, updated_at = NOW() WHERE id = ?");
                    $stmt->execute([$firstName, $lastName, $currentUser['id']]);
                    
                    $successMessage = 'Profilo aggiornato con successo';
                    $currentUser['first_name'] = $firstName;
                    $currentUser['last_name'] = $lastName;
                }
            }
            
        // ======== VERIFICA EMAIL ========
        } elseif ($action === 'verify_email') {
            $email = trim($_POST['email'] ?? '');
            $code = trim($_POST['verification_code'] ?? '');
            
            if (empty($email) || empty($code)) {
                $errorMessage = 'Email e codice sono obbligatori';
            } elseif (verifyEmailCode($currentUser['id'], $email, $code)) {
                $successMessage = 'Email verificata e aggiornata con successo';
                $currentUser['email'] = $email;
                $currentUser['email_verified'] = 1;
            } else {
                $errorMessage = 'Codice di verifica non valido o scaduto';
                $showEmailVerification = true;
                $pendingEmail = $email;
            }
            
        // ======== CAMBIO PASSWORD ========
        } elseif ($action === 'change_password') {
            $currentPassword = $_POST['current_password'] ?? '';
            $newPassword = $_POST['new_password'] ?? '';
            $confirmPassword = $_POST['confirm_password'] ?? '';
            
            if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
                $errorMessage = 'Tutti i campi password sono obbligatori';
            } elseif ($newPassword !== $confirmPassword) {
                $errorMessage = 'Le nuove password non coincidono';
            } elseif (strlen($newPassword) < 8) {
                $errorMessage = 'La password deve essere di almeno 8 caratteri';
            } else {
                // Verifica password corrente
                $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
                $stmt->execute([$currentUser['id']]);
                $user = $stmt->fetch();
                
                if (!password_verify($currentPassword, $user['password_hash'])) {
                    $errorMessage = 'Password corrente non valida';
                } else {
                    // Aggiorna password
                    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
                    $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?");
                    $stmt->execute([$newPasswordHash, $currentUser['id']]);
                    
                    $successMessage = 'Password aggiornata con successo';
                }
            }
            
        // ======== UPLOAD AVATAR ========
        } elseif ($action === 'upload_avatar') {
            if (!isset($_FILES['avatar_file']) || $_FILES['avatar_file']['error'] !== UPLOAD_ERR_OK) {
                $errorMessage = 'Nessun file selezionato o errore nell\'upload';
            } else {
                $result = uploadAvatar($_FILES['avatar_file'], $currentUser['id']);
                if ($result['success']) {
                    $successMessage = 'Avatar aggiornato con successo';
                    $currentUser['profile_image'] = $result['path'];
                } else {
                    $errorMessage = $result['message'];
                }
            }
            
        // ======== ABILITA 2FA ========
        } elseif ($action === 'enable_2fa') {
            if (!$currentUser['two_fa_enabled']) {
                // Genera nuovo secret
                $secret = generate2FASecret();
                
                // Salva nel database
                $stmt = $pdo->prepare("UPDATE users SET two_fa_secret = ? WHERE id = ?");
                $stmt->execute([$secret, $currentUser['id']]);
                
                $currentUser['two_fa_secret'] = $secret;
                $successMessage = 'Secret 2FA generato. Scansiona il QR code e inserisci il codice per attivare.';
            }
            
        // ======== CONFERMA 2FA ========
        } elseif ($action === 'confirm_2fa') {
            $code = trim($_POST['2fa_code'] ?? '');
            
            if (empty($code)) {
                $errorMessage = 'Inserisci il codice dall\'app Authenticator';
            } elseif (!$currentUser['two_fa_secret']) {
                $errorMessage = 'Secret 2FA non configurato';
            } elseif (verify2FACode($currentUser['two_fa_secret'], $code)) {
                // Attiva 2FA
                $stmt = $pdo->prepare("UPDATE users SET two_fa_enabled = 1 WHERE id = ?");
                $stmt->execute([$currentUser['id']]);
                
                $currentUser['two_fa_enabled'] = 1;
                $successMessage = '2FA attivato con successo!';
            } else {
                $errorMessage = 'Codice 2FA non valido. Controlla l\'orario del dispositivo.';
            }
            
        // ======== DISABILITA 2FA ========
        } elseif ($action === 'disable_2fa') {
            $password = $_POST['password_confirm'] ?? '';
            
            if (empty($password)) {
                $errorMessage = 'Inserisci la password per disabilitare 2FA';
            } else {
                // Verifica password
                $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
                $stmt->execute([$currentUser['id']]);
                $user = $stmt->fetch();
                
                if (!password_verify($password, $user['password_hash'])) {
                    $errorMessage = 'Password non valida';
                } else {
                    // Disabilita 2FA
                    $stmt = $pdo->prepare("UPDATE users SET two_fa_enabled = 0, two_fa_secret = NULL WHERE id = ?");
                    $stmt->execute([$currentUser['id']]);
                    
                    $currentUser['two_fa_enabled'] = 0;
                    $currentUser['two_fa_secret'] = null;
                    $successMessage = '2FA disabilitato';
                }
            }
        }
        
    } catch (Exception $e) {
        error_log("Account update error: " . $e->getMessage());
        $errorMessage = 'Errore interno: ' . $e->getMessage();
    }
}

// Funzione per ottenere avatar URL
function getAvatarUrl($user) {
    if ($user['profile_image']) {
        return $user['profile_image'] . '?v=' . time();
    }
    return null;
}
?>

<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modifica Account - CRM Studio Mismo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/account.css">
</head>
<body>
    <div class="container">
        <a href="/dashboard.php" class="back-link">
            ← Torna alla Dashboard
        </a>

        <div class="header">
            <h1 class="page-title">Modifica Account</h1>
            <p class="page-subtitle">Gestisci le tue informazioni personali e le impostazioni di sicurezza</p>
        </div>

        <?php if ($successMessage): ?>
        <div class="alert alert-success">
            <?= htmlspecialchars($successMessage) ?>
        </div>
        <?php endif; ?>
        
        <?php if ($errorMessage): ?>
        <div class="alert alert-error">
            <?= htmlspecialchars($errorMessage) ?>
        </div>
        <?php endif; ?>

        <!-- Profile Information -->
        <div class="form-card">
            <div class="form-card-header">
                <h2 class="form-card-title">
                    <i>👤</i>
                    Informazioni Profilo
                </h2>
            </div>
            <div class="form-card-content">
                <div class="user-avatar-section">
                    <div class="user-avatar-large">
                        <?php $avatarUrl = getAvatarUrl($currentUser); ?>
                        <?php if ($avatarUrl): ?>
                            <img src="<?= htmlspecialchars($avatarUrl) ?>" alt="Avatar">
                        <?php else: ?>
                            <?= strtoupper(substr($currentUser['first_name'], 0, 1) . substr($currentUser['last_name'], 0, 1)) ?>
                        <?php endif; ?>
                    </div>
                    
                    <div class="avatar-upload-section">
                        <form method="POST" enctype="multipart/form-data" style="display: inline;">
                            <input type="hidden" name="action" value="upload_avatar">
                            <div class="file-input-wrapper">
                                <input type="file" name="avatar_file" class="file-input" accept="image/*" onchange="this.form.submit()">
                                <label class="file-input-label">
                                    Cambia foto profilo
                                </label>
                            </div>
                        </form>
                        <small style="display: block; margin-top: 8px; color: #787774; text-align: center;">
                            Formati supportati: JPG, PNG, GIF (max 5MB)
                        </small>
                    </div>
                </div>

                <form method="POST">
                    <input type="hidden" name="action" value="update_profile">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="first_name">Nome</label>
                            <input type="text" id="first_name" name="first_name" 
                                   value="<?= htmlspecialchars($currentUser['first_name']) ?>" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="last_name">Cognome</label>
                            <input type="text" id="last_name" name="last_name" 
                                   value="<?= htmlspecialchars($currentUser['last_name']) ?>" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">
                            Email 
                            <span class="status-badge <?= $currentUser['email_verified'] ? 'status-verified' : 'status-unverified' ?>">
                                <?= $currentUser['email_verified'] ? 'Verificata' : 'Non verificata' ?>
                            </span>
                        </label>
                        <input type="email" id="email" name="email" 
                               value="<?= htmlspecialchars($currentUser['email']) ?>" required>
                        <small>Se cambi email, dovrai verificarla tramite codice</small>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="username">Username</label>
                            <input type="text" id="username" value="<?= htmlspecialchars($currentUser['username']) ?>" 
                                   disabled readonly>
                            <small>L'username non può essere modificato</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="role">Ruolo</label>
                            <input type="text" id="role" value="<?= $currentUser['role'] === 'super_admin' ? 'Super Admin' : 'Admin' ?>" 
                                   disabled readonly>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">
                        Salva Modifiche
                    </button>
                </form>
            </div>
        </div>

        <!-- Email Verification -->
        <?php if ($showEmailVerification): ?>
        <div class="form-card">
            <div class="form-card-header">
                <h2 class="form-card-title">
                    <i>📧</i>
                    Verifica Email
                </h2>
            </div>
            <div class="form-card-content">
                <div class="verification-section">
                    <h4>Inserisci il codice inviato a: <?= htmlspecialchars($pendingEmail) ?></h4>
                    <form method="POST">
                        <input type="hidden" name="action" value="verify_email">
                        <input type="hidden" name="email" value="<?= htmlspecialchars($pendingEmail) ?>">
                        
                        <div class="form-group">
                            <label for="verification_code">Codice di Verifica (6 cifre)</label>
                            <input type="text" id="verification_code" name="verification_code" 
                                   maxlength="6" pattern="[0-9]{6}" placeholder="123456" required>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">
                            Verifica Email
                        </button>
                    </form>
                </div>
            </div>
        </div>
        <?php endif; ?>

        <!-- Password Security -->
        <div class="form-card">
            <div class="form-card-header">
                <h2 class="form-card-title">
                    <i>🔐</i>
                    Sicurezza Password
                </h2>
            </div>
            <div class="form-card-content">
                <form method="POST">
                    <input type="hidden" name="action" value="change_password">
                    
                    <div class="form-group">
                        <label for="current_password">Password Corrente</label>
                        <input type="password" id="current_password" name="current_password" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="new_password">Nuova Password</label>
                            <input type="password" id="new_password" name="new_password" 
                                   minlength="8" required>
                            <small>Minimo 8 caratteri</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="confirm_password">Conferma Nuova Password</label>
                            <input type="password" id="confirm_password" name="confirm_password" 
                                   minlength="8" required>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">
                        Cambia Password
                    </button>
                </form>
            </div>
        </div>

        <!-- 2FA Settings -->
        <div class="form-card">
            <div class="form-card-header">
                <h2 class="form-card-title">
                    <i>🔒</i>
                    Autenticazione a Due Fattori (2FA)
                    <span class="status-badge <?= $currentUser['two_fa_enabled'] ? 'status-enabled' : 'status-disabled' ?>">
                        <?= $currentUser['two_fa_enabled'] ? 'Attiva' : 'Disattiva' ?>
                    </span>
                </h2>
            </div>
            <div class="form-card-content">
                <?php if (!$currentUser['two_fa_enabled']): ?>
                    <?php if (!$currentUser['two_fa_secret']): ?>
                        <!-- Abilita 2FA -->
                        <p>L'autenticazione a due fattori aggiunge un ulteriore livello di sicurezza al tuo account.</p>
                        <form method="POST" style="margin-top: 16px;">
                            <input type="hidden" name="action" value="enable_2fa">
                            <button type="submit" class="btn btn-primary">
                                Abilita 2FA
                            </button>
                        </form>
                    <?php else: ?>
                        <!-- Configura 2FA -->
                        <div class="alert alert-warning">
                            2FA non ancora attivato. Completa la configurazione seguendo i passaggi sotto.
                        </div>
                        
                        <h4>Passaggio 1: Scansiona il QR Code</h4>
                        <p>Usa un'app come Google Authenticator, Authy o Microsoft Authenticator:</p>
                        
                        <div class="qr-code-section">
                            <div class="qr-code">
                                <?php
                                // Debug QR code generation
                                $qrUrl = get2FAQRCodeUrl($currentUser['email'], $currentUser['two_fa_secret']);
                                error_log("QR Code URL: " . $qrUrl);
                                ?>
                                <img src="<?= htmlspecialchars($qrUrl) ?>" 
                                     alt="QR Code 2FA" style="max-width: 200px;" 
                                     onload="this.nextElementSibling.style.display='none';"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                <div style="display: block; padding: 20px; text-align: center; color: #787774; background: #f7f7f5; border-radius: 4px;">
                                    <div style="font-size: 24px; margin-bottom: 8px;">📱</div>
                                    <div style="font-size: 14px; margin-bottom: 8px; font-weight: 500;">QR Code non disponibile</div>
                                    <div style="font-size: 12px;">Usa la chiave manuale qui sotto</div>
                                </div>
                            </div>
                        </div>
                        
                        <h4>Passaggio 2: Inserisci la chiave manualmente (opzionale)</h4>
                        <p>Se non riesci a scansionare il QR, inserisci questa chiave nella tua app:</p>
                        <div class="secret-key"><?= htmlspecialchars($currentUser['two_fa_secret']) ?></div>
                        
                        <h4>Passaggio 3: Conferma con un codice</h4>
                        <form method="POST">
                            <input type="hidden" name="action" value="confirm_2fa">
                            <div class="form-group" style="max-width: 200px;">
                                <label for="2fa_code">Codice dall'app (6 cifre)</label>
                                <input type="text" id="2fa_code" name="2fa_code" 
                                       maxlength="6" pattern="[0-9]{6}" placeholder="123456" 
                                       style="text-align: center; font-size: 16px;" required>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                Attiva 2FA
                            </button>
                        </form>
                    <?php endif; ?>
                <?php else: ?>
                    <!-- 2FA attivo -->
                    <div class="alert alert-success">
                        L'autenticazione a due fattori è attiva e protegge il tuo account.
                    </div>
                    
                    <h4>Disattiva 2FA</h4>
                    <p>Disattivando 2FA riduci la sicurezza del tuo account.</p>
                    
                    <form method="POST" style="margin-top: 16px;">
                        <input type="hidden" name="action" value="disable_2fa">
                        <div class="form-group" style="max-width: 300px;">
                            <label for="password_confirm">Conferma con la tua password</label>
                            <input type="password" id="password_confirm" name="password_confirm" required>
                        </div>
                        <button type="submit" class="btn btn-danger" 
                                onclick="return confirm('Sei sicuro di voler disattivare 2FA?')">
                            Disattiva 2FA
                        </button>
                    </form>
                <?php endif; ?>
            </div>
        </div>

        <!-- Session Information -->
        <div class="form-card">
            <div class="form-card-header">
                <h2 class="form-card-title">
                    <i>📊</i>
                    Informazioni Sessione
                </h2>
            </div>
            <div class="form-card-content">
                <div class="session-info">
                    <h4>Sessione Corrente</h4>
                    <p><strong>User ID:</strong> <?= $currentUser['id'] ?></p>
                    <p><strong>Email Verificata:</strong> <?= $currentUser['email_verified'] ? 'Sì' : 'No' ?></p>
                    <p><strong>2FA Attivo:</strong> <?= $currentUser['two_fa_enabled'] ? 'Sì' : 'No' ?></p>
                    <p><strong>IP:</strong> <?= $_SERVER['REMOTE_ADDR'] ?? 'N/A' ?></p>
                    <p><strong>Time:</strong> <?= date('d/m/Y H:i:s') ?></p>
                </div>

                <div style="margin-top: 20px;">
                    <a href="/core/auth/logout.php" class="btn btn-secondary">
                        Logout
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Password confirmation validation
        document.getElementById('confirm_password').addEventListener('input', function() {
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = this.value;
            
            if (newPassword !== confirmPassword) {
                this.setCustomValidity('Le password non coincidono');
            } else {
                this.setCustomValidity('');
            }
        });

        // 2FA code input formatting
        const twoFaInput = document.getElementById('2fa_code');
        if (twoFaInput) {
            twoFaInput.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '');
            });
        }

        // Verification code input formatting
        const verificationInput = document.getElementById('verification_code');
        if (verificationInput) {
            verificationInput.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '');
            });
        }

        // File input preview
        const fileInput = document.querySelector('input[name="avatar_file"]');
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const avatar = document.querySelector('.user-avatar-large');
                        avatar.innerHTML = '<img src="' + e.target.result + '" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">';
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // QR Code fallback handling
        const qrImage = document.querySelector('.qr-code img');
        if (qrImage) {
            // Test QR code loading with timeout
            setTimeout(() => {
                if (!qrImage.complete || qrImage.naturalHeight === 0) {
                    console.log('QR code failed to load, showing fallback');
                    qrImage.style.display = 'none';
                    qrImage.nextElementSibling.style.display = 'block';
                }
            }, 3000);
        }

        console.log('Notion-style account page loaded:', {
            id: <?= $currentUser['id'] ?>,
            name: '<?= htmlspecialchars($currentUser['first_name']) ?>',
            role: '<?= $currentUser['role'] ?>',
            email_verified: <?= $currentUser['email_verified'] ? 'true' : 'false' ?>,
            two_fa_enabled: <?= $currentUser['two_fa_enabled'] ? 'true' : 'false' ?>
        });
            id: <?= $currentUser['id'] ?>,
            name: '<?= htmlspecialchars($currentUser['first_name']) ?>',
            role: '<?= $currentUser['role'] ?>',
            email_verified: <?= $currentUser['email_verified'] ? 'true' : 'false' ?>,
            two_fa_enabled: <?= $currentUser['two_fa_enabled'] ? 'true' : 'false' ?>
        });
    </script>
</body>
</html>
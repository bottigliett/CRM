<?php
// File: /core/auth/forgot_password_handler.php
// Gestore server-side per recupero password CRM Studio Mismo

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

require_once __DIR__ . '/../config/database.php';

// Verifica che sia una richiesta POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metodo non consentito']);
    exit;
}

// Rate limiting per IP (max 3 tentativi per ora)
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

try {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT COUNT(*) as attempts 
        FROM access_logs 
        WHERE ip_address = ? 
        AND action = 'password_reset_request' 
        AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ");
    $stmt->execute([$clientIp]);
    $result = $stmt->fetch();
    
    if ($result['attempts'] > 3) {
        logAccess(null, null, 'password_reset_request', 'blocked', 'IP rate limit exceeded');
        echo json_encode(['success' => false, 'message' => 'Troppi tentativi di reset. Riprova più tardi.']);
        exit;
    }
} catch (Exception $e) {
    error_log("Rate limit check error: " . $e->getMessage());
}

// Sanitizza input
$email = sanitizeInput($_POST['email'] ?? '');

// Validazione input
if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Email è obbligatoria']);
    exit;
}

if (!validateEmail($email)) {
    echo json_encode(['success' => false, 'message' => 'Email non valida']);
    exit;
}

try {
    $db = getDB();
    
    // Verifica se l'email esiste
    $stmt = $db->prepare("SELECT id, username, first_name, last_name FROM users WHERE email = ? AND is_active = 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    // Sempre restituire success per motivi di sicurezza (non rivelare se email esiste)
    // Ma inviare email solo se utente esiste realmente
    if ($user) {
        // Genera token sicuro
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 ora
        
        // Rimuovi eventuali token precedenti per questa email
        $stmt = $db->prepare("DELETE FROM password_resets WHERE email = ?");
        $stmt->execute([$email]);
        
        // Inserisci nuovo token
        $stmt = $db->prepare("
            INSERT INTO password_resets (email, token, expires_at) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$email, $token, $expiresAt]);
        
        // Prepara email di reset
        $resetUrl = SITE_URL . "/core/auth/reset_password.php?token=" . $token;
        
        $subject = "Reset Password - " . SITE_NAME;
        $message = generateResetEmail($user['first_name'], $resetUrl);
        
        // Invia email (implementazione semplificata)
        if (sendResetEmail($email, $subject, $message)) {
            logAccess($user['id'], $user['username'], 'password_reset_request', 'success', 'Reset email sent');
        } else {
            logAccess($user['id'], $user['username'], 'password_reset_request', 'failed', 'Failed to send reset email');
            error_log("Failed to send reset email to: " . $email);
        }
    } else {
        // Log tentativo su email inesistente
        logAccess(null, $email, 'password_reset_request', 'failed', 'Email not found');
    }
    
    // Sempre restituire successo per sicurezza
    echo json_encode([
        'success' => true,
        'message' => 'Se l\'email è registrata, riceverai le istruzioni per il reset'
    ]);
    
} catch (Exception $e) {
    error_log("Forgot password error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Errore interno del server. Riprova più tardi.'
    ]);
}

function generateResetEmail($firstName, $resetUrl) {
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>Reset Password</title>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
            <div style='background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 20px; text-align: center; color: white;'>
                <h1 style='margin: 0;'>MISMO</h1>
                <p style='margin: 5px 0 0 0;'>CRM Studio</p>
            </div>
            
            <div style='padding: 30px; background: #f9f9f9;'>
                <h2>Ciao " . htmlspecialchars($firstName) . ",</h2>
                
                <p>Hai richiesto il reset della password per il tuo account CRM Studio Mismo.</p>
                
                <p>Clicca sul pulsante qui sotto per reimpostare la tua password:</p>
                
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='" . htmlspecialchars($resetUrl) . "' 
                       style='background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;'>
                        Reimposta Password
                    </a>
                </div>
                
                <p>Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
                <p style='word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;'>" . htmlspecialchars($resetUrl) . "</p>
                
                <p><strong>Importante:</strong></p>
                <ul>
                    <li>Questo link è valido per 1 ora</li>
                    <li>Se non hai richiesto questo reset, ignora questa email</li>
                    <li>Per sicurezza, non condividere questo link con nessuno</li>
                </ul>
                
                <hr style='margin: 30px 0; border: none; border-top: 1px solid #ddd;'>
                
                <p style='font-size: 12px; color: #666;'>
                    Questa email è stata inviata automaticamente dal sistema CRM Studio Mismo.<br>
                    Non rispondere a questa email.
                </p>
            </div>
            
            <div style='padding: 20px; text-align: center; font-size: 12px; color: #666;'>
                © 2025 Studio Mismo. Tutti i diritti riservati.
            </div>
        </div>
    </body>
    </html>
    ";
}

function sendResetEmail($to, $subject, $message) {
    // Implementazione semplificata per l'invio email
    // In produzione utilizzare una libreria come PHPMailer o SwiftMailer
    
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_EMAIL . '>',
        'Reply-To: ' . MAIL_FROM_EMAIL,
        'X-Mailer: PHP/' . phpversion()
    ];
    
    // Tentativo di invio con mail() nativa
    $success = mail($to, $subject, $message, implode("\r\n", $headers));
    
    // Log del tentativo
    if (!$success) {
        error_log("Failed to send email to: $to");
    }
    
    return $success;
}
?>
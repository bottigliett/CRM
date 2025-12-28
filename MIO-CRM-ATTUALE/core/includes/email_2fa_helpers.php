<?php
// File: /core/includes/email_2fa_helpers.php
// Helper semplificati per CRM Studio Mismo

// Funzione per inviare email di verifica
function sendVerificationEmail($userId, $email) {
    try {
        // Connessione database
        $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
        $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        // Genera codice e token
        $code = str_pad(random_int(100000, 999999), 6, '0');
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 ora
        
        // Rimuovi vecchie verifiche
        $stmt = $pdo->prepare("DELETE FROM email_verifications WHERE user_id = ? AND email = ?");
        $stmt->execute([$userId, $email]);
        
        // Inserisci nuova verifica
        $stmt = $pdo->prepare("
            INSERT INTO email_verifications (user_id, email, token, code, expires_at) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $email, $token, $code, $expiresAt]);
        
        // Invia email semplice
        $subject = "Verifica Email - Studio Mismo CRM";
        $message = "
        <html>
        <body style='font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px;'>
            <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;'>
                <h2 style='color: #3b82f6; text-align: center;'>Verifica la tua Email</h2>
                <p>Il tuo codice di verifica è:</p>
                <div style='background: #f1f5f9; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;'>
                    <span style='font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 3px;'>{$code}</span>
                </div>
                <p><strong>Questo codice scade tra 1 ora.</strong></p>
                <p>Se non hai richiesto questa verifica, ignora questa email.</p>
                <hr style='margin: 20px 0;'>
                <p style='font-size: 12px; color: #6b7280; text-align: center;'>© Studio Mismo CRM</p>
            </div>
        </body>
        </html>";
        
        $headers = [
            'From: Studio Mismo CRM <noreply@studiomismo.it>',
            'Reply-To: noreply@studiomismo.it',
            'Content-Type: text/html; charset=UTF-8',
            'MIME-Version: 1.0'
        ];
        
        return mail($email, $subject, $message, implode("\r\n", $headers));
        
    } catch (Exception $e) {
        error_log("Email verification error: " . $e->getMessage());
        return false;
    }
}

// Funzione per verificare codice email
function verifyEmailCode($userId, $email, $code) {
    try {
        $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
        $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        $stmt = $pdo->prepare("
            SELECT id FROM email_verifications 
            WHERE user_id = ? AND email = ? AND code = ? 
            AND expires_at > NOW() AND verified = 0
        ");
        $stmt->execute([$userId, $email, $code]);
        $verification = $stmt->fetch();
        
        if ($verification) {
            // Marca come verificato
            $stmt = $pdo->prepare("UPDATE email_verifications SET verified = 1 WHERE id = ?");
            $stmt->execute([$verification['id']]);
            
            // Aggiorna utente
            $stmt = $pdo->prepare("UPDATE users SET email = ?, email_verified = 1 WHERE id = ?");
            $stmt->execute([$email, $userId]);
            
            return true;
        }
        
        return false;
        
    } catch (Exception $e) {
        error_log("Email verification check error: " . $e->getMessage());
        return false;
    }
}

// Funzione per generare secret 2FA
function generate2FASecret($length = 16) {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $secret = '';
    for ($i = 0; $i < $length; $i++) {
        $secret .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $secret;
}

// Funzione per generare QR Code URL
function get2FAQRCodeUrl($user, $secret) {
    $issuer = 'Studio Mismo CRM';
    $accountName = $user; // Usa direttamente l'email
    
    // Genera URL TOTP standard (semplificato)
    $totpUrl = "otpauth://totp/$accountName?secret=$secret&issuer=" . urlencode($issuer);
    
    // Debug log
    error_log("TOTP URL generato: " . $totpUrl);
    
    // Usa Google Charts (più affidabile)
    $qrUrl = 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=' . urlencode($totpUrl);
    
    error_log("QR URL finale: " . $qrUrl);
    
    return $qrUrl;
}

// Funzione per verificare codice 2FA
function verify2FACode($secret, $code) {
    // Debug
    error_log("Verifying 2FA code: $code for secret: $secret");
    
    // Implementazione TOTP semplificata
    $time = floor(time() / 30);
    
    // Controlla codice attuale e quello precedente/successivo (tolleranza ±1)
    for ($i = -2; $i <= 2; $i++) {
        $calculatedCode = calculate2FACode($secret, $time + $i);
        error_log("Time slot " . ($time + $i) . ": calculated code = $calculatedCode");
        
        if ($calculatedCode === $code) {
            error_log("2FA code matched at time slot: " . ($time + $i));
            return true;
        }
    }
    
    error_log("2FA code verification failed");
    return false;
}

// Funzione per calcolare codice TOTP
function calculate2FACode($secret, $time) {
    $secretKey = base32Decode($secret);
    if (!$secretKey) {
        error_log("Failed to decode base32 secret: $secret");
        return false;
    }
    
    // Converti time in binary
    $timeBytes = [];
    for ($i = 7; $i >= 0; $i--) {
        $timeBytes[] = chr(($time >> (8 * $i)) & 0xFF);
    }
    $timeString = implode('', $timeBytes);
    
    // Calcola HMAC-SHA1
    $hash = hash_hmac('sha1', $timeString, $secretKey, true);
    
    // Dynamic truncation
    $offset = ord($hash[19]) & 0x0F;
    $code = (
        ((ord($hash[$offset]) & 0x7F) << 24) |
        ((ord($hash[$offset + 1]) & 0xFF) << 16) |
        ((ord($hash[$offset + 2]) & 0xFF) << 8) |
        (ord($hash[$offset + 3]) & 0xFF)
    ) % 1000000;
    
    $result = str_pad($code, 6, '0', STR_PAD_LEFT);
    error_log("Calculated 2FA code for time $time: $result");
    
    return $result;
}

// Funzione per decodificare base32
function base32Decode($secret) {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $secret = strtoupper($secret);
    
    // Rimuovi spazi e padding
    $secret = str_replace([' ', '='], '', $secret);
    
    // Verifica caratteri validi
    for ($i = 0; $i < strlen($secret); $i++) {
        if (strpos($alphabet, $secret[$i]) === false) {
            error_log("Invalid base32 character: " . $secret[$i]);
            return false;
        }
    }
    
    $binaryString = '';
    for ($i = 0; $i < strlen($secret); $i += 8) {
        $chunk = substr($secret, $i, 8);
        $binaryChunk = '';
        
        for ($j = 0; $j < strlen($chunk); $j++) {
            $value = strpos($alphabet, $chunk[$j]);
            $binaryChunk .= str_pad(decbin($value), 5, '0', STR_PAD_LEFT);
        }
        
        // Converti in bytes
        for ($k = 0; $k < strlen($binaryChunk); $k += 8) {
            if ($k + 8 <= strlen($binaryChunk)) {
                $byte = substr($binaryChunk, $k, 8);
                $binaryString .= chr(bindec($byte));
            }
        }
    }
    
    return $binaryString;
}

// Funzione per upload avatar
function uploadAvatar($file, $userId) {
    try {
        // Crea directory se non esiste
        $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/profiles/';
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Validazioni
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'Errore durante l\'upload del file'];
        }
        
        if ($file['size'] > 5 * 1024 * 1024) { // 5MB
            return ['success' => false, 'message' => 'File troppo grande (max 5MB)'];
        }
        
        $allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
        $fileInfo = pathinfo($file['name']);
        $extension = strtolower($fileInfo['extension']);
        
        if (!in_array($extension, $allowedTypes)) {
            return ['success' => false, 'message' => 'Tipo file non supportato (solo JPG, PNG, GIF)'];
        }
        
        // Verifica che sia un'immagine reale
        if (!getimagesize($file['tmp_name'])) {
            return ['success' => false, 'message' => 'Il file non è un\'immagine valida'];
        }
        
        // Genera nome univoco
        $filename = 'avatar_' . $userId . '_' . time() . '.' . $extension;
        $filePath = $uploadDir . $filename;
        
        // Sposta file
        if (move_uploaded_file($file['tmp_name'], $filePath)) {
            // Ridimensiona immagine
            resizeImage($filePath, 200, 200);
            
            // Aggiorna database
            $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
            $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);
            
            $stmt = $pdo->prepare("UPDATE users SET profile_image = ? WHERE id = ?");
            $stmt->execute(['/uploads/profiles/' . $filename, $userId]);
            
            return ['success' => true, 'filename' => $filename, 'path' => '/uploads/profiles/' . $filename];
        } else {
            return ['success' => false, 'message' => 'Errore durante il salvataggio del file'];
        }
        
    } catch (Exception $e) {
        error_log("Avatar upload error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Errore interno: ' . $e->getMessage()];
    }
}

// Funzione per ridimensionare immagine
function resizeImage($filePath, $width, $height) {
    $imageInfo = getimagesize($filePath);
    if (!$imageInfo) return false;
    
    $imageType = $imageInfo[2];
    
    switch ($imageType) {
        case IMAGETYPE_JPEG:
            $source = imagecreatefromjpeg($filePath);
            break;
        case IMAGETYPE_PNG:
            $source = imagecreatefrompng($filePath);
            break;
        case IMAGETYPE_GIF:
            $source = imagecreatefromgif($filePath);
            break;
        default:
            return false;
    }
    
    $sourceWidth = imagesx($source);
    $sourceHeight = imagesy($source);
    
    // Calcola dimensioni mantenendo proporzioni
    $ratio = min($width / $sourceWidth, $height / $sourceHeight);
    $newWidth = $sourceWidth * $ratio;
    $newHeight = $sourceHeight * $ratio;
    
    // Crea nuova immagine
    $destination = imagecreatetruecolor($width, $height);
    $white = imagecolorallocate($destination, 255, 255, 255);
    imagefill($destination, 0, 0, $white);
    
    // Calcola posizione per centrare
    $x = ($width - $newWidth) / 2;
    $y = ($height - $newHeight) / 2;
    
    imagecopyresampled($destination, $source, $x, $y, 0, 0, $newWidth, $newHeight, $sourceWidth, $sourceHeight);
    
    // Salva immagine ridimensionata
    switch ($imageType) {
        case IMAGETYPE_JPEG:
            imagejpeg($destination, $filePath, 90);
            break;
        case IMAGETYPE_PNG:
            imagepng($destination, $filePath);
            break;
        case IMAGETYPE_GIF:
            imagegif($destination, $filePath);
            break;
    }
    
    imagedestroy($source);
    imagedestroy($destination);
    
    return true;
}
?>
<?php
// File: /core/config/database.php
// AGGIORNAMENTO per configurazione email Hostinger

// Aggiungi queste righe alla sezione "Configurazioni email" nel file database.php esistente:

// Configurazioni email - HOSTINGER
define('MAIL_HOST', 'smtp.hostinger.com');
define('MAIL_PORT', 587);
define('MAIL_USERNAME', 'noreply@studiomismo.it'); // Email creata nel pannello Hostinger
define('MAIL_PASSWORD', 'CRM2025!Email#Studio'); // Da configurare con password reale
define('MAIL_FROM_NAME', 'Studio Mismo CRM');
define('MAIL_FROM_EMAIL', 'noreplay@studiomismo.it'<?php
// File: /core/config/database.php
// Configurazione database per CRM Studio Mismo

// Configurazioni database - HOST CORRETTO HOSTINGER
define('DB_HOST', '127.0.0.1'); // Host che funziona su Hostinger
define('DB_NAME', 'u706045794_crm_mismo');
define('DB_USER', 'u706045794_mismo_crm_new');
define('DB_PASS', 'BLQ$>:;*9+h'); // Password corretta
define('DB_CHARSET', 'utf8mb4');

// Configurazioni applicazione
define('SITE_URL', 'https://portale.studiomismo.it');
define('SITE_NAME', 'CRM Studio Mismo');
define('SITE_VERSION', '1.0.0');

// Configurazioni sicurezza
define('SESSION_NAME', 'crm_session');
define('CSRF_TOKEN_NAME', 'csrf_token');
define('PASSWORD_MIN_LENGTH', 8);
define('SESSION_TIMEOUT', 604800); // 1 ora in secondi
define('LOGIN_ATTEMPTS_LIMIT', 5);
define('LOGIN_ATTEMPTS_TIMEOUT', 900); // 15 minuti

// Configurazioni 2FA
define('TWO_FA_ISSUER', 'Studio Mismo CRM');
define('TWO_FA_DIGITS', 6);
define('TWO_FA_PERIOD', 30);

// Configurazioni email
define('MAIL_HOST', 'smtp.hostinger.com');
define('MAIL_PORT', 587);
define('MAIL_USERNAME', 'noreply@studiomismo.it');
define('MAIL_PASSWORD', ''); // Da configurare
define('MAIL_FROM_NAME', 'Studio Mismo CRM');
define('MAIL_FROM_EMAIL', 'noreply@studiomismo.it');

// Configurazioni upload
define('UPLOAD_MAX_SIZE', 10 * 1024 * 1024); // 10MB
define('UPLOAD_ALLOWED_TYPES', ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']);
define('PROFILE_IMAGES_PATH', '/uploads/profiles/');

// Configurazioni log
define('LOG_ACCESS_PATH', __DIR__ . '/../logs/access.log');
define('LOG_ERROR_PATH', __DIR__ . '/../logs/error.log');
define('LOG_MAX_SIZE', 50 * 1024 * 1024); // 50MB

// Timezone
date_default_timezone_set('Europe/Rome');

// Classe Database
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            // Non fare die() qui per non rovinare il JSON - lancia un'eccezione
            throw new Exception("Errore di connessione al database");
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    // Previene clonazione
    private function __clone() {}
    
    // Previene deserializzazione
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

// Funzioni di utilità
function getDB() {
    return Database::getInstance()->getConnection();
}

function logAccess($userId, $username, $action, $status, $details = null) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            INSERT INTO access_logs (user_id, username, ip_address, user_agent, action, status, details) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $username,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            $action,
            $status,
            $details
        ]);
    } catch (Exception $e) {
        error_log("Failed to log access: " . $e->getMessage());
    }
}

function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function generateCSRFToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION[CSRF_TOKEN_NAME])) {
        $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
    }
    
    return $_SESSION[CSRF_TOKEN_NAME];
}

function validateCSRFToken($token) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    return isset($_SESSION[CSRF_TOKEN_NAME]) && hash_equals($_SESSION[CSRF_TOKEN_NAME], $token);
}
?>);
define('MAIL_ENCRYPTION', 'tls'); // TLS per porta 587

// Alternativa PHPMailer (raccomandato per produzione)
// Aggiungi questa funzione al file database.php:

function sendEmailWithPHPMailer($to, $subject, $body, $isHTML = true) {
    // Se hai PHPMailer installato, usa questo metodo
    /*
    use PHPMailer\PHPMailer\PHPMailer;
    use PHPMailer\PHPMailer\SMTP;
    use PHPMailer\PHPMailer\Exception;
    
    $mail = new PHPMailer(true);
    
    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = MAIL_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = MAIL_USERNAME;
        $mail->Password   = MAIL_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = MAIL_PORT;
        $mail->CharSet    = 'UTF-8';
        
        // Recipients
        $mail->setFrom(MAIL_FROM_EMAIL, MAIL_FROM_NAME);
        $mail->addAddress($to);
        
        // Content
        $mail->isHTML($isHTML);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("PHPMailer Error: {$mail->ErrorInfo}");
        return false;
    }
    */
    
    // Per ora usa mail() nativo (meno affidabile ma funziona)
    return sendEmailNative($to, $subject, $body);
}

function sendEmailNative($to, $subject, $body) {
    $headers = [
        'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_EMAIL . '>',
        'Reply-To: ' . MAIL_FROM_EMAIL,
        'Content-Type: text/html; charset=UTF-8',
        'MIME-Version: 1.0',
        'X-Mailer: PHP/' . phpversion()
    ];
    
    return mail($to, $subject, $body, implode("\r\n", $headers));
}
?>

<!--
ISTRUZIONI PER HOSTINGER:

1. **Crea account email nel pannello Hostinger:**
   - Vai su "Email" nel pannello di controllo
   - Crea l'account: noreply@studiomismo.it
   - Imposta una password sicura
   - Annota la password per il file di configurazione

2. **Aggiorna /core/config/database.php:**
   - Sostituisci 'TUA_PASSWORD_EMAIL_HOSTINGER' con la password reale
   - Verifica che MAIL_FROM_EMAIL sia corretto

3. **Test configurazione:**
   - Prova a inviare un'email di test dalla pagina account
   - Controlla i log di errore se non funziona

4. **Per produzione (raccomandato):**
   - Installa PHPMailer: composer require phpmailer/phpmailer
   - Decommenta il codice PHPMailer sopra
   - PHPMailer è più affidabile del mail() nativo

5. **Troubleshooting comune Hostinger:**
   - Porta 587 con TLS di solito funziona
   - Se non funziona, prova porta 465 con SSL
   - Verifica che l'email sia stata creata correttamente nel pannello
   - Controlla i log in /core/logs/error.log
-->
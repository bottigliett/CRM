<?php
// File: /modules/agenda/tools/backup_export.php
// Sistema backup ed export eventi agenda

session_start();

// Solo per admin/super admin
if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'] ?? '', ['admin', 'super_admin'])) {
    die('Accesso negato. Solo admin possono utilizzare questo strumento.');
}

// Include configurazione
require_once __DIR__ . '/../config/agenda_config.php';

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

// Gestisci azioni
$action = $_GET['action'] ?? '';
$message = '';
$error = '';

switch ($action) {
    case 'backup_json':
        $result = backupToJson($pdo);
        if ($result['success']) {
            downloadFile($result['file'], $result['filename']);
            exit;
        } else {
            $error = $result['message'];
        }
        break;
        
    case 'backup_csv':
        $result = backupToCsv($pdo);
        if ($result['success']) {
            downloadFile($result['file'], $result['filename']);
            exit;
        } else {
            $error = $result['message'];
        }
        break;
        
    case 'backup_ical':
        $result = backupToICal($pdo);
        if ($result['success']) {
            downloadFile($result['file'], $result['filename'], 'text/calendar');
            exit;
        } else {
            $error = $result['message'];
        }
        break;
        
    case 'auto_backup':
        $result = createAutoBackup($pdo);
        $message = $result['message'];
        break;
        
    case 'cleanup_old':
        $result = cleanupOldBackups();
        $message = $result['message'];
        break;
}

// Funzioni backup
function backupToJson($pdo) {
    try {
        // Ottieni tutti i dati agenda
        $data = [];
        
        // Eventi
        $stmt = $pdo->query("SELECT * FROM agenda_events ORDER BY created_at DESC");
        $data['events'] = $stmt->fetchAll();
        
        // Categorie
        $stmt = $pdo->query("SELECT * FROM agenda_categories ORDER BY name");
        $data['categories'] = $stmt->fetchAll();
        
        // Responsabili
        $stmt = $pdo->query("SELECT * FROM agenda_event_responsables");
        $data['responsables'] = $stmt->fetchAll();
        
        // Notifiche
        $stmt = $pdo->query("SELECT * FROM agenda_notifications");
        $data['notifications'] = $stmt->fetchAll();
        
        // Log attività
        $stmt = $pdo->query("SELECT * FROM agenda_activity_log ORDER BY created_at DESC LIMIT 1000");
        $data['activity_log'] = $stmt->fetchAll();
        
        // Metadata backup
        $data['backup_info'] = [
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $_SESSION['username'],
            'version' => '1.0',
            'total_events' => count($data['events']),
            'total_categories' => count($data['categories'])
        ];
        
        // Genera file
        $filename = 'agenda_backup_' . date('Y-m-d_H-i-s') . '.json';
        $filepath = sys_get_temp_dir() . '/' . $filename;
        
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        file_put_contents($filepath, $json);
        
        return [
            'success' => true,
            'file' => $filepath,
            'filename' => $filename
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Errore backup JSON: ' . $e->getMessage()
        ];
    }
}

function backupToCsv($pdo) {
    try {
        $filename = 'agenda_eventi_' . date('Y-m-d_H-i-s') . '.csv';
        $filepath = sys_get_temp_dir() . '/' . $filename;
        
        $handle = fopen($filepath, 'w');
        
        // Header CSV
        $headers = [
            'ID', 'Titolo', 'Descrizione', 'Data Inizio', 'Data Fine', 
            'Tutto il Giorno', 'Categoria', 'Cliente', 'Luogo', 
            'Priorità', 'Status', 'Responsabili', 'Creato Da', 'Creato Il'
        ];
        
        fputcsv($handle, $headers);
        
        // Dati eventi
        $sql = "
            SELECT 
                e.*,
                c.name as category_name,
                cl.company_name as client_name,
                u.first_name as created_by_name,
                GROUP_CONCAT(ur.first_name ORDER BY ur.first_name SEPARATOR ', ') as responsables
            FROM agenda_events e
            LEFT JOIN agenda_categories c ON e.category_id = c.id
            LEFT JOIN clients cl ON e.client_id = cl.id
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN agenda_event_responsables er ON e.id = er.event_id
            LEFT JOIN users ur ON er.user_id = ur.id
            GROUP BY e.id
            ORDER BY e.start_datetime DESC
        ";
        
        $stmt = $pdo->query($sql);
        $events = $stmt->fetchAll();
        
        foreach ($events as $event) {
            $row = [
                $event['id'],
                $event['title'],
                $event['description'],
                $event['start_datetime'],
                $event['end_datetime'],
                $event['is_all_day'] ? 'Sì' : 'No',
                $event['category_name'],
                $event['client_name'],
                $event['location'],
                ucfirst($event['priority']),
                ucfirst($event['status']),
                $event['responsables'],
                $event['created_by_name'],
                $event['created_at']
            ];
            
            fputcsv($handle, $row);
        }
        
        fclose($handle);
        
        return [
            'success' => true,
            'file' => $filepath,
            'filename' => $filename
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Errore backup CSV: ' . $e->getMessage()
        ];
    }
}

function backupToICal($pdo) {
    try {
        $filename = 'agenda_calendario_' . date('Y-m-d_H-i-s') . '.ics';
        $filepath = sys_get_temp_dir() . '/' . $filename;
        
        // Header iCal
        $ical = "BEGIN:VCALENDAR\r\n";
        $ical .= "VERSION:2.0\r\n";
        $ical .= "PRODID:-//Studio Mismo//Agenda CRM//IT\r\n";
        $ical .= "CALSCALE:GREGORIAN\r\n";
        $ical .= "METHOD:PUBLISH\r\n";
        
        // Eventi
        $sql = "
            SELECT e.*, c.name as category_name 
            FROM agenda_events e
            LEFT JOIN agenda_categories c ON e.category_id = c.id
            ORDER BY e.start_datetime
        ";
        
        $stmt = $pdo->query($sql);
        $events = $stmt->fetchAll();
        
        foreach ($events as $event) {
            $ical .= "BEGIN:VEVENT\r\n";
            $ical .= "UID:" . $event['id'] . "@studiomismo.it\r\n";
            
            // Date
            if ($event['is_all_day']) {
                $ical .= "DTSTART;VALUE=DATE:" . date('Ymd', strtotime($event['start_datetime'])) . "\r\n";
                $ical .= "DTEND;VALUE=DATE:" . date('Ymd', strtotime($event['end_datetime'] . ' +1 day')) . "\r\n";
            } else {
                $ical .= "DTSTART:" . gmdate('Ymd\THis\Z', strtotime($event['start_datetime'])) . "\r\n";
                $ical .= "DTEND:" . gmdate('Ymd\THis\Z', strtotime($event['end_datetime'])) . "\r\n";
            }
            
            $ical .= "SUMMARY:" . escapeICalText($event['title']) . "\r\n";
            
            if ($event['description']) {
                $ical .= "DESCRIPTION:" . escapeICalText($event['description']) . "\r\n";
            }
            
            if ($event['location']) {
                $ical .= "LOCATION:" . escapeICalText($event['location']) . "\r\n";
            }
            
            $ical .= "CATEGORIES:" . escapeICalText($event['category_name']) . "\r\n";
            $ical .= "STATUS:" . strtoupper($event['status']) . "\r\n";
            $ical .= "CREATED:" . gmdate('Ymd\THis\Z', strtotime($event['created_at'])) . "\r\n";
            $ical .= "LAST-MODIFIED:" . gmdate('Ymd\THis\Z', strtotime($event['updated_at'])) . "\r\n";
            
            $ical .= "END:VEVENT\r\n";
        }
        
        $ical .= "END:VCALENDAR\r\n";
        
        file_put_contents($filepath, $ical);
        
        return [
            'success' => true,
            'file' => $filepath,
            'filename' => $filename
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Errore backup iCal: ' . $e->getMessage()
        ];
    }
}

function escapeICalText($text) {
    $text = str_replace(['\\', ',', ';', "\n", "\r"], ['\\\\', '\\,', '\\;', '\\n', ''], $text);
    return $text;
}

function createAutoBackup($pdo) {
    try {
        $backupDir = getAgendaConfig('AGENDA_BACKUP_DIRECTORY', '/tmp/agenda_backups/');
        
        // Crea directory se non esiste
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        // Backup JSON completo
        $result = backupToJson($pdo);
        if ($result['success']) {
            $newPath = $backupDir . 'auto_backup_' . date('Y-m-d_H-i-s') . '.json';
            copy($result['file'], $newPath);
            unlink($result['file']);
            
            return [
                'success' => true,
                'message' => 'Backup automatico creato: ' . basename($newPath)
            ];
        } else {
            return $result;
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Errore backup automatico: ' . $e->getMessage()
        ];
    }
}

function cleanupOldBackups() {
    try {
        $backupDir = getAgendaConfig('AGENDA_BACKUP_DIRECTORY', '/tmp/agenda_backups/');
        $retention = getAgendaConfig('AGENDA_BACKUP_RETENTION_COUNT', 30);
        
        if (!is_dir($backupDir)) {
            return ['message' => 'Directory backup non trovata'];
        }
        
        $files = glob($backupDir . 'auto_backup_*.json');
        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        
        $deleted = 0;
        for ($i = $retention; $i < count($files); $i++) {
            if (unlink($files[$i])) {
                $deleted++;
            }
        }
        
        return [
            'success' => true,
            'message' => "Cleanup completato: $deleted file eliminati"
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Errore cleanup: ' . $e->getMessage()
        ];
    }
}

function downloadFile($filepath, $filename, $contentType = 'application/octet-stream') {
    if (file_exists($filepath)) {
        header('Content-Type: ' . $contentType);
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($filepath));
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        
        readfile($filepath);
        unlink($filepath); // Rimuovi file temporaneo
    }
}

// Statistiche backup
$backupStats = [];
$backupDir = getAgendaConfig('AGENDA_BACKUP_DIRECTORY', '/tmp/agenda_backups/');
if (is_dir($backupDir)) {
    $files = glob($backupDir . '*.json');
    $backupStats['count'] = count($files);
    $backupStats['total_size'] = 0;
    $backupStats['last_backup'] = null;
    
    foreach ($files as $file) {
        $backupStats['total_size'] += filesize($file);
        $mtime = filemtime($file);
        if (!$backupStats['last_backup'] || $mtime > strtotime($backupStats['last_backup'])) {
            $backupStats['last_backup'] = date('Y-m-d H:i:s', $mtime);
        }
    }
    
    $backupStats['total_size_mb'] = round($backupStats['total_size'] / 1024 / 1024, 2);
}

?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Backup ed Export Agenda - CRM Studio Mismo</title>
    <style>
        body {
            font-family: 'Inter', Arial, sans-serif;
            background: #f7f7f5;
            color: #37352f;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9e9e7;
        }
        .section {
            margin: 24px 0;
            padding: 20px;
            border: 1px solid #e9e9e7;
            border-radius: 6px;
            background: #fafafa;
        }
        .section h3 {
            margin-top: 0;
            color: #37352f;
        }
        .button-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin: 20px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 20px;
            background: #37352f;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            text-align: center;
            font-weight: 500;
            transition: background 0.15s ease;
            border: none;
            cursor: pointer;
        }
        .btn:hover {
            background: #2c2a26;
        }
        .btn-success { background: #22c55e; }
        .btn-warning { background: #f59e0b; }
        .btn-danger { background: #ef4444; }
        .btn-info { background: #06b6d4; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin: 20px 0;
        }
        .stat-card {
            text-align: center;
            padding: 20px;
            background: #3b82f6;
            color: white;
            border-radius: 8px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
        }
        .stat-label {
            font-size: 12px;
            opacity: 0.9;
            margin-top: 4px;
        }
        .message {
            padding: 12px 16px;
            border-radius: 6px;
            margin: 16px 0;
        }
        .message.success {
            background: #22c55e20;
            border-left: 4px solid #22c55e;
            color: #16a34a;
        }
        .message.error {
            background: #ef444420;
            border-left: 4px solid #ef4444;
            color: #dc2626;
        }
        .format-info {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 4px;
            padding: 12px;
            margin: 12px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💾 Backup ed Export Agenda</h1>
            <p>Strumenti per salvare e esportare i dati dell'agenda</p>
            <p><strong>Utente:</strong> <?= $_SESSION['username'] ?> | <strong>Data:</strong> <?= date('d/m/Y H:i') ?></p>
        </div>

        <?php if ($message): ?>
            <div class="message success"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="message error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <!-- Statistiche Backup -->
        <?php if (!empty($backupStats)): ?>
        <div class="section">
            <h3>📊 Statistiche Backup</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value"><?= $backupStats['count'] ?? 0 ?></div>
                    <div class="stat-label">Backup Disponibili</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value"><?= $backupStats['total_size_mb'] ?? 0 ?> MB</div>
                    <div class="stat-label">Spazio Utilizzato</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value"><?= $backupStats['last_backup'] ? date('d/m', strtotime($backupStats['last_backup'])) : 'Mai' ?></div>
                    <div class="stat-label">Ultimo Backup</div>
                </div>
            </div>
        </div>
        <?php endif; ?>

        <!-- Export Formati -->
        <div class="section">
            <h3>📤 Export Dati</h3>
            <p>Scarica i dati dell'agenda in diversi formati per backup o utilizzo esterno.</p>
            
            <div class="button-grid">
                <div>
                    <a href="?action=backup_json" class="btn btn-success">📄 Export JSON</a>
                    <div class="format-info">
                        <strong>JSON Completo</strong><br>
                        Include tutti i dati: eventi, categorie, responsabili, notifiche, log.
                        Ideale per backup completo e ripristino.
                    </div>
                </div>
                
                <div>
                    <a href="?action=backup_csv" class="btn btn-info">📊 Export CSV</a>
                    <div class="format-info">
                        <strong>CSV Eventi</strong><br>
                        Solo eventi in formato tabellare.
                        Compatibile con Excel e altri fogli di calcolo.
                    </div>
                </div>
                
                <div>
                    <a href="?action=backup_ical" class="btn btn-warning">📅 Export iCal</a>
                    <div class="format-info">
                        <strong>Calendario iCal</strong><br>
                        Formato standard calendario.
                        Importabile in Google Calendar, Outlook, Apple Calendar.
                    </div>
                </div>
            </div>
        </div>

        <!-- Backup Automatico -->
        <div class="section">
            <h3>🔄 Backup Automatico</h3>
            <p>Gestione backup automatici del sistema.</p>
            
            <div class="button-grid">
                <a href="?action=auto_backup" class="btn">💾 Crea Backup Ora</a>
                <a href="?action=cleanup_old" class="btn btn-warning">🧹 Pulisci Vecchi Backup</a>
            </div>
            
            <div class="format-info">
                <strong>📋 Configurazione Automatica:</strong><br>
                • Frequenza: Ogni <?= getAgendaConfig('AGENDA_BACKUP_FREQUENCY_HOURS', 24) ?> ore<br>
                • Conservazione: <?= getAgendaConfig('AGENDA_BACKUP_RETENTION_COUNT', 30) ?> backup<br>
                • Directory: <?= getAgendaConfig('AGENDA_BACKUP_DIRECTORY', '/tmp/agenda_backups/') ?>
            </div>
        </div>

        <!-- Informazioni Restore -->
        <div class="section">
            <h3>🔄 Ripristino Dati</h3>
            <p>Per ripristinare un backup, contatta l'amministratore di sistema con il file di backup desiderato.</p>
            
            <div class="format-info">
                <strong>⚠️ Importante:</strong><br>
                • Il ripristino sovrascrive tutti i dati esistenti<br>
                • Fai sempre un backup prima del ripristino<br>
                • Solo file JSON permettono ripristino completo<br>
                • CSV e iCal sono solo per export/import eventi
            </div>
        </div>

        <!-- Link Utili -->
        <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e9e9e7;">
            <a href="/modules/agenda/" class="btn btn-success">📅 Torna all'Agenda</a>
            <a href="/modules/agenda/test_features.php" class="btn">🧪 Test Sistema</a>
            <a href="/dashboard.php" class="btn">🏠 Dashboard</a>
        </div>
    </div>
</body>
</html>
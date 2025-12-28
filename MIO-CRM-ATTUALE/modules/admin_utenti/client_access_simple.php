<?php
// File: /modules/admin_utenti/client_access_simple.php
// Versione semplificata per testare - usa connessione diretta come login_handler.php

session_start();

// Verifica autenticazione (semplice - senza classe Auth)
if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in'] || 
    !in_array($_SESSION['role'] ?? '', ['super_admin', 'admin'])) {
    header('Location: /');
    exit;
}

// Connessione database diretta (come nel login_handler.php funzionante)
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die("Errore connessione database: " . $e->getMessage());
}

$pageTitle = 'Gestione Accessi Clienti';

// Gestione AJAX
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');
    
    try {
        switch ($_POST['action']) {
            case 'get_contacts':
                // Carica contatti dall'anagrafica
                $stmt = $pdo->prepare("
                    SELECT id, name, email, phone, company
                    FROM leads_contacts
                    WHERE status IN ('client', 'prospect', 'lead')
                    ORDER BY name
                ");
                $stmt->execute();
                $contacts = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true,
                    'contacts' => $contacts
                ]);
                exit;
                
            case 'check_table':
                // Verifica se tabella client_access esiste
                $stmt = $pdo->prepare("SHOW TABLES LIKE 'client_access'");
                $stmt->execute();
                $exists = $stmt->fetch() !== false;
                
                echo json_encode([
                    'success' => true,
                    'table_exists' => $exists
                ]);
                exit;
                
            case 'create_table':
                // Crea tabella client_access
                $sql = "
                CREATE TABLE IF NOT EXISTS client_access (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    contact_id INT NOT NULL,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NULL,
                    access_type ENUM('preventivo', 'cliente') DEFAULT 'preventivo',
                    
                    -- Campi per clienti
                    drive_folder_link VARCHAR(500) NULL,
                    documents_folder VARCHAR(500) NULL,
                    assets_folder VARCHAR(500) NULL,
                    invoice_folder VARCHAR(500) NULL,
                    bespoke_details TEXT NULL,
                    project_start_date DATE NULL,
                    project_end_date DATE NULL,
                    monthly_fee DECIMAL(10,2) NULL,
                    
                    -- Attivazione
                    is_active BOOLEAN DEFAULT 1,
                    email_verified BOOLEAN DEFAULT 0,
                    activation_token VARCHAR(100) NULL,
                    activation_expires DATETIME NULL,
                    reset_token VARCHAR(100) NULL,
                    
                    -- Tracking
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by INT NULL,
                    last_login DATETIME NULL,
                    login_attempts INT DEFAULT 0,
                    locked_until DATETIME NULL,
                    
                    FOREIGN KEY (contact_id) REFERENCES leads_contacts(id) ON DELETE CASCADE,
                    
                    INDEX idx_username (username),
                    INDEX idx_contact_id (contact_id),
                    INDEX idx_access_type (access_type)
                )";
                
                $pdo->exec($sql);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Tabella client_access creata con successo'
                ]);
                exit;
                
            case 'create_access':
                $contactId = (int)$_POST['contact_id'];
                $accessType = $_POST['access_type'];
                
                // Verifica che il contatto esista
                $stmt = $pdo->prepare("SELECT * FROM leads_contacts WHERE id = ?");
                $stmt->execute([$contactId]);
                $contact = $stmt->fetch();
                
                if (!$contact) {
                    throw new Exception('Contatto non trovato');
                }
                
                // Genera username univoco
                $baseName = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $contact['name']));
                $baseName = substr($baseName, 0, 20);
                $username = $baseName;
                $counter = 1;
                
                while (true) {
                    $stmt = $pdo->prepare("SELECT id FROM client_access WHERE username = ?");
                    $stmt->execute([$username]);
                    
                    if (!$stmt->fetch()) {
                        break;
                    }
                    
                    $username = $baseName . $counter;
                    $counter++;
                }
                
                // Genera token di attivazione
                $activationToken = bin2hex(random_bytes(32));
                $activationExpires = date('Y-m-d H:i:s', strtotime('+7 days'));
                
                // Inserisci accesso
                $stmt = $pdo->prepare("
                    INSERT INTO client_access 
                    (contact_id, username, access_type, activation_token, 
                     activation_expires, created_by, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, 0)
                ");
                
                $stmt->execute([
                    $contactId,
                    $username,
                    $accessType,
                    $activationToken,
                    $activationExpires,
                    $_SESSION['user_id']
                ]);
                
                $accessId = $pdo->lastInsertId();
                
                // Link di attivazione
                $activationLink = "https://portale.studiomismo.it/client-activation.php?token=" . $activationToken;
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Accesso creato con successo',
                    'data' => [
                        'access_id' => $accessId,
                        'username' => $username,
                        'activation_link' => $activationLink,
                        'contact_email' => $contact['email']
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

// Carica lista accessi esistenti (se la tabella esiste)
$clientAccesses = [];
try {
    $stmt = $pdo->prepare("
        SELECT 
            ca.*,
            lc.name as company_name,
            lc.email as contact_email,
            lc.phone as contact_phone
        FROM client_access ca
        INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
        ORDER BY ca.created_at DESC
    ");
    $stmt->execute();
    $clientAccesses = $stmt->fetchAll();
} catch (Exception $e) {
    // Tabella non esiste ancora
    $clientAccesses = [];
}
?>

<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?></title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        h1 {
            color: #111827;
            margin: 0;
            font-size: 28px;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
        }
        
        .btn-secondary {
            background: #f3f4f6;
            color: #374151;
        }
        
        .btn-success {
            background: #10b981;
            color: white;
        }
        
        .alert {
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .alert-warning {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fcd34d;
        }
        
        .alert-info {
            background: #eff6ff;
            color: #1e40af;
            border: 1px solid #bfdbfe;
        }
        
        .setup-section {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 30px;
        }
        
        .setup-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 12px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
        }
        
        .form-control {
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }
        
        .access-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
        }
        
        .access-type {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .access-type.preventivo {
            background: #fef3c7;
            color: #92400e;
        }
        
        .access-type.cliente {
            background: #d1fae5;
            color: #065f46;
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="page-header">
            <h1><?= htmlspecialchars($pageTitle) ?></h1>
            <div>
                <a href="/dashboard.php" class="btn btn-secondary">← Torna alla Dashboard</a>
                <button class="btn btn-primary" onclick="showCreateForm()" id="createBtn" style="display:none;">
                    + Crea Nuovo Accesso
                </button>
            </div>
        </div>

        <!-- Setup iniziale -->
        <div id="setupSection" class="setup-section">
            <div class="setup-title">🚀 Setup Sistema Clienti</div>
            <p>Prima di iniziare, verifichiamo che tutto sia configurato correttamente.</p>
            
            <div id="tableStatus" class="alert alert-warning">
                <strong>Verifica tabelle database...</strong>
            </div>
            
            <button class="btn btn-success" onclick="setupTables()">
                📦 Crea Tabelle Database
            </button>
        </div>

        <!-- Form creazione accesso -->
        <div id="createSection" class="hidden">
            <h2>Crea Nuovo Accesso Cliente</h2>
            
            <form id="createForm">
                <div class="form-group">
                    <label class="form-label">Seleziona Contatto dall'Anagrafica</label>
                    <select id="contactSelect" class="form-control" required>
                        <option value="">-- Caricamento contatti... --</option>
                    </select>
                    <div id="contactInfo" style="margin-top: 10px; display: none;"></div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Tipo di Accesso</label>
                    <select id="accessType" class="form-control" required>
                        <option value="preventivo">Preventivo (solo visualizzazione preventivo)</option>
                        <option value="cliente">Cliente (dashboard completa)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Crea Accesso</button>
                    <button type="button" class="btn btn-secondary" onclick="hideCreateForm()">Annulla</button>
                </div>
            </form>
        </div>

        <!-- Lista accessi esistenti -->
        <div id="accessesList">
            <h2>Accessi Esistenti</h2>
            
            <?php if (empty($clientAccesses)): ?>
                <div class="alert alert-info">
                    <strong>Nessun accesso cliente configurato.</strong><br>
                    Usa il pulsante "Crea Nuovo Accesso" per iniziare.
                </div>
            <?php else: ?>
                <?php foreach ($clientAccesses as $access): ?>
                <div class="access-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong><?= htmlspecialchars($access['company_name']) ?></strong>
                            <span class="access-type <?= $access['access_type'] ?>">
                                <?= $access['access_type'] ?>
                            </span>
                        </div>
                        <div>
                            <strong>Username:</strong> <?= htmlspecialchars($access['username']) ?>
                        </div>
                    </div>
                    <div style="margin-top: 10px; font-size: 14px; color: #666;">
                        📧 <?= htmlspecialchars($access['contact_email']) ?><br>
                        📅 Creato: <?= date('d/m/Y H:i', strtotime($access['created_at'])) ?>
                        <?php if (!$access['password_hash']): ?>
                            <span style="color: #f59e0b;">⚠️ In attesa di attivazione</span>
                        <?php endif; ?>
                    </div>
                </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

    <script>
        // Verifica setup al caricamento
        document.addEventListener('DOMContentLoaded', function() {
            checkSetup();
        });

        async function checkSetup() {
            try {
                const response = await fetch('', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'action=check_table'
                });
                
                const data = await response.json();
                
                if (data.success && data.table_exists) {
                    document.getElementById('setupSection').style.display = 'none';
                    document.getElementById('createBtn').style.display = 'inline-block';
                    loadContacts();
                } else {
                    document.getElementById('tableStatus').innerHTML = 
                        '<strong>⚠️ Tabella client_access non trovata.</strong> Clicca il pulsante per crearla.';
                }
            } catch (error) {
                console.error('Errore verifica setup:', error);
            }
        }

        async function setupTables() {
            try {
                const response = await fetch('', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'action=create_table'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Tabelle create con successo!');
                    checkSetup();
                } else {
                    alert('❌ Errore: ' + data.message);
                }
            } catch (error) {
                console.error('Errore creazione tabelle:', error);
                alert('Errore durante la creazione delle tabelle');
            }
        }

        async function loadContacts() {
            try {
                const response = await fetch('', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'action=get_contacts'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const select = document.getElementById('contactSelect');
                    select.innerHTML = '<option value="">-- Seleziona contatto --</option>';
                    
                    data.contacts.forEach(contact => {
                        const option = document.createElement('option');
                        option.value = contact.id;
                        option.textContent = contact.name + (contact.company ? ` (${contact.company})` : '');
                        option.dataset.email = contact.email || '';
                        option.dataset.phone = contact.phone || '';
                        select.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Errore caricamento contatti:', error);
            }
        }

        function showCreateForm() {
            document.getElementById('createSection').classList.remove('hidden');
        }

        function hideCreateForm() {
            document.getElementById('createSection').classList.add('hidden');
        }

        // Gestione form
        document.getElementById('createForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('action', 'create_access');
            formData.append('contact_id', document.getElementById('contactSelect').value);
            formData.append('access_type', document.getElementById('accessType').value);
            
            try {
                const response = await fetch('', {
                    method: 'POST',
                    body: new URLSearchParams(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(`✅ Accesso creato!\n\nUsername: ${data.data.username}\n\nLink attivazione:\n${data.data.activation_link}\n\n📋 Link copiato negli appunti!`);
                    
                    // Copia link negli appunti
                    navigator.clipboard.writeText(data.data.activation_link);
                    
                    // Ricarica pagina
                    location.reload();
                } else {
                    alert('❌ Errore: ' + data.message);
                }
            } catch (error) {
                console.error('Errore:', error);
                alert('Errore durante la creazione dell\'accesso');
            }
        });

        // Mostra info contatto selezionato
        document.getElementById('contactSelect').addEventListener('change', function() {
            const selected = this.options[this.selectedIndex];
            const infoDiv = document.getElementById('contactInfo');
            
            if (this.value) {
                infoDiv.innerHTML = `
                    <div style="background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 14px;">
                        <strong>${selected.text}</strong><br>
                        📧 ${selected.dataset.email || 'Email non disponibile'}<br>
                        📱 ${selected.dataset.phone || 'Telefono non disponibile'}
                    </div>
                `;
                infoDiv.style.display = 'block';
            } else {
                infoDiv.style.display = 'none';
            }
        });
    </script>
</body>
</html>
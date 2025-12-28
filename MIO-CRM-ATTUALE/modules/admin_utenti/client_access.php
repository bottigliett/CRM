<?php
// File: /modules/admin_utenti/client_access.php
// Gestione accessi clienti - CRM Studio Mismo

session_start();
require_once '../../core/config/database.php';
require_once '../../core/auth/Auth.php';

// Verifica autenticazione admin
if (!Auth::isLoggedIn() || !Auth::hasRole(['super_admin', 'admin'])) {
    header('Location: /');
    exit;
}

$currentUser = Auth::getCurrentUser();
$pageTitle = 'Gestione Accessi Clienti';

// Gestione AJAX
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');
    
    try {
        $db = getDB();
        
        switch ($_POST['action']) {
            case 'create_access':
                $contactId = (int)$_POST['contact_id'];
                $accessType = $_POST['access_type'];
                
                // Verifica che il contatto esista
                $stmt = $db->prepare("SELECT * FROM leads_contacts WHERE id = ?");
                $stmt->execute([$contactId]);
                $contact = $stmt->fetch();
                
                if (!$contact) {
                    throw new Exception('Contatto non trovato');
                }
                
                // Verifica che non esista già un accesso per questo contatto
                $stmt = $db->prepare("SELECT id FROM client_access WHERE contact_id = ?");
                $stmt->execute([$contactId]);
                if ($stmt->fetch()) {
                    throw new Exception('Esiste già un accesso per questo contatto');
                }
                
                // Genera username e token di attivazione
                $username = generateUsername($contact['name']);
                $activationToken = bin2hex(random_bytes(32));
                $activationExpires = date('Y-m-d H:i:s', strtotime('+7 days'));
                
                // Inserisci accesso
                $stmt = $db->prepare("
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
                    $currentUser['id']
                ]);
                
                $accessId = $db->lastInsertId();
                
                // Se è tipo cliente, aggiungi i dettagli extra
                if ($accessType === 'cliente' && isset($_POST['client_details'])) {
                    $details = $_POST['client_details'];
                    $stmt = $db->prepare("
                        UPDATE client_access 
                        SET drive_folder_link = ?,
                            documents_folder = ?,
                            assets_folder = ?,
                            invoice_folder = ?,
                            bespoke_details = ?,
                            project_start_date = ?,
                            project_end_date = ?,
                            monthly_fee = ?
                        WHERE id = ?
                    ");
                    
                    $stmt->execute([
                        $details['drive_folder_link'] ?? null,
                        $details['documents_folder'] ?? null,
                        $details['assets_folder'] ?? null,
                        $details['invoice_folder'] ?? null,
                        isset($details['bespoke_details']) ? json_encode($details['bespoke_details']) : null,
                        $details['project_start_date'] ?? null,
                        $details['project_end_date'] ?? null,
                        $details['monthly_fee'] ?? null,
                        $accessId
                    ]);
                }
                
                // Genera link di attivazione
                $activationLink = SITE_URL . "/client-activation.php?token=" . $activationToken;
                
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
                
            case 'upgrade_to_client':
                $accessId = (int)$_POST['access_id'];
                
                // Verifica che l'accesso esista e sia di tipo preventivo
                $stmt = $db->prepare("
                    SELECT * FROM client_access 
                    WHERE id = ? AND access_type = 'preventivo'
                ");
                $stmt->execute([$accessId]);
                $access = $stmt->fetch();
                
                if (!$access) {
                    throw new Exception('Accesso non trovato o già cliente');
                }
                
                $details = $_POST['client_details'];
                
                // Aggiorna a cliente
                $stmt = $db->prepare("
                    UPDATE client_access 
                    SET access_type = 'cliente',
                        drive_folder_link = ?,
                        documents_folder = ?,
                        assets_folder = ?,
                        invoice_folder = ?,
                        bespoke_details = ?,
                        project_start_date = ?,
                        project_end_date = ?,
                        monthly_fee = ?
                    WHERE id = ?
                ");
                
                $stmt->execute([
                    $details['drive_folder_link'] ?? null,
                    $details['documents_folder'] ?? null,
                    $details['assets_folder'] ?? null,
                    $details['invoice_folder'] ?? null,
                    isset($details['bespoke_details']) ? json_encode($details['bespoke_details']) : null,
                    $details['project_start_date'] ?? null,
                    $details['project_end_date'] ?? null,
                    $details['monthly_fee'] ?? null,
                    $accessId
                ]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Accesso aggiornato a cliente con successo'
                ]);
                exit;
                
            case 'toggle_status':
                $accessId = (int)$_POST['access_id'];
                
                $stmt = $db->prepare("
                    UPDATE client_access 
                    SET is_active = NOT is_active 
                    WHERE id = ?
                ");
                $stmt->execute([$accessId]);
                
                echo json_encode(['success' => true]);
                exit;
                
            case 'resend_activation':
                $accessId = (int)$_POST['access_id'];
                
                // Genera nuovo token
                $activationToken = bin2hex(random_bytes(32));
                $activationExpires = date('Y-m-d H:i:s', strtotime('+7 days'));
                
                $stmt = $db->prepare("
                    UPDATE client_access 
                    SET activation_token = ?, 
                        activation_expires = ?
                    WHERE id = ? AND password_hash IS NULL
                ");
                $stmt->execute([$activationToken, $activationExpires, $accessId]);
                
                if ($stmt->rowCount() === 0) {
                    throw new Exception('Account già attivato o non trovato');
                }
                
                $activationLink = SITE_URL . "/client-activation.php?token=" . $activationToken;
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Link di attivazione rigenerato',
                    'activation_link' => $activationLink
                ]);
                exit;
                
            case 'get_contacts':
                // Per il select di selezione contatto
                $stmt = $db->prepare("
                    SELECT lc.id, lc.name, lc.email, lc.phone,
                           ca.id as has_access
                    FROM leads_contacts lc
                    LEFT JOIN client_access ca ON lc.id = ca.contact_id
                    WHERE lc.status IN ('client', 'prospect')
                    ORDER BY lc.name
                ");
                $stmt->execute();
                
                echo json_encode([
                    'success' => true,
                    'contacts' => $stmt->fetchAll()
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

// Funzione per generare username univoco
function generateUsername($companyName) {
    $db = getDB();
    
    // Pulisci il nome
    $base = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $companyName));
    $base = substr($base, 0, 20); // Limita lunghezza
    
    // Verifica unicità
    $username = $base;
    $counter = 1;
    
    while (true) {
        $stmt = $db->prepare("SELECT id FROM client_access WHERE username = ?");
        $stmt->execute([$username]);
        
        if (!$stmt->fetch()) {
            break;
        }
        
        $username = $base . $counter;
        $counter++;
    }
    
    return $username;
}

// Carica lista accessi
$db = getDB();
$stmt = $db->prepare("
    SELECT 
        ca.*,
        lc.name as company_name,
        lc.email as contact_email,
        lc.phone as contact_phone,
        u.first_name as created_by_name
    FROM client_access ca
    INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
    LEFT JOIN users u ON ca.created_by = u.id
    ORDER BY ca.created_at DESC
");
$stmt->execute();
$clientAccesses = $stmt->fetchAll();

// Contenuto della pagina
ob_start();
?>

<style>
    .access-grid {
        display: grid;
        gap: 20px;
        margin-bottom: 30px;
    }
    
    .access-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
    }
    
    .access-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }
    
    .company-name {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
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
    
    .access-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 15px;
    }
    
    .detail-item {
        font-size: 14px;
    }
    
    .detail-label {
        color: #6b7280;
        margin-bottom: 2px;
    }
    
    .detail-value {
        color: #111827;
        font-weight: 500;
    }
    
    .access-actions {
        display: flex;
        gap: 10px;
        padding-top: 15px;
        border-top: 1px solid #e5e7eb;
    }
    
    .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
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
    
    .btn-secondary:hover {
        background: #e5e7eb;
    }
    
    .btn-success {
        background: #10b981;
        color: white;
    }
    
    .btn-danger {
        background: #ef4444;
        color: white;
    }
    
    .status-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .status-badge.active {
        background: #d1fae5;
        color: #065f46;
    }
    
    .status-badge.inactive {
        background: #fee2e2;
        color: #991b1b;
    }
    
    .status-badge.pending {
        background: #fef3c7;
        color: #92400e;
    }
    
    /* Modal styles */
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        align-items: center;
        justify-content: center;
    }
    
    .modal.active {
        display: flex;
    }
    
    .modal-content {
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    .modal-header {
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .modal-title {
        font-size: 20px;
        font-weight: 600;
        color: #111827;
    }
    
    .modal-body {
        padding: 24px;
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
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
    }
    
    .form-control:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .form-select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
        background-position: right 10px center;
        background-repeat: no-repeat;
        background-size: 20px;
        padding-right: 40px;
    }
    
    .form-section {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e5e7eb;
    }
    
    .form-section-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        margin-bottom: 16px;
    }
    
    .activation-link {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        padding: 12px;
        margin-top: 12px;
        word-break: break-all;
        font-family: monospace;
        font-size: 12px;
        color: #1e40af;
    }
</style>

<div class="container">
    <div class="page-header">
        <h1><?= htmlspecialchars($pageTitle) ?></h1>
        <button class="btn btn-primary" onclick="openCreateModal()">
            + Crea Nuovo Accesso
        </button>
    </div>
    
    <div class="access-grid">
        <?php foreach ($clientAccesses as $access): ?>
        <div class="access-card" data-access-id="<?= $access['id'] ?>">
            <div class="access-header">
                <div>
                    <div class="company-name"><?= htmlspecialchars($access['company_name']) ?></div>
                    <span class="access-type <?= $access['access_type'] ?>">
                        <?= $access['access_type'] ?>
                    </span>
                    <?php if ($access['is_active']): ?>
                        <span class="status-badge active">Attivo</span>
                    <?php elseif (!$access['password_hash']): ?>
                        <span class="status-badge pending">In attesa di attivazione</span>
                    <?php else: ?>
                        <span class="status-badge inactive">Disattivato</span>
                    <?php endif; ?>
                </div>
            </div>
            
            <div class="access-details">
                <div class="detail-item">
                    <div class="detail-label">Username</div>
                    <div class="detail-value"><?= htmlspecialchars($access['username']) ?></div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value"><?= htmlspecialchars($access['contact_email']) ?></div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Creato da</div>
                    <div class="detail-value"><?= htmlspecialchars($access['created_by_name']) ?></div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Ultimo accesso</div>
                    <div class="detail-value">
                        <?= $access['last_login'] ? date('d/m/Y H:i', strtotime($access['last_login'])) : 'Mai' ?>
                    </div>
                </div>
            </div>
            
            <?php if ($access['access_type'] === 'cliente'): ?>
            <div class="access-details">
                <?php if ($access['drive_folder_link']): ?>
                <div class="detail-item">
                    <div class="detail-label">📁 Google Drive</div>
                    <a href="<?= htmlspecialchars($access['drive_folder_link']) ?>" target="_blank" class="detail-value">
                        Apri cartella
                    </a>
                </div>
                <?php endif; ?>
                <?php if ($access['monthly_fee']): ?>
                <div class="detail-item">
                    <div class="detail-label">Canone mensile</div>
                    <div class="detail-value">€ <?= number_format($access['monthly_fee'], 2, ',', '.') ?></div>
                </div>
                <?php endif; ?>
            </div>
            <?php endif; ?>
            
            <div class="access-actions">
                <?php if (!$access['password_hash']): ?>
                    <button class="btn btn-secondary" onclick="resendActivation(<?= $access['id'] ?>)">
                        📧 Reinvia attivazione
                    </button>
                <?php endif; ?>
                
                <?php if ($access['access_type'] === 'preventivo'): ?>
                    <button class="btn btn-success" onclick="upgradeToClient(<?= $access['id'] ?>)">
                        ⬆️ Converti a Cliente
                    </button>
                <?php endif; ?>
                
                <button class="btn btn-secondary" onclick="toggleStatus(<?= $access['id'] ?>)">
                    <?= $access['is_active'] ? '🔒 Disattiva' : '🔓 Attiva' ?>
                </button>
                
                <button class="btn btn-secondary" onclick="viewDetails(<?= $access['id'] ?>)">
                    👁️ Dettagli
                </button>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<!-- Modal Creazione Accesso -->
<div id="createModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title">Crea Nuovo Accesso Cliente</h2>
        </div>
        <div class="modal-body">
            <form id="createAccessForm">
                <div class="form-group">
                    <label class="form-label">Seleziona Contatto dall'Anagrafica</label>
                    <select id="contactSelect" name="contact_id" class="form-control form-select" required>
                        <option value="">-- Seleziona --</option>
                    </select>
                    <div id="contactInfo" style="margin-top: 10px; display: none;">
                        <div style="background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 14px;">
                            <div id="contactDetails"></div>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Tipo di Accesso</label>
                    <select id="accessType" name="access_type" class="form-control form-select" required>
                        <option value="preventivo">Preventivo (solo visualizzazione preventivo)</option>
                        <option value="cliente">Cliente (dashboard completa)</option>
                    </select>
                </div>
                
                <div id="clientDetailsSection" class="form-section" style="display: none;">
                    <h3 class="form-section-title">Dettagli Cliente</h3>
                    
                    <div class="form-group">
                        <label class="form-label">Link Cartella Google Drive</label>
                        <input type="url" name="drive_folder_link" class="form-control" 
                               placeholder="https://drive.google.com/...">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Link Documenti</label>
                        <input type="url" name="documents_folder" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Link Assets</label>
                        <input type="url" name="assets_folder" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Link Fatture</label>
                        <input type="url" name="invoice_folder" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Data Inizio Progetto</label>
                        <input type="date" name="project_start_date" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Data Fine Progetto</label>
                        <input type="date" name="project_end_date" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Canone Mensile (€)</label>
                        <input type="number" name="monthly_fee" class="form-control" 
                               step="0.01" min="0" placeholder="0.00">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Dettagli Bespoke (opzionale)</label>
                        <textarea name="bespoke_details" class="form-control" rows="4"
                                  placeholder="Inserisci dettagli del progetto Bespoke..."></textarea>
                    </div>
                </div>
                
                <div class="modal-footer" style="display: flex; justify-content: space-between; margin-top: 24px;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('createModal')">
                        Annulla
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Crea Accesso
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
// Carica contatti al caricamento pagina
document.addEventListener('DOMContentLoaded', function() {
    loadContacts();
});

// Gestione cambio tipo accesso
document.getElementById('accessType').addEventListener('change', function() {
    const clientSection = document.getElementById('clientDetailsSection');
    if (this.value === 'cliente') {
        clientSection.style.display = 'block';
    } else {
        clientSection.style.display = 'none';
    }
});

// Carica lista contatti
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
            select.innerHTML = '<option value="">-- Seleziona --</option>';
            
            data.contacts.forEach(contact => {
                const option = document.createElement('option');
                option.value = contact.id;
                option.textContent = contact.name;
                if (contact.has_access) {
                    option.textContent += ' ⚠️ (ha già accesso)';
                    option.disabled = true;
                }
                option.dataset.email = contact.email || '';
                option.dataset.phone = contact.phone || '';
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Errore caricamento contatti:', error);
    }
}

// Mostra info contatto selezionato
document.getElementById('contactSelect').addEventListener('change', function() {
    const selected = this.options[this.selectedIndex];
    const infoDiv = document.getElementById('contactInfo');
    const detailsDiv = document.getElementById('contactDetails');
    
    if (this.value) {
        detailsDiv.innerHTML = `
            <strong>${selected.text}</strong><br>
            📧 ${selected.dataset.email || 'Email non disponibile'}<br>
            📱 ${selected.dataset.phone || 'Telefono non disponibile'}
        `;
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
    }
});

// Gestione form creazione
document.getElementById('createAccessForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    formData.append('action', 'create_access');
    
    // Aggiungi dettagli cliente se necessario
    if (document.getElementById('accessType').value === 'cliente') {
        const clientDetails = {};
        ['drive_folder_link', 'documents_folder', 'assets_folder', 'invoice_folder',
         'project_start_date', 'project_end_date', 'monthly_fee'].forEach(field => {
            const value = this.elements[field].value;
            if (value) clientDetails[field] = value;
        });
        
        const bespokeDetails = this.elements['bespoke_details'].value;
        if (bespokeDetails) {
            clientDetails.bespoke_details = bespokeDetails;
        }
        
        formData.append('client_details', JSON.stringify(clientDetails));
    }
    
    try {
        const response = await fetch('', {
            method: 'POST',
            body: new URLSearchParams(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Mostra link di attivazione
            alert(`Accesso creato!\n\nUsername: ${data.data.username}\n\nLink attivazione:\n${data.data.activation_link}\n\nInvia questo link al cliente per attivare l'account.`);
            
            // Copia automaticamente il link
            navigator.clipboard.writeText(data.data.activation_link);
            
            closeModal('createModal');
            location.reload();
        } else {
            alert('Errore: ' + data.message);
        }
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante la creazione dell\'accesso');
    }
});

// Funzioni utility
function openCreateModal() {
    document.getElementById('createModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

async function resendActivation(accessId) {
    if (!confirm('Vuoi rigenerare il link di attivazione?')) return;
    
    try {
        const response = await fetch('', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `action=resend_activation&access_id=${accessId}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Nuovo link di attivazione:\n${data.activation_link}`);
            navigator.clipboard.writeText(data.activation_link);
        } else {
            alert('Errore: ' + data.message);
        }
    } catch (error) {
        console.error('Errore:', error);
    }
}

async function toggleStatus(accessId) {
    if (!confirm('Vuoi cambiare lo stato di questo accesso?')) return;
    
    try {
        const response = await fetch('', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `action=toggle_status&access_id=${accessId}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            location.reload();
        }
    } catch (error) {
        console.error('Errore:', error);
    }
}

function upgradeToClient(accessId) {
    // TODO: Implementare modal per upgrade con campi aggiuntivi
    alert('Funzione in sviluppo: Upgrade a cliente');
}

function viewDetails(accessId) {
    // TODO: Implementare visualizzazione dettagli completi
    alert('Funzione in sviluppo: Visualizza dettagli');
}
</script>

<?php
$pageContent = ob_get_clean();

// Includi il layout
$additionalCSS = [];
$additionalJS = [];
require_once '../../core/includes/layout_base.php';
?>
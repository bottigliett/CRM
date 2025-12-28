<?php
// File: /modules/ticket/index.php
// Gestione Ticket - Admin Dashboard - Stile Notion

require_once __DIR__ . '/../../core/includes/auth_helper.php';

// Verifica autenticazione
$currentUser = getCurrentUser();

// Sostituisci requireAuth() con:
requireModulePermission('ticket', 'read');

// Per controlli granulari:
$canWrite = hasPermission('ticket', 'write');
$canDelete = hasPermission('ticket', 'delete');

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

// Carica statistiche ticket
$stats = [
    'total' => 0,
    'open' => 0,
    'in_progress' => 0,
    'resolved' => 0,
    'urgent' => 0
];

$stmt = $pdo->query("
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'aperto' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_lavorazione' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'risolto' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN priority = 'urgente' THEN 1 ELSE 0 END) as urgent
    FROM tickets
    WHERE status != 'chiuso'
");
$stats = $stmt->fetch() ?: $stats;

// Carica lista ticket
$filter = $_GET['filter'] ?? 'all';
$search = $_GET['search'] ?? '';

$query = "
    SELECT t.*, 
           ca.username as client_username,
           lc.name as client_name,
           u.first_name as assigned_name
    FROM tickets t
    LEFT JOIN client_access ca ON t.client_id = ca.id
    LEFT JOIN leads_contacts lc ON t.contact_id = lc.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE 1=1
";

$params = [];

// Applica filtri
if ($filter === 'my') {
    $query .= " AND t.assigned_to = ?";
    $params[] = $currentUser['id'];
} elseif ($filter === 'open') {
    $query .= " AND t.status = 'aperto'";
} elseif ($filter === 'urgent') {
    $query .= " AND t.priority = 'urgente'";
}

// Ricerca
if ($search) {
    $query .= " AND (t.ticket_number LIKE ? OR t.subject LIKE ? OR lc.name LIKE ?)";
    $searchParam = "%$search%";
    $params[] = $searchParam;
    $params[] = $searchParam;
    $params[] = $searchParam;
}

$query .= " ORDER BY 
    CASE t.priority 
        WHEN 'urgente' THEN 1 
        WHEN 'normale' THEN 2 
        WHEN 'bassa' THEN 3 
    END,
    t.created_at DESC";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$tickets = $stmt->fetchAll();

// Carica clienti per gestione ore
$stmt = $pdo->query("
    SELECT ca.*, lc.name as client_name 
    FROM client_access ca
    INNER JOIN leads_contacts lc ON ca.contact_id = lc.id
    WHERE ca.access_type = 'cliente'
    ORDER BY lc.name
");
$clients = $stmt->fetchAll();

ob_start();
?>

<style>
/* Stile Notion per Ticket */
.ticket-container {
    padding: 0;
}

.ticket-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
}

.ticket-title {
    display: flex;
    align-items: center;
    gap: 16px;
}

.ticket-title h1 {
    font-size: 32px;
    font-weight: 700;
    color: #37352f;
    margin: 0;
}

.ticket-controls {
    display: flex;
    gap: 12px;
}

.btn-notion {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid;
    background: #ffffff;
    color: #37352f;
    border-color: #e9e9e7;
}

.btn-notion:hover {
    background: #f7f7f5;
    border-color: #d3d3d1;
}

.btn-primary {
    background: #37352f;
    color: #ffffff;
    border-color: #37352f;
}

.btn-primary:hover {
    background: #2f2d29;
}

/* Stats Cards */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
}

.stat-card {
    background: #ffffff;
    border: 1px solid #e9e9e7;
    border-radius: 8px;
    padding: 20px;
    transition: all 0.2s ease;
}

.stat-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}

.stat-icon {
    font-size: 24px;
    margin-bottom: 8px;
}

.stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #37352f;
    margin-bottom: 4px;
}

.stat-label {
    font-size: 13px;
    color: #787774;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Filters */
.ticket-filters {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e9e9e7;
}

.filter-btn {
    padding: 6px 12px;
    border: 1px solid transparent;
    background: transparent;
    color: #787774;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.15s ease;
}

.filter-btn:hover {
    background: #f7f7f5;
    color: #37352f;
}

.filter-btn.active {
    background: #37352f;
    color: #ffffff;
}

/* Ticket List */
.ticket-list {
    background: #ffffff;
    border: 1px solid #e9e9e7;
    border-radius: 8px;
    overflow: hidden;
}

.ticket-item {
    display: grid;
    grid-template-columns: 60px 1fr 150px 150px 100px;
    gap: 16px;
    padding: 20px;
    border-bottom: 1px solid #f0f0f0;
    transition: all 0.15s ease;
    align-items: center;
    cursor: pointer;
}

.ticket-item:hover {
    background: #f7f7f5;
}

.ticket-number {
    font-size: 12px;
    font-weight: 600;
    color: #787774;
}

.ticket-content {
    min-width: 0;
}

.ticket-subject {
    font-size: 15px;
    font-weight: 600;
    color: #37352f;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ticket-meta {
    display: flex;
    gap: 12px;
    font-size: 13px;
    color: #787774;
}

.priority-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.priority-urgente {
    background: #fee2e2;
    color: #991b1b;
}

.priority-normale {
    background: #fef3c7;
    color: #92400e;
}

.priority-bassa {
    background: #e0e7ff;
    color: #3730a3;
}

.status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
}

.status-aperto {
    background: #dbeafe;
    color: #1e40af;
}

.status-in_lavorazione {
    background: #fef3c7;
    color: #92400e;
}

.status-risolto {
    background: #d1fae5;
    color: #065f46;
}

.time-spent {
    text-align: right;
    font-size: 14px;
    color: #37352f;
    font-weight: 500;
}

/* Modal */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    align-items: center;
    justify-content: center;
}

.modal.show {
    display: flex;
}

.modal-content {
    background: #ffffff;
    border-radius: 12px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
    padding: 24px;
    border-bottom: 1px solid #e9e9e7;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-title {
    font-size: 20px;
    font-weight: 600;
    color: #37352f;
}

.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    color: #787774;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
}

.modal-close:hover {
    background: #f7f7f5;
}

.modal-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
}

.modal-footer {
    padding: 20px 24px;
    border-top: 1px solid #e9e9e7;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #37352f;
    margin-bottom: 8px;
}

.form-control {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d3d3d1;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    background: #ffffff;
    transition: all 0.15s ease;
}

.form-control:focus {
    outline: none;
    border-color: #37352f;
    box-shadow: 0 0 0 1px #37352f;
}

/* Client Support Hours Section */
.support-hours-section {
    background: #f7f7f5;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 32px;
}

.hours-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
    margin-top: 20px;
}

.hours-card {
    background: #ffffff;
    border: 1px solid #e9e9e7;
    border-radius: 6px;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.hours-info {
    flex: 1;
}

.hours-client {
    font-weight: 600;
    color: #37352f;
    margin-bottom: 4px;
}

.hours-detail {
    font-size: 13px;
    color: #787774;
}

.hours-action {
    display: flex;
    gap: 8px;
}

.btn-edit-hours {
    padding: 4px 8px;
    background: #e9e9e7;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.btn-edit-hours:hover {
    background: #d3d3d1;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #787774;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.empty-title {
    font-size: 18px;
    font-weight: 600;
    color: #37352f;
    margin-bottom: 8px;
}

.empty-text {
    font-size: 14px;
}

/* Timeline */
.ticket-timeline {
    border-left: 2px solid #e9e9e7;
    padding-left: 24px;
    margin-top: 24px;
}

.timeline-item {
    position: relative;
    padding-bottom: 24px;
}

.timeline-dot {
    position: absolute;
    left: -29px;
    top: 4px;
    width: 12px;
    height: 12px;
    background: #ffffff;
    border: 2px solid #e9e9e7;
    border-radius: 50%;
}

.timeline-item.message .timeline-dot {
    border-color: #3b82f6;
    background: #3b82f6;
}

.timeline-content {
    background: #f7f7f5;
    padding: 16px;
    border-radius: 6px;
}

.timeline-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
}

.timeline-author {
    font-weight: 600;
    color: #37352f;
}

.timeline-time {
    font-size: 12px;
    color: #787774;
}

.timeline-message {
    color: #37352f;
    line-height: 1.5;
}
</style>

<div class="ticket-container">
    <!-- Header -->
    <div class="ticket-header">
        <div class="ticket-title">
            <h1>🎫 Gestione Ticket</h1>
        </div>
        <div class="ticket-controls">
            <button class="btn-notion" onclick="openSupportHoursModal()">
                ⏱️ Gestisci Ore Support
            </button>
            <button class="btn-notion btn-primary" onclick="refreshTickets()">
                🔄 Aggiorna
            </button>
        </div>
    </div>
    
    <!-- Statistics -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-value"><?= $stats['total'] ?></div>
            <div class="stat-label">Ticket Totali</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🆕</div>
            <div class="stat-value"><?= $stats['open'] ?></div>
            <div class="stat-label">Aperti</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">⚙️</div>
            <div class="stat-value"><?= $stats['in_progress'] ?></div>
            <div class="stat-label">In Lavorazione</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-value"><?= $stats['resolved'] ?></div>
            <div class="stat-label">Risolti</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🚨</div>
            <div class="stat-value"><?= $stats['urgent'] ?></div>
            <div class="stat-label">Urgenti</div>
        </div>
    </div>
    
    <!-- Filters -->
    <div class="ticket-filters">
        <button class="filter-btn <?= $filter === 'all' ? 'active' : '' ?>" onclick="filterTickets('all')">
            Tutti
        </button>
        <button class="filter-btn <?= $filter === 'my' ? 'active' : '' ?>" onclick="filterTickets('my')">
            I miei ticket
        </button>
        <button class="filter-btn <?= $filter === 'open' ? 'active' : '' ?>" onclick="filterTickets('open')">
            Solo aperti
        </button>
        <button class="filter-btn <?= $filter === 'urgent' ? 'active' : '' ?>" onclick="filterTickets('urgent')">
            Urgenti
        </button>
        
        <div style="margin-left: auto;">
            <input type="text" class="form-control" placeholder="🔍 Cerca ticket..." 
                   id="searchTickets" value="<?= htmlspecialchars($search) ?>" 
                   onkeyup="if(event.key==='Enter') searchTickets()">
        </div>
    </div>
    
    <!-- Tickets List -->
    <?php if (count($tickets) > 0): ?>
    <div class="ticket-list">
        <?php foreach ($tickets as $ticket): ?>
        <div class="ticket-item" onclick="openTicketDetail(<?= $ticket['id'] ?>)">
            <div>
                <div class="ticket-number">#<?= htmlspecialchars($ticket['ticket_number']) ?></div>
                <span class="priority-badge priority-<?= $ticket['priority'] ?>">
                    <?= ucfirst($ticket['priority']) ?>
                </span>
            </div>
            
            <div class="ticket-content">
                <div class="ticket-subject"><?= htmlspecialchars($ticket['subject']) ?></div>
                <div class="ticket-meta">
                    <span>👤 <?= htmlspecialchars($ticket['client_name']) ?></span>
                    <span>📅 <?= date('d/m/Y H:i', strtotime($ticket['created_at'])) ?></span>
                    <span>🏷️ <?= ucfirst($ticket['support_type']) ?></span>
                </div>
            </div>
            
            <div>
                <span class="status-badge status-<?= $ticket['status'] ?>">
                    <?= str_replace('_', ' ', ucfirst($ticket['status'])) ?>
                </span>
            </div>
            
            <div>
                <?php if ($ticket['assigned_to']): ?>
                <span style="font-size: 13px; color: #787774;">
                    👨‍💻 <?= htmlspecialchars($ticket['assigned_name']) ?>
                </span>
                <?php else: ?>
                <span style="font-size: 13px; color: #dc2626;">
                    Non assegnato
                </span>
                <?php endif; ?>
            </div>
            
            <div class="time-spent">
                <?php if ($ticket['time_spent_minutes'] > 0): ?>
                    ⏱️ <?= sprintf('%dh %dm', floor($ticket['time_spent_minutes']/60), $ticket['time_spent_minutes']%60) ?>
                <?php else: ?>
                    <span style="color: #9ca3af;">--</span>
                <?php endif; ?>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    <?php else: ?>
    <div class="empty-state">
        <div class="empty-icon">🎫</div>
        <div class="empty-title">Nessun ticket trovato</div>
        <div class="empty-text">Non ci sono ticket che corrispondono ai criteri di ricerca</div>
    </div>
    <?php endif; ?>
</div>

<!-- Modal Dettaglio Ticket -->
<div id="ticketDetailModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title" id="modalTicketTitle">Dettaglio Ticket</h2>
            <button class="modal-close" onclick="closeTicketDetail()">&times;</button>
        </div>
        <div class="modal-body" id="ticketDetailContent">
            <!-- Caricato via AJAX -->
        </div>
        <div class="modal-footer" id="ticketDetailFooter">
            <!-- Caricato via AJAX -->
        </div>
    </div>
</div>

<!-- Modal Gestione Ore Support -->
<div id="supportHoursModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title">⏱️ Gestione Ore Supporto Clienti</h2>
            <button class="modal-close" onclick="closeSupportHoursModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="support-hours-section">
                <h3 style="margin-bottom: 16px;">Ore di supporto per cliente</h3>
                <div class="hours-grid">
                    <?php foreach ($clients as $client): ?>
                    <div class="hours-card">
                        <div class="hours-info">
                            <div class="hours-client"><?= htmlspecialchars($client['client_name']) ?></div>
                            <div class="hours-detail">
                                Incluse: <strong><?= $client['support_hours_included'] ?>h</strong> | 
                                Usate: <strong><?= number_format($client['support_hours_used'], 1) ?>h</strong>
                                <?php 
                                $remaining = $client['support_hours_included'] - $client['support_hours_used'];
                                $color = $remaining > 0 ? '#10b981' : '#ef4444';
                                ?>
                                <span style="color: <?= $color ?>; font-weight: 600;">
                                    (<?= number_format($remaining, 1) ?>h rimanenti)
                                </span>
                            </div>
                        </div>
                        <!--<div class="hours-action">
                            <button class="btn-edit-hours" onclick="editClientHours(<?= $client['id'] ?>, <?= $client['support_hours_included'] ?>)">
                                ✏️ Modifica
                            </button>
                        </div>-->
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn-notion" onclick="closeSupportHoursModal()">Chiudi</button>
        </div>
    </div>
</div>

<script>
// Variabili globali
let currentTicketId = null;

// Funzioni filtro e ricerca
function filterTickets(filter) {
    window.location.href = `?filter=${filter}`;
}

function searchTickets() {
    const search = document.getElementById('searchTickets').value;
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('search', search);
    window.location.href = `?${urlParams.toString()}`;
}

function refreshTickets() {
    location.reload();
}

// Gestione Ticket Detail
async function openTicketDetail(ticketId) {
    currentTicketId = ticketId;
    document.getElementById('ticketDetailModal').classList.add('show');
    
    // Carica dettagli ticket
    try {
        const response = await fetch(`ajax/get_ticket.php?id=${ticketId}`);
        const data = await response.json();
        
        if (data.success) {
            renderTicketDetail(data.ticket);
        }
    } catch (error) {
        console.error('Errore caricamento ticket:', error);
    }
}

function renderTicketDetail(ticket) {
    const content = document.getElementById('ticketDetailContent');
    const footer = document.getElementById('ticketDetailFooter');
    
    document.getElementById('modalTicketTitle').textContent = `Ticket #${ticket.ticket_number}`;
    
    // Render content
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
            <div>
                <h3 style="font-size: 18px; margin-bottom: 16px;">${ticket.subject}</h3>
                
                <div style="background: #f7f7f5; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                    <div style="font-weight: 600; margin-bottom: 8px;">Descrizione</div>
                    <div style="white-space: pre-wrap;">${ticket.description}</div>
                </div>
                
                <!-- Timeline messaggi -->
                <div>
                    <h4 style="margin-bottom: 16px;">Conversazione</h4>
                    <div class="ticket-timeline" id="ticketTimeline">
                        ${renderTimeline(ticket)}
                    </div>
                </div>
                
                <!-- Form risposta -->
                <div style="margin-top: 24px;">
                    <textarea id="replyMessage" class="form-control" rows="4" 
                              placeholder="Scrivi una risposta..."></textarea>
                    <div style="margin-top: 12px; display: flex; gap: 8px;">
                        <button class="btn-notion btn-primary" onclick="sendReply()">
                            📤 Invia Risposta
                        </button>
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 14px;">
                            <input type="checkbox" id="internalNote"> Nota interna
                        </label>
                    </div>
                </div>
            </div>
            
            <div>
                <!-- Info ticket -->
                <div style="background: #f7f7f5; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
                    <h4 style="margin-bottom: 12px;">Informazioni</h4>
                    <div style="font-size: 14px;">
                        <div style="margin-bottom: 8px;">
                            <span style="color: #787774;">Cliente:</span><br>
                            <strong>${ticket.client_name}</strong>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <span style="color: #787774;">Tipo:</span><br>
                            <strong>${ticket.support_type}</strong>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <span style="color: #787774;">Priorità:</span><br>
                            <span class="priority-badge priority-${ticket.priority}">
                                ${ticket.priority}
                            </span>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <span style="color: #787774;">Stato:</span><br>
                            <select id="ticketStatus" class="form-control" style="margin-top: 4px;">
                                <option value="aperto" ${ticket.status === 'aperto' ? 'selected' : ''}>Aperto</option>
                                <option value="in_lavorazione" ${ticket.status === 'in_lavorazione' ? 'selected' : ''}>In Lavorazione</option>
                                <option value="in_attesa_cliente" ${ticket.status === 'in_attesa_cliente' ? 'selected' : ''}>In Attesa Cliente</option>
                                <option value="risolto" ${ticket.status === 'risolto' ? 'selected' : ''}>Risolto</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <span style="color: #787774;">Assegnato a:</span><br>
                            <select id="ticketAssignee" class="form-control" style="margin-top: 4px;">
                                <option value="">Non assegnato</option>
                                ${renderAssigneeOptions(ticket.assigned_to)}
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Tracking tempo -->
                <div style="background: #f7f7f5; padding: 16px; border-radius: 6px;">
                    <h4 style="margin-bottom: 12px;">⏱️ Tempo Impiegato</h4>
                    <div style="margin-bottom: 12px;">
                        <strong>${formatMinutes(ticket.time_spent_minutes)}</strong>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <input type="number" id="addMinutes" class="form-control" 
                               placeholder="Minuti" min="0" step="15">
                        <button class="btn-notion" onclick="addTime()">
                            + Aggiungi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Render footer
    footer.innerHTML = `
        <div>
            <button class="btn-notion" onclick="closeTicketDetail()">Chiudi</button>
        </div>
        <div style="display: flex; gap: 8px;">
            <button class="btn-notion" onclick="saveTicketChanges()">
                💾 Salva Modifiche
            </button>
            <button class="btn-notion btn-primary" onclick="closeTicket()">
                ✅ Chiudi Ticket
            </button>
        </div>
    `;
}

function renderTimeline(ticket) {
    if (!ticket.messages || ticket.messages.length === 0) {
        return '<div style="color: #787774; text-align: center;">Nessun messaggio</div>';
    }
    
    return ticket.messages.map(msg => `
        <div class="timeline-item ${msg.message ? 'message' : 'activity'}">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <span class="timeline-author">
                        ${msg.user_id ? '👨‍💻 ' + msg.author_name : '👤 ' + msg.client_name}
                        ${msg.is_internal ? '<span style="color: #dc2626; font-size: 12px;">(Nota interna)</span>' : ''}
                    </span>
                    <span class="timeline-time">${formatTimeAgo(msg.created_at)}</span>
                </div>
                <div class="timeline-message">${msg.message}</div>
            </div>
        </div>
    `).join('');
}

function renderAssigneeOptions(currentAssignee) {
    // Qui andrebbero caricati dinamicamente gli utenti admin
    // Per ora ritorniamo opzioni statiche
    return `
        <option value="2" ${currentAssignee == 2 ? 'selected' : ''}>Davide</option>
        <option value="3" ${currentAssignee == 3 ? 'selected' : ''}>Stefano</option>
    `;
}

function formatMinutes(minutes) {
    if (!minutes) return '0 minuti';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins} minuti`;
}

function formatTimeAgo(datetime) {
    const date = new Date(datetime);
    const now = new Date();
    const diff = (now - date) / 1000; // differenza in secondi
    
    if (diff < 60) return 'Ora';
    if (diff < 3600) return Math.floor(diff/60) + ' minuti fa';
    if (diff < 86400) return Math.floor(diff/3600) + ' ore fa';
    if (diff < 604800) return Math.floor(diff/86400) + ' giorni fa';
    
    return date.toLocaleDateString('it-IT');
}

async function sendReply() {
    const message = document.getElementById('replyMessage').value.trim();
    const isInternal = document.getElementById('internalNote').checked;
    
    if (!message) return;
    
    const formData = new FormData();
    formData.append('action', 'add_message');
    formData.append('ticket_id', currentTicketId);
    formData.append('message', message);
    formData.append('is_internal', isInternal ? 1 : 0);
    
    try {
        const response = await fetch('ajax/ticket_actions.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            // Ricarica dettagli ticket
            openTicketDetail(currentTicketId);
            document.getElementById('replyMessage').value = '';
        }
    } catch (error) {
        console.error('Errore invio risposta:', error);
    }
}

async function addTime() {
    const minutes = parseInt(document.getElementById('addMinutes').value);
    if (!minutes) return;
    
    const formData = new FormData();
    formData.append('action', 'add_time');
    formData.append('ticket_id', currentTicketId);
    formData.append('minutes', minutes);
    
    try {
        const response = await fetch('ajax/ticket_actions.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            openTicketDetail(currentTicketId);
        }
    } catch (error) {
        console.error('Errore aggiunta tempo:', error);
    }
}

async function saveTicketChanges() {
    const status = document.getElementById('ticketStatus').value;
    const assignee = document.getElementById('ticketAssignee').value;
    
    const formData = new FormData();
    formData.append('action', 'update_ticket');
    formData.append('ticket_id', currentTicketId);
    formData.append('status', status);
    formData.append('assigned_to', assignee);
    
    try {
        const response = await fetch('ajax/ticket_actions.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            alert('✅ Ticket aggiornato');
            refreshTickets();
        }
    } catch (error) {
        console.error('Errore salvataggio:', error);
    }
}

async function closeTicket() {
    const notes = prompt('Note di chiusura (verranno inviate al cliente):');
    if (!notes) return;
    
    const formData = new FormData();
    formData.append('action', 'close_ticket');
    formData.append('ticket_id', currentTicketId);
    formData.append('closing_notes', notes);
    
    try {
        const response = await fetch('ajax/ticket_actions.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            alert('✅ Ticket chiuso con successo');
            closeTicketDetail();
            refreshTickets();
        }
    } catch (error) {
        console.error('Errore chiusura ticket:', error);
    }
}

function closeTicketDetail() {
    document.getElementById('ticketDetailModal').classList.remove('show');
    currentTicketId = null;
}

// Support Hours Management
function openSupportHoursModal() {
    document.getElementById('supportHoursModal').classList.add('show');
}

function closeSupportHoursModal() {
    document.getElementById('supportHoursModal').classList.remove('show');
}

async function editClientHours(clientId, currentHours) {
    const newHours = prompt(`Inserisci le nuove ore di supporto incluse (attualmente: ${currentHours}h):`);
    if (newHours === null) return;
    
    const hours = parseInt(newHours);
    if (isNaN(hours) || hours < 0) {
        alert('Inserire un numero valido di ore');
        return;
    }
    
    const formData = new FormData();
    formData.append('action', 'update_support_hours');
    formData.append('client_id', clientId);
    formData.append('hours', hours);
    
    try {
        const response = await fetch('ajax/client_support_hours.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            alert('✅ Ore aggiornate con successo');
            location.reload();
        }
    } catch (error) {
        console.error('Errore aggiornamento ore:', error);
    }
}

// Auto-refresh ogni 60 secondi
setInterval(() => {
    if (!document.querySelector('.modal.show')) {
        refreshTickets();
    }
}, 60000);
</script>

<?php
$pageContent = ob_get_clean();

// CSS e JS aggiuntivi
$additionalCSS = [];
$additionalJS = [
    '/assets/js/notifications.js'
    ];

// Rendering con layout
renderPage('Gestione Ticket', $pageContent, $additionalCSS, $additionalJS);
?>
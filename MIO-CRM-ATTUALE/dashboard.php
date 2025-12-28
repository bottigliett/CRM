<?php
// File: dashboard.php - Con controllo permessi per ogni sezione
// Dashboard principale per CRM Studio Mismo

require_once __DIR__ . '/core/includes/auth_helper.php';

// Timezone
date_default_timezone_set('Europe/Rome');
setlocale(LC_TIME, 'it_IT.UTF-8', 'it_IT', 'italian');

// Verifica autenticazione e ottieni utente
$currentUser = getCurrentUser();

// ⭐ SISTEMA PIN PER PROTEZIONE CIFRE SENSIBILI
$correctPinCode = '1258';
$isPinUnlocked = isset($_SESSION['financial_pin_unlocked']) && $_SESSION['financial_pin_unlocked'] === true;

// Gestione verifica PIN via AJAX
if (isset($_POST['action']) && $_POST['action'] === 'verify_pin') {
    header('Content-Type: application/json');
    $inputPin = $_POST['pin'] ?? '';

    if ($inputPin === $correctPinCode) {
        $_SESSION['financial_pin_unlocked'] = true;
        echo json_encode(['success' => true, 'message' => 'PIN corretto']);
    } else {
        echo json_encode(['success' => false, 'message' => 'PIN non corretto']);
    }
    exit;
}

// Gestione lock cifre (quando l'utente vuole nasconderle di nuovo)
if (isset($_POST['action']) && $_POST['action'] === 'lock_finances') {
    header('Content-Type: application/json');
    unset($_SESSION['financial_pin_unlocked']);
    echo json_encode(['success' => true]);
    exit;
}

// ⭐ CONTROLLO PERMESSI PER OGNI SEZIONE
$canViewFinance = hasPermission('finance_tracker', 'read');
$canViewAgenda = hasPermission('agenda', 'read');
$canViewTasks = hasPermission('task_manager', 'read');
$canViewProjects = hasPermission('progetti', 'read');

// Se l'utente ha permesso finanze MA non ha sbloccato il PIN, nascondi le cifre
$showFinancialNumbers = $canViewFinance && $isPinUnlocked;

// Connessione database
try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    $pdo->exec("SET time_zone = '+02:00'");
} catch (Exception $e) {
    $pdo = null;
}

// Inizializza statistiche
$stats = [
    'progetti_attivi' => 2,
    'fatturato_anno' => 0,
    'cashflow' => 0,
    'entrate_mese' => 0,
    'uscite_mese' => 0,
    'task_completati' => 0,
    'task_totali' => 0,
    'task_completion_rate' => 0
];

$recentTransactions = [];

// OTTIENI DATI FINANZIARI SOLO SE AUTORIZZATO
if ($pdo && $canViewFinance) {
    try {
        // Fatturato lordo anno
        $stmt = $pdo->prepare("
            SELECT SUM(amount) as total 
            FROM finance_transactions 
            WHERE type = 'income' 
            AND YEAR(date) = YEAR(CURDATE())
        ");
        $stmt->execute();
        $result = $stmt->fetch();
        $stats['fatturato_anno'] = $result['total'] ?? 0;
        
        // Cashflow
        $stmt = $pdo->prepare("
            SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
            FROM finance_transactions 
            WHERE YEAR(date) = YEAR(CURDATE())
        ");
        $stmt->execute();
        $cashflowData = $stmt->fetch();
        $stats['cashflow'] = ($cashflowData['total_income'] ?? 0) - ($cashflowData['total_expense'] ?? 0);
        
        // Entrate e uscite del mese
        $stmt = $pdo->prepare("
            SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income_month,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense_month
            FROM finance_transactions 
            WHERE YEAR(date) = YEAR(CURDATE()) 
            AND MONTH(date) = MONTH(CURDATE())
        ");
        $stmt->execute();
        $monthData = $stmt->fetch();
        $stats['entrate_mese'] = $monthData['income_month'] ?? 0;
        $stats['uscite_mese'] = $monthData['expense_month'] ?? 0;
        
        // Ultimi movimenti
        $stmt = $pdo->prepare("
            SELECT 
                t.date,
                t.type,
                t.amount,
                t.description,
                c.icon as category_icon,
                c.name as category_name
            FROM finance_transactions t
            LEFT JOIN finance_categories c ON t.category_id = c.id
            ORDER BY t.date DESC, t.created_at DESC
            LIMIT 5
        ");
        $stmt->execute();
        $recentTransactions = $stmt->fetchAll();
        
    } catch (Exception $e) {
        error_log("Errore caricamento dati Finance Tracker: " . $e->getMessage());
    }
}

// OTTIENI TASK SOLO SE AUTORIZZATO
$recentTasks = [];
$taskStats = [];

if ($pdo && $canViewTasks) {
    try {
        // Inizializza tabelle task se necessario
        initializeTaskManagerTables($pdo);
        
        // Statistiche task (solo NON conclusi per la stat-card)
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tasks WHERE status != 'completed'");
        $stats['task_totali'] = (int)$stmt->fetch()['count'];

        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'");
        $stats['task_completati'] = (int)$stmt->fetch()['count'];

        if ($stats['task_totali'] > 0) {
            $stats['task_completion_rate'] = round(($stats['task_completati'] / $stats['task_totali']) * 100);
        }
        
        // Task per l'utente (tutti quelli non completati e non in attesa)
        $stmt = $pdo->prepare("
            SELECT
                t.*,
                tc.name as category_name,
                tc.color as category_color,
                tc.icon as category_icon,
                c.company_name as client_name,
                u.first_name as assigned_first_name,
                u.last_name as assigned_last_name,
                CASE
                    WHEN t.deadline < CURDATE() AND t.status != 'completed' THEN 'overdue'
                    WHEN t.deadline = CURDATE() AND t.status != 'completed' THEN 'due_today'
                    WHEN t.status = 'in_progress' THEN 'in_progress'
                    ELSE 'normal'
                END as urgency_level,
                DATEDIFF(t.deadline, CURDATE()) as days_until_deadline
            FROM tasks t
            LEFT JOIN task_categories tc ON t.category_id = tc.id
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.assigned_to = ?
            AND t.status != 'completed'
            AND t.status != 'pending'
            ORDER BY t.deadline ASC
        ");
        $stmt->execute([$currentUser['id']]);
        $recentTasks = $stmt->fetchAll();

        // Debug: log numero task caricati
        error_log("Dashboard - Task caricati per utente {$currentUser['id']}: " . count($recentTasks));

        // Statistiche dettagliate (TUTTI i task NON conclusi del sistema)
        $stmt = $pdo->prepare("
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN deadline < CURDATE() THEN 1 END) as overdue,
                COUNT(CASE WHEN deadline = CURDATE() THEN 1 END) as due_today,
                COUNT(CASE WHEN assigned_to = ? AND status != 'pending' THEN 1 END) as assigned_to_me
            FROM tasks
            WHERE status != 'completed'
        ");
        $stmt->execute([$currentUser['id']]);
        $taskStats = $stmt->fetch();
        
    } catch (Exception $e) {
        error_log("Errore caricamento task: " . $e->getMessage());
    }
}

// OTTIENI EVENTI SOLO SE AUTORIZZATO
$todayEvents = [];

if ($pdo && $canViewAgenda) {
    try {
        $today = date('Y-m-d');
        // Carica TUTTI gli eventi del giorno (non solo quelli dell'utente)
        $stmt = $pdo->prepare("
            SELECT
                e.*,
                c.name as category_name,
                c.color as category_color,
                c.icon as category_icon,
                cl.company_name as client_name,
                GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name) SEPARATOR ', ') as responsables
            FROM agenda_events e
            LEFT JOIN agenda_categories c ON e.category_id = c.id
            LEFT JOIN clients cl ON e.client_id = cl.id
            LEFT JOIN agenda_event_responsables r ON e.id = r.event_id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE DATE(e.start_datetime) = ?
            AND e.status != 'cancelled'
            GROUP BY e.id
            ORDER BY e.start_datetime ASC
        ");
        $stmt->execute([$today]);
        $todayEvents = $stmt->fetchAll();

    } catch (Exception $e) {
        error_log("Errore caricamento eventi: " . $e->getMessage());
    }
}

// Genera contenuto della dashboard
ob_start();
?>

<div class="dashboard-container">
    <!-- Bottone Unlock Cifre (visibile solo se ha permessi finanza ma PIN non sbloccato) -->
    <?php if ($canViewFinance && !$isPinUnlocked): ?>
    <div style="margin-bottom: 20px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
            <div>
                <div style="font-weight: 600; color: #856404; margin-bottom: 4px;">Cifre finanziarie nascoste</div>
                <div style="font-size: 13px; color: #856404;">Per motivi di sicurezza, i dati finanziari sono bloccati. Inserisci il PIN per visualizzarli.</div>
            </div>
        </div>
        <button onclick="openPinModal()" style="background: #37352f; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; white-space: nowrap;">
            Sblocca Cifre
        </button>
    </div>
    <?php endif; ?>

    <!-- Bottone Lock Cifre (visibile solo se PIN è sbloccato) -->
    <?php if ($canViewFinance && $isPinUnlocked): ?>
    <div style="margin-bottom: 20px; padding: 10px; background: #d1fae5; border: 1px solid #059669; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
            <div>
                <div style="font-weight: 600; color: #065f46; margin-bottom: 4px;">Cifre finanziarie visibili</div>
                <div style="font-size: 13px; color: #065f46;">I dati finanziari sono attualmente visibili. Puoi nasconderli di nuovo per maggiore sicurezza.</div>
            </div>
        </div>
        <button onclick="lockFinances()" style="background: #37352f; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; white-space: nowrap;">
            Nascondi Cifre
        </button>
    </div>
    <?php endif; ?>

    <!-- Stats Cards -->
    <div class="stats-grid">
        <!-- Progetti Card -->
        
        <!-- Finance Cards -->
        <?php if ($canViewFinance): ?>
        <div class="stat-card">
            <div class="stat-content">
                <div class="stat-value <?= !$showFinancialNumbers ? 'financial-hidden' : '' ?>" data-original="€ <?= number_format($stats['fatturato_anno'], 0, ',', '.') ?>">
                    <?= $showFinancialNumbers ? '€ ' . number_format($stats['fatturato_anno'], 0, ',', '.') : '€ •••••' ?>
                </div>
                <div class="stat-label">Fatturato lordo anno solare</div>

                <!-- Progress bar obiettivo -->
                <div class="stat-breakdown">
                    <div class="goal-progress-container <?= !$showFinancialNumbers ? 'financial-hidden' : '' ?>">
                        <?php
                        $goalAmount = 50000;
                        $currentAmount = $stats['fatturato_anno'];
                        $progressPercent = min(($currentAmount / $goalAmount) * 100, 100);
                        ?>
                        <div class="goal-progress-bar">
                            <div class="goal-progress-fill" style="width: <?= $progressPercent ?>%;"
                                 title="<?= number_format($progressPercent, 1) ?>% dell'obiettivo"></div>
                        </div>
                        <div class="goal-progress-legend">
                            <span style="color: #6b7280; font-size: 11px;">
                                Obiettivo: € <?= number_format($goalAmount, 0, ',', '.') ?>
                            </span>
                            <span style="color: #10b981; font-size: 11px; font-weight: 600;">
                                <?= number_format($progressPercent, 1) ?>%
                            </span>
                        </div>
                    </div>
                    <span class="breakdown-item" style="color: #10b981;">
                        +€ <?= $showFinancialNumbers ? number_format($stats['entrate_mese'], 0, ',', '.') : '•••' ?> questo mese
                    </span>
                </div>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-content">
                <div class="stat-value <?= $stats['cashflow'] < 0 ? 'negative' : '' ?> <?= !$showFinancialNumbers ? 'financial-hidden' : '' ?>" data-original="€ <?= number_format($stats['cashflow'], 2, ',', '.') ?>">
                    <?= $showFinancialNumbers ? '€ ' . number_format($stats['cashflow'], 2, ',', '.') : '€ •••••' ?>
                </div>
                <div class="stat-label">Cashflow (Entrate - Uscite)</div>

                <!-- Mini grafico cashflow -->
                <div class="stat-breakdown">
                    <div class="cashflow-bar-container <?= !$showFinancialNumbers ? 'financial-hidden' : '' ?>">
                        <?php
                        $totalFlow = $stats['entrate_mese'] + $stats['uscite_mese'];
                        $entratePercent = $totalFlow > 0 ? ($stats['entrate_mese'] / $totalFlow) * 100 : 50;
                        $uscitePercent = $totalFlow > 0 ? ($stats['uscite_mese'] / $totalFlow) * 100 : 50;
                        ?>
                        <div class="cashflow-bar">
                            <div class="cashflow-segment entrate" style="width: <?= $entratePercent ?>%;"
                                 title="Entrate: € <?= number_format($stats['entrate_mese'], 0, ',', '.') ?>"></div>
                            <div class="cashflow-segment uscite" style="width: <?= $uscitePercent ?>%;"
                                 title="Uscite: € <?= number_format($stats['uscite_mese'], 0, ',', '.') ?>"></div>
                        </div>
                        <div class="cashflow-percentages">
                            <span style="color: #10b981; font-size: 11px; font-weight: 600;">
                                <?= $showFinancialNumbers ? number_format($entratePercent, 1) : '•••' ?>%
                            </span>
                            <span style="color: #ef4444; font-size: 11px; font-weight: 600;">
                                <?= $showFinancialNumbers ? number_format($uscitePercent, 1) : '•••' ?>%
                            </span>
                        </div>
                    </div>
                    <div class="cashflow-legend">
                        <span class="breakdown-item" style="color: #10b981;">
                            +€ <?= $showFinancialNumbers ? number_format($stats['entrate_mese'], 0, ',', '.') : '•••' ?> entrate
                        </span>
                        <span class="breakdown-item" style="color: #ef4444;">
                            -€ <?= $showFinancialNumbers ? number_format($stats['uscite_mese'], 0, ',', '.') : '•••' ?> uscite
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <?php else: ?>
        <div class="stat-card disabled">
            <div class="stat-icon">
                <i>🔒</i>
            </div>
            <div class="stat-content">
                <div class="stat-value">€ ***</div>
                <div class="stat-label">Dati finanziari riservati</div>
            </div>
        </div>
        
        <div class="stat-card disabled">
            <div class="stat-icon">
                <i>🔒</i>
            </div>
            <div class="stat-content">
                <div class="stat-value">€ ***</div>
                <div class="stat-label">Cashflow riservato</div>
            </div>
        </div>
        <?php endif; ?>
        
        <!-- Task Card -->
        <?php if ($canViewTasks): ?>
        <div class="stat-card">
             <!--<div class="stat-icon purple">
                <i>✅</i>
            </div>-->
            <div class="stat-content">
                <div class="stat-value"><?= $stats['task_totali'] ?></div>
                <div class="stat-label">Task da completare</div>
                <?php if (!empty($taskStats)): ?>
                <div class="stat-breakdown">
                    <span class="breakdown-item todo" title="Da fare">
                        <img src="/assets/images/icone/ballot.svg"
                            alt=""
                            style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">
                        <?= $taskStats['todo'] ?> da fare
                    </span>
                    <span class="breakdown-item in-progress" title="In corso">
                        <img src="/assets/images/icone/hourglass.svg"
                            alt=""
                            style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">
                        <?= $taskStats['in_progress'] ?> in corso</span>
                    <span class="breakdown-item pending" title="In attesa">
                        <img src="/assets/images/icone/pause.svg"
                            alt=""
                            style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">
                        <?= $taskStats['pending'] ?> in attesa</span>
                </div>
                <div class="stat-breakdown" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e7e5e4;">
                    <span class="breakdown-item" style="color: #6b7280; font-size: 12px;">
                        Totale: <?= $taskStats['total'] ?> task · <?= $taskStats['assigned_to_me'] ?> assegnati a me
                    </span>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <?php else: ?>
        <div class="stat-card disabled">
            <div class="stat-icon">
                <i>🔒</i>
            </div>
            <div class="stat-content">
                <div class="stat-value">-/-</div>
                <div class="stat-label">Task (Non autorizzato)</div>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <!-- Main Content Grid -->
    <div class="content-grid">
        <!-- Tasks Section -->
        <div class="content-card tasks-card">
            <div class="card-header">
                <h2>Tasks assegnati a te</h2>
                <?php if ($canViewTasks): ?>
                <div class="task-filters">
                    <!--<span class="filter-info">Tutti i task attivi</span>-->
                    <button class="btn-primary" onclick="window.location.href='/modules/task_manager/'">
                        Vai a Task Manager
                    </button>
                </div>
                <?php endif; ?>
            </div>
            
            <div class="tasks-list">
                <?php if (!$canViewTasks): ?>
                    <div class="access-denied">
                        <div class="denied-icon">🔒</div>
                        <p>Non hai accesso alla gestione tasks</p>
                        <small>Contatta l'amministratore per ottenere i permessi</small>
                    </div>
                <?php elseif (empty($recentTasks)): ?>
                    <div class="no-tasks-dashboard">
                        <div class="no-tasks-icon">📋</div>
                        <p>Nessun task urgente</p>
                        <button class="btn-create-task" onclick="window.location.href='/modules/task_manager/'">
                            + Crea primo task
                        </button>
                    </div>
                <?php else: ?>
                    <?php foreach ($recentTasks as $task): ?>
                    <div class="task-item dashboard-task <?= $task['urgency_level'] ?>" 
                         onclick="window.location.href='/modules/task_manager/?task=<?= $task['id'] ?>'">
                        <div class="task-content">
                            <div class="task-header">
                                <h3><?= htmlspecialchars($task['title']) ?></h3>
                                <div class="task-urgency-badges">
                                    <?php if ($task['urgency_level'] === 'overdue'): ?>
                                        <span class="urgency-badge overdue">Scaduto</span>
                                    <?php elseif ($task['urgency_level'] === 'due_today'): ?>
                                        <span class="urgency-badge due-today">Oggi</span>
                                    <?php elseif ($task['urgency_level'] === 'in_progress'): ?>
                                        <span class="urgency-badge in-progress">In corso</span>
                                    <?php endif; ?>
                                    
                                    <span class="priority-badge priority-<?= strtolower($task['priority']) ?>">
                                        <?= $task['priority'] ?>
                                    </span>
                                </div>
                            </div>
                            
                            <div class="task-meta-dashboard">
                                <?php if ($task['client_name']): ?>
                                    <span class="task-client">
                                        <i>🏢</i> <?= htmlspecialchars($task['client_name']) ?>
                                    </span>
                                <?php endif; ?>
                                
                                <span class="task-category" style="color:#000">
                                    <img src="assets/images/icone/label.svg" alt="" style="width: 16px; height: 16px; vertical-align: middle;">
                                    <?= htmlspecialchars($task['category_name']) ?>
                                </span>

                                
                                <span class="task-assignee">
                                    <img src="/assets/images/icone/person.svg" 
                                        alt="" 
                                        style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">
                                    <?= htmlspecialchars($task['assigned_first_name'] . ' ' . $task['assigned_last_name']) ?>
                                </span>

                                
                                <span class="task-deadline">
                                    <img src="/assets/images/icone/calendar.svg"
                                        alt=""
                                        style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">
                                        
                                    <?= date('d/m/Y', strtotime($task['deadline'])) ?>
                                    
                                    <?php if ($task['days_until_deadline'] !== null): ?>
                                        (<?= $task['days_until_deadline'] > 0 
                                                ? '+' . $task['days_until_deadline'] . ' giorni' 
                                                : ($task['days_until_deadline'] == 0 
                                                    ? 'oggi' 
                                                    : abs($task['days_until_deadline']) . ' giorni fa') ?>)
                                    <?php endif; ?>
                                </span>

                                
                                <?php if ($task['estimated_hours'] > 0): ?>
                                    <span class="task-time">
                                        <i>⏱️</i> <?= (int)$task['estimated_hours'] ?> min stimati
                                    </span>
                                <?php endif; ?>
                            </div>
                            
                            <?php if ($task['description']): ?>
                                <div class="task-description">
                                    <?= htmlspecialchars(substr($task['description'], 0, 100)) ?><?= strlen($task['description']) > 100 ? '...' : '' ?>
                                </div>
                            <?php endif; ?>
                        </div>
                        
                        <div class="task-actions-dashboard">
                            <button class="task-quick-action" onclick="event.stopPropagation(); quickCompleteTask(<?= $task['id'] ?>)" title="Segna come completato">
                                <img src="/assets/images/icone/check.svg"
                                alt=""
                                style="width: 16px; height: 16px; vertical-align: middle;">
                            </button>
                        <button class="task-quick-action"
                                onclick="event.stopPropagation(); window.location.href='/modules/task_manager/?edit=<?= $task['id'] ?>'"
                                title="Modifica">
                            <img src="/assets/images/icone/edit.svg"
                                alt=""
                                style="width: 16px; height: 16px; vertical-align: middle;">
                        </button>

                        </div>
                    </div>
                    <?php endforeach; ?>
                    
                    <div class="tasks-footer">
                        <button class="btn-view-all" onclick="window.location.href='/modules/task_manager/'">
                            Visualizza tutti i task (<?= $taskStats['total'] ?? 0 ?>)
                        </button>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Agenda Section -->
       <div class="content-card agenda-card">
             <!--<div class="card-header">
                <h2>Agenda di oggi</h2>
                <?php if ($canViewAgenda): ?>
                <div class="agenda-header-actions">
                    <button class="agenda-view-btn" onclick="window.location.href='/modules/agenda/'">
                        Apri Agenda
                    </button>
                </div>
                <?php endif; ?>
            </div>-->
            
            <div class="agenda-content">
                <?php if (!$pdo): ?>
                    <div class="agenda-empty">
                        <p>Impossibile caricare l'agenda.</p>
                    </div>
                
                <?php elseif (!$canViewAgenda): ?>
                    <div class="access-denied">
                        <div class="denied-icon">🔒</div>
                        <p>Non hai accesso all'agenda</p>
                        <small>Contatta l'amministratore per ottenere i permessi</small>
                    </div>
                    
                <?php elseif (empty($todayEvents)): ?>
                    <div class="agenda-empty">
                        <div class="empty-icon">📅</div>
                        <h3>Nessun evento oggi</h3>
                        <p>La tua giornata è libera.</p>
                    </div>
                
                <?php else: ?>
                    <!-- Agenda Embedded: Iframe del modulo agenda completo -->
                    <iframe
                        src="/modules/agenda/index.php?embedded=1&view=day&date=<?= date('Y-m-d') ?>"
                        id="agendaWidget"
                        style="width: 100%;
                               height: 750px;
                               border: none;
                               border-radius: 8px;
                               display: block;
                               background: transparent;">
                    </iframe>

                    <!-- Footer con link agenda completa -->
                    <div class="agenda-footer" style="margin-top: 1em;">
                        <button class="btn-secondary" onclick="window.location.href='/modules/agenda/'">
                            Apri agenda completa
                        </button>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    
    <!-- Mini Widget Finance (solo se autorizzato) -->
    <?php if ($canViewFinance && !empty($recentTransactions)): ?>
    <div class="finance-mini-widget" style="margin-top:2em;">
        <div class="widget-header">
            <h3 style="display: flex;align-items: center;"><img src="/assets/images/icone/cash.svg"
                                alt=""
                                style="width: 16px; height: 16px; vertical-align: middle;margin-right: 0.5em;">
            Ultimi movimenti</h3>
            <a href="/modules/finance_tracker/" class="view-all-link">Vedi tutti →</a>
        </div>
        <div class="transactions-mini-list">
            <?php foreach ($recentTransactions as $trans): ?>
            <div class="mini-transaction <?= $trans['type'] ?>">
                <span class="trans-date"><?= date('d/m', strtotime($trans['date'])) ?></span>
                <span class="trans-desc">
                    <?= $trans['category_icon'] ?> <?= htmlspecialchars(substr($trans['description'], 0, 50)) ?>
                </span>
                <span class="trans-amount <?= $trans['type'] ?> <?= !$showFinancialNumbers ? 'financial-hidden' : '' ?>" data-original="<?= $trans['type'] === 'income' ? '+' : '-' ?>€ <?= number_format($trans['amount'], 0, ',', '.') ?>">
                    <?= $showFinancialNumbers ? ($trans['type'] === 'income' ? '+' : '-') . '€ ' . number_format($trans['amount'], 0, ',', '.') : '€ •••' ?>
                </span>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>
</div>

<!-- Modal PIN Code -->
<div id="pinModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
    <div style="background: white; padding: 32px; border-radius: 8px; max-width: 400px; width: 90%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <div style="text-align: center; margin-bottom: 32px;">
            <h2 style="margin: 0 0 8px 0; color: #37352f; font-size: 20px; font-weight: 600;">Inserisci PIN</h2>
            <p style="margin: 0; color: #787774; font-size: 14px;">Per visualizzare i dati finanziari</p>
        </div>

        <!-- 4 Riquadri PIN -->
        <form autocomplete="off">
        <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 20px;">
            <input type="password" inputmode="numeric" maxlength="1" class="pin-box-input" data-index="0" autocomplete="off"
                   style="width: 60px; height: 60px; text-align: center; font-size: 24px; border: 2px solid #e7e5e4; border-radius: 8px; font-weight: 600;"
                   oninput="handlePinInput(this, 0)">
            <input type="password" inputmode="numeric" maxlength="1" class="pin-box-input" data-index="1" autocomplete="off"
                   style="width: 60px; height: 60px; text-align: center; font-size: 24px; border: 2px solid #e7e5e4; border-radius: 8px; font-weight: 600;"
                   oninput="handlePinInput(this, 1)">
            <input type="password" inputmode="numeric" maxlength="1" class="pin-box-input" data-index="2" autocomplete="off"
                   style="width: 60px; height: 60px; text-align: center; font-size: 24px; border: 2px solid #e7e5e4; border-radius: 8px; font-weight: 600;"
                   oninput="handlePinInput(this, 2)">
            <input type="password" inputmode="numeric" maxlength="1" class="pin-box-input" data-index="3" autocomplete="off"
                   style="width: 60px; height: 60px; text-align: center; font-size: 24px; border: 2px solid #e7e5e4; border-radius: 8px; font-weight: 600;"
                   oninput="handlePinInput(this, 3)">
        </div>
        </form>

        <div id="pinError" style="display: none; padding: 10px; background: #fee2e2; border: 1px solid #ef4444; border-radius: 6px; margin-bottom: 16px; color: #991b1b; font-size: 13px; text-align: center;">
            PIN non corretto. Riprova.
        </div>
    </div>
</div>

<style>
/* Forza font Inter Tight per tutta la dashboard */
body, * {
    font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif !important;
}

/* Stili per cifre nascoste */
.financial-hidden {
    filter: blur(6px);
    user-select: none;
    cursor: help;
    transition: filter 0.3s ease;
}

/* Stili per elementi bloccati */
.stat-card.disabled {
    opacity: 0.6;
    background: #f9fafb;
    cursor: not-allowed;
}

.stat-card.disabled .stat-icon {
    background: #e5e7eb;
}

.stat-card.disabled .stat-icon i {
    color: #9ca3af;
}

.stat-card.disabled .stat-value {
    color: #9ca3af;
}

.access-denied {
    text-align: center;
    padding: 3rem 2rem;
    color: #6b7280;
}

.access-denied .denied-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.access-denied p {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
}

.access-denied small {
    font-size: 0.875rem;
    color: #9ca3af;
}

/* Stili aggiuntivi per mini widget finance */
.finance-mini-widget {
    background: #ffffff;
    border: 1px solid #e9e9e7;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
}

.finance-mini-widget .widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.finance-mini-widget h3 {
    font-size: 16px;
    font-weight: 600;
    color: #37352f;
    margin: 0;
}

.view-all-link {
    color: #787774;
    text-decoration: none;
    font-size: 13px;
    transition: color 0.2s;
}

.view-all-link:hover {
    color: #37352f;
}

.transactions-mini-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.mini-transaction {
    display: flex;
    align-items: center;
    padding: 8px;
    background: #f7f7f5;
    border-radius: 4px;
    font-size: 13px;
}

.mini-transaction .trans-date {
    color: #787774;
    min-width: 40px;
}

.mini-transaction .trans-desc {
    flex: 1;
    margin: 0 12px;
    color: #37352f;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mini-transaction .trans-amount {
    font-weight: 600;
    font-size: 14px;
}

.mini-transaction .trans-amount.income {
    color: #22c55e;
}

.mini-transaction .trans-amount.expense {
    color: #ef4444;
}

.stat-value.negative {
    color: #ef4444;
}

.stat-sub-info {
    display: block;
    font-size: 11px;
    color: #787774;
    margin-top: 2px;
    font-weight: normal;
}

.stat-icon.red {
    background: rgba(239, 68, 68, 0.1);
}

.stat-icon.red i {
    color: #ef4444;
}

/* Agenda Embedded - stili minimi per iframe */
#agendaWidget {
    transition: height 0.3s ease;
}
</style>

<!-- JavaScript per gestione eventi e task -->
<script>
let currentEventId = null;

// Funzioni per task
async function quickCompleteTask(taskId) {
    try {
        const formData = new FormData();
        formData.append('action', 'update_status');
        formData.append('task_id', taskId);
        formData.append('status', 'completed');
        formData.append('csrf_token', document.querySelector('input[name="csrf_token"]')?.value || '');
        
        const response = await fetch('/modules/task_manager/ajax/update_task.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (window.toastManager) {
                window.toastManager.success('Task completato! 🎉', '✅ Ottimo lavoro');
            }
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } else {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error('❌ Errore completamento task:', error);
        
        if (window.toastManager) {
            window.toastManager.error('Errore: ' + error.message, '❌ Errore');
        }
    }
}

function viewEvent(eventId) {
    // Funzione per visualizzare dettagli evento
    window.location.href = '/modules/agenda/?event=' + eventId;
}

// Gestione iframe agenda
document.addEventListener('DOMContentLoaded', function() {
    const agendaIframe = document.getElementById('agendaWidget');
    if (agendaIframe) {
        // Permetti al contenuto iframe di ricaricare quando cambia
        agendaIframe.addEventListener('load', function() {
            console.log('Agenda iframe caricato');
        });
    }
});

// ===== GESTIONE PIN CODE PER CIFRE FINANZIARIE =====

function openPinModal() {
    document.getElementById('pinModal').style.display = 'flex';
    document.getElementById('pinError').style.display = 'none';

    // Reset e focus sui box
    const boxes = document.querySelectorAll('.pin-box-input');
    boxes.forEach(box => box.value = '');
    boxes[0].focus();
}

function closePinModal() {
    document.getElementById('pinModal').style.display = 'none';
    const boxes = document.querySelectorAll('.pin-box-input');
    boxes.forEach(box => box.value = '');
    document.getElementById('pinError').style.display = 'none';
}

function handlePinInput(input, index) {
    // Permetti solo numeri
    input.value = input.value.replace(/[^0-9]/g, '');

    const boxes = document.querySelectorAll('.pin-box-input');

    // Se ha inserito un numero, passa al prossimo box
    if (input.value.length === 1 && index < 3) {
        boxes[index + 1].focus();
    }

    // Se tutti i 4 box sono pieni, verifica automaticamente
    const allFilled = Array.from(boxes).every(box => box.value.length === 1);
    if (allFilled) {
        setTimeout(() => verifyPinBoxes(), 300);
    }
}

// Gestione backspace tra i box
document.addEventListener('DOMContentLoaded', function() {
    const boxes = document.querySelectorAll('.pin-box-input');
    boxes.forEach((box, index) => {
        box.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && box.value === '' && index > 0) {
                boxes[index - 1].focus();
            }
        });
    });
});

async function verifyPinBoxes() {
    const boxes = document.querySelectorAll('.pin-box-input');
    const pin = Array.from(boxes).map(box => box.value).join('');

    if (pin.length !== 4) {
        document.getElementById('pinError').style.display = 'block';
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'verify_pin');
        formData.append('pin', pin);

        const response = await fetch(window.location.href, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // PIN corretto, ricarica la pagina
            window.location.reload();
        } else {
            // PIN errato
            document.getElementById('pinError').style.display = 'block';
            boxes.forEach(box => box.value = '');
            boxes[0].focus();
        }
    } catch (error) {
        console.error('Errore verifica PIN:', error);
        document.getElementById('pinError').style.display = 'block';
    }
}

async function lockFinances() {
    try {
        const formData = new FormData();
        formData.append('action', 'lock_finances');

        const response = await fetch(window.location.href, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Cifre nascoste, ricarica la pagina
            window.location.reload();
        }
    } catch (error) {
        console.error('Errore lock cifre:', error);
    }
}

// Enter key per confermare PIN
document.addEventListener('DOMContentLoaded', function() {
    const pinInput = document.getElementById('pinInput');
    if (pinInput) {
        pinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyPin();
            }
        });
    }

    // Chiudi modal cliccando fuori
    document.getElementById('pinModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closePinModal();
        }
    });
});

// Auto-refresh ogni 5 minuti
setInterval(function() {
    fetch(window.location.href)
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Aggiorna statistiche
            const newStats = doc.querySelector('.stats-grid');
            if (newStats) {
                document.querySelector('.stats-grid').innerHTML = newStats.innerHTML;
            }
            
            // Aggiorna mini widget finance
            const newFinanceWidget = doc.querySelector('.finance-mini-widget');
            if (newFinanceWidget) {
                const existingWidget = document.querySelector('.finance-mini-widget');
                if (existingWidget) {
                    existingWidget.innerHTML = newFinanceWidget.innerHTML;
                }
            }
            
            // Aggiorna sezione task
            const newTasksContent = doc.querySelector('.tasks-list');
            if (newTasksContent) {
                document.querySelector('.tasks-list').innerHTML = newTasksContent.innerHTML;
            }
            
            // Aggiorna sezione agenda
            const newAgendaContent = doc.querySelector('.agenda-content');
            if (newAgendaContent) {
                document.querySelector('.agenda-content').innerHTML = newAgendaContent.innerHTML;
            }
        })
        .catch(error => console.log('Auto-refresh dashboard failed:', error));
}, 300000); // 5 minuti
</script>

<?php
$pageContent = ob_get_clean();

// Funzione per inizializzare tabelle task manager
function initializeTaskManagerTables($pdo) {
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'task_categories'");
        if ($stmt->rowCount() === 0) {
            // Crea tabelle base se non esistono
            // Qui potrebbe essere necessario includere il setup delle tabelle
        }
    } catch (Exception $e) {
        error_log("Errore inizializzazione task manager: " . $e->getMessage());
    }
}

$additionalCSS = ['/assets/css/dashboard.css?v=' . time()];
$additionalJS = [
    '/assets/js/dashboard.js?v=' . time(),
    '/assets/js/toast.js?v=' . time(),
    '/assets/js/notifications.js?v=' . time()
];

renderPage('Dashboard', $pageContent, $additionalCSS, $additionalJS);
?>
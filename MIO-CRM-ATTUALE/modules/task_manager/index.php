<?php
// File: /modules/task_manager/index.php
// Task Manager aggiornato con selettore contatti dall'anagrafica

require_once __DIR__ . '/../../core/includes/auth_helper.php';
require_once __DIR__ . '/../../core/components/contact_selector.php'; // 🎯 NUOVO COMPONENTE

// Verifica autenticazione e ottieni utente
$currentUser = getCurrentUser();

// Sostituisci requireAuth() con:
requireModulePermission('task_manager', 'read');

// Per controlli granulari:
$canWrite = hasPermission('task_manager', 'write');
$canDelete = hasPermission('task_manager', 'delete');

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

// Inizializza tabelle se non esistono
initializeTaskTables($pdo);

// Ottieni preferenze utente per la vista
$userPrefs = getUserPreferences($pdo, $currentUser['id']);
$currentView = $_GET['view'] ?? $userPrefs['preferred_view'] ?? 'kanban';

// Ottieni dati per il task manager
$categories = getTaskCategories($pdo);
$contacts = getContactsForSelector($pdo); // 🎯 CAMBIATO: Ora usa i contatti dall'anagrafica
$admins = getAdmins($pdo);
$tasks = getTasks($pdo, $currentUser['id']);
$stats = getTaskStats($pdo, $currentUser['id']);

// Carica tutti gli utenti per avatar e iniziali
$allUsersStmt = $pdo->query("SELECT id, first_name, last_name, profile_image FROM users");
$allUsers = [];
foreach ($allUsersStmt->fetchAll() as $user) {
    $allUsers[$user['id']] = $user;
}

// Funzioni helper (identiche al file originale)
function initializeTaskTables($pdo) {
    $stmt = $pdo->query("SHOW TABLES LIKE 'task_categories'");
    if ($stmt->rowCount() === 0) {
        $schema = file_get_contents(__DIR__ . '/install/schema.sql');
        if ($schema) {
            $pdo->exec($schema);
        }
    }
}

function getUserPreferences($pdo, $userId) {
    $stmt = $pdo->prepare("SELECT * FROM task_user_preferences WHERE user_id = ?");
    $stmt->execute([$userId]);
    $prefs = $stmt->fetch();
    
    if (!$prefs) {
        $stmt = $pdo->prepare("INSERT INTO task_user_preferences (user_id, preferred_view) VALUES (?, 'kanban')");
        $stmt->execute([$userId]);
        return ['preferred_view' => 'kanban', 'show_completed' => 1, 'items_per_page' => 25];
    }
    
    return $prefs;
}

function getTaskCategories($pdo) {
    $stmt = $pdo->query("SELECT * FROM task_categories WHERE is_active = 1 ORDER BY name");
    return $stmt->fetchAll();
}

function getAdmins($pdo) {
    $stmt = $pdo->query("
        SELECT id, first_name, last_name, email 
        FROM users 
        WHERE role IN ('admin', 'super_admin') 
        AND is_active = 1 
        ORDER BY first_name
    ");
    return $stmt->fetchAll();
}

function getTasks($pdo, $userId) {
    $stmt = $pdo->query("
        SELECT 
            t.*,
            tc.name as category_name,
            tc.color as category_color,
            tc.icon as category_icon,
            lc.name as client_name,
            lc.contact_type as client_type,
            lc.email as client_email,
            lc.phone as client_phone,
            u_assigned.first_name as assigned_first_name,
            u_assigned.last_name as assigned_last_name,
            u_assigned.email as assigned_email,
            u_created.first_name as created_first_name,
            u_created.last_name as created_last_name,
            GROUP_CONCAT(
                CONCAT(u_resp.first_name, ' ', u_resp.last_name) 
                SEPARATOR ', '
            ) as responsables_names,
            GROUP_CONCAT(u_resp.id SEPARATOR ',') as responsables_ids,
            COUNT(tr.user_id) as responsables_count,
            CASE
                WHEN t.status = 'completed' THEN 1
                WHEN t.deadline < CURDATE() AND t.status != 'completed' THEN -1
                ELSE 0
            END as deadline_status,
            DATEDIFF(t.deadline, CURDATE()) as days_until_deadline,
            (SELECT COUNT(*) FROM agenda_events WHERE description LIKE CONCAT('%Task #', t.id, ':%')) as has_agenda_event
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN leads_contacts lc ON t.client_id = lc.id
        LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
        LEFT JOIN users u_created ON t.created_by = u_created.id
        LEFT JOIN task_responsables tr ON t.id = tr.task_id
        LEFT JOIN users u_resp ON tr.user_id = u_resp.id
        GROUP BY t.id
        ORDER BY 
            CASE t.priority 
                WHEN 'P1' THEN 1 
                WHEN 'P2' THEN 2 
                WHEN 'P3' THEN 3 
            END,
            t.deadline ASC,
            t.created_at DESC
    ");
    return $stmt->fetchAll();
}

function getTaskStats($pdo, $userId) {
    $stats = [
        'total' => 0,
        'todo' => 0,
        'in_progress' => 0,
        'pending' => 0,
        'completed' => 0,
        'overdue' => 0,
        'due_today' => 0,
        'assigned_to_me' => 0
    ];
    
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tasks");
        $stats['total'] = (int)$stmt->fetch()['count'];
        
        $stmt = $pdo->query("SELECT status, COUNT(*) as count FROM tasks GROUP BY status");
        while ($row = $stmt->fetch()) {
            $stats[$row['status']] = (int)$row['count'];
        }
        
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tasks WHERE deadline < CURDATE() AND status != 'completed'");
        $stats['overdue'] = (int)$stmt->fetch()['count'];
        
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tasks WHERE deadline = CURDATE() AND status != 'completed'");
        $stats['due_today'] = (int)$stmt->fetch()['count'];
        
        $stmt = $pdo->prepare("
            SELECT COUNT(DISTINCT t.id) as count 
            FROM tasks t
            LEFT JOIN task_responsables tr ON t.id = tr.task_id
            WHERE (t.assigned_to = ? OR tr.user_id = ?)
            AND t.status != 'completed'
        ");
        $stmt->execute([$userId, $userId]);
        $stats['assigned_to_me'] = (int)$stmt->fetch()['count'];
        
    } catch (Exception $e) {
        error_log("Errore calcolo statistiche task: " . $e->getMessage());
    }
    
    return $stats;
}

// Genera contenuto specifico del task manager (IDENTICO, solo cambia il form)
ob_start();
?>

<div class="task-manager-container">
    <!-- Header Task Manager (IDENTICO) -->
    <div class="task-manager-header">
        <div class="task-title-section">
            <h1>Task Manager MISMO®STUDIO</h1>
            <p>Aggiornata Novembre 2025</p>
        </div>
        
        <div class="task-controls">
            <div class="status-filters">
                <button class="status-filter active" data-status="all">
                    Da fare <span class="badge"><?= $stats['todo'] ?></span>
                </button>
                <button class="status-filter" data-status="in_progress">
                    In corso <span class="badge"><?= $stats['in_progress'] ?></span>
                </button>
                <button class="status-filter" data-status="pending">
                    In attesa <span class="badge"><?= $stats['pending'] ?></span>
                </button>
                <button class="status-filter" data-status="completed">
                    Conclusi <span class="badge"><?= $stats['completed'] ?></span>
                </button>
            </div>
            
            <div class="view-controls">
                <button class="view-btn <?= $currentView === 'kanban' ? 'active' : '' ?>" 
                        onclick="switchView('kanban')" title="Vista Kanban">
                    Kanban
                </button>
                <button class="view-btn <?= $currentView === 'table' ? 'active' : '' ?>" 
                        onclick="switchView('table')" title="Vista Tabella">
                    Tabella
                </button>
            </div>
            
            <div class="task-actions">
                <button class="filter-btn" onclick="openFiltersModal()" title="Filtri avanzati">
                    🔍 Filtri
                </button>
                <button class="settings-btn" onclick="openTaskSettings()" title="Gestisci categorie">
                    ⚙️ Categorie
                </button>
                <button class="create-task-btn" onclick="openTaskModal()">
                    + New Task
                </button>
            </div>
        </div>
    </div>

    <!-- Stats Cards (IDENTICHE) -->
    <div class="task-stats-quick">
        <div class="stat-quick overdue">
             <!-- <div class="stat-icon">🚨</div>-->
            <div class="stat-content">
                <div class="stat-value"><?= $stats['overdue'] ?></div>
                <div class="stat-label">Scaduti</div>
            </div>
        </div>
        
        <div class="stat-quick today">
             <!-- <div class="stat-icon">📅</div>-->
            <div class="stat-content">
                <div class="stat-value"><?= $stats['due_today'] ?></div>
                <div class="stat-label">Scadenza oggi</div>
            </div>
        </div>
        
        <div class="stat-quick assigned">
             <!-- <div class="stat-icon">👤</div>-->
            <div class="stat-content">
                <div class="stat-value"><?= $stats['assigned_to_me'] ?></div>
                <div class="stat-label">Assegnati a me</div>
            </div>
        </div>
        
        <div class="stat-quick total">
             <!-- <div class="stat-icon">📊</div>-->
            <div class="stat-content">
                <div class="stat-value"><?= $stats['total'] ?></div>
                <div class="stat-label">Task totali</div>
            </div>
        </div>
    </div>

    <!-- Filtri Avanzati Task Attivi -->
    <div class="active-tasks-filters">
        <!-- Filtro Categoria -->
        <div class="filter-group">
            <label class="filter-label" for="activeTasksCategoryFilter">
                Categoria:
            </label>
            <select id="activeTasksCategoryFilter" class="filter-select" onchange="filterActiveTasks()">
                <option value="">Tutte le categorie</option>
                <?php foreach ($categories as $cat): ?>
                    <option value="<?= $cat['id'] ?>"><?= $cat['icon'] ?> <?= htmlspecialchars($cat['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>

        <!-- Filtro Cliente -->
        <div class="filter-group">
            <label class="filter-label" for="activeTasksClientFilter">
                Cliente:
            </label>
            <select id="activeTasksClientFilter" class="filter-select" onchange="filterActiveTasks()">
                <option value="">Tutti i clienti</option>
                <?php
                $activeClients = [];
                foreach ($tasks as $task) {
                    if ($task['status'] !== 'completed' && $task['client_name']) {
                        $activeClients[$task['client_id']] = $task['client_name'];
                    }
                }
                asort($activeClients);
                foreach ($activeClients as $id => $name): ?>
                    <option value="<?= $id ?>"><?= htmlspecialchars($name) ?></option>
                <?php endforeach; ?>
            </select>
        </div>

        <!-- Filtro Responsabile -->
        <div class="filter-group">
            <label class="filter-label" for="activeTasksResponsableFilter">
                Responsabile:
            </label>
            <select id="activeTasksResponsableFilter" class="filter-select" onchange="filterActiveTasks()">
                <option value="">Tutti i responsabili</option>
                <?php foreach ($admins as $admin): ?>
                    <option value="<?= $admin['id'] ?>"><?= htmlspecialchars($admin['first_name'] . ' ' . $admin['last_name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>

        <!-- Pulsante Reset -->
        <button class="reset-filters-btn" onclick="resetActiveTasksFilters()" title="Reset filtri">
            Reset
        </button>

        <!-- Contatore task filtrati -->
        <div class="filtered-stats">
            <span id="filteredActiveCount">-</span> task visualizzati
        </div>
    </div>

    <!-- Area principale task (IDENTICA - Kanban e Table view) -->
    <div class="task-main-area">
        <!-- Vista Kanban -->

            <!-- Vista Kanban AGGIORNATA -->
            <div id="kanban-view" class="task-view <?= $currentView === 'kanban' ? 'active' : '' ?>">
                
                <!-- SEZIONE TASK ATTIVI (3 colonne in alto) -->
                <div class="kanban-board active-tasks">
                    <!-- Colonna DA FARE -->
                    <div class="kanban-column todo-column" data-status="todo">
                        <div class="kanban-header">
                            <div class="column-title">
                                <!-- <div class="column-icon">⚠️</div>-->
                                <span>Da fare</span>
                                <div class="column-count"><?= $stats['todo'] ?></div>
                            </div>
                            <button class="add-task-btn" onclick="openTaskModal('todo')" title="Nuovo task">+</button>
                        </div>
                        <div class="kanban-tasks" id="tasks-todo">
                            <?php foreach ($tasks as $task): if ($task['status'] === 'todo'): ?>
                                <?= renderTaskCard($task) ?>
                            <?php endif; endforeach; ?>
                        </div>
                        <button class="add-task-footer" onclick="openTaskModal('todo')">
                            + New task
                        </button>
                    </div>
                    
                    <!-- Colonna IN CORSO -->
                    <div class="kanban-column progress-column" data-status="in_progress">
                        <div class="kanban-header">
                            <div class="column-title">
                                <!-- <div class="column-icon">⏳</div>-->
                                <span>In corso</span>
                                <div class="column-count"><?= $stats['in_progress'] ?></div>
                            </div>
                            <button class="add-task-btn" onclick="openTaskModal('in_progress')" title="Nuovo task">+</button>
                        </div>
                        <div class="kanban-tasks" id="tasks-in_progress">
                            <?php foreach ($tasks as $task): if ($task['status'] === 'in_progress'): ?>
                                <?= renderTaskCard($task) ?>
                            <?php endif; endforeach; ?>
                        </div>
                        <button class="add-task-footer" onclick="openTaskModal('in_progress')">
                            + New task
                        </button>
                    </div>
               
                    
                    <!-- Colonna IN ATTESA -->
                    <div class="kanban-column pending-column" data-status="pending">
                        <div class="kanban-header">
                            <div class="column-title">
                                <!-- <div class="column-icon">😐</div>-->
                                <span>In attesa</span>
                                <div class="column-count"><?= $stats['pending'] ?></div>
                            </div>
                            <button class="add-task-btn" onclick="openTaskModal('pending')" title="Nuovo task">+</button>
                        </div>
                        <div class="kanban-tasks" id="tasks-pending">
                            <?php foreach ($tasks as $task): if ($task['status'] === 'pending'): ?>
                                <?= renderTaskCard($task) ?>
                            <?php endif; endforeach; ?>
                        </div>
                        <button class="add-task-footer" onclick="openTaskModal('pending')">
                            + New task
                        </button>
                    </div>
                    
                </div>
                
                <!-- SEPARATORE VISIVO -->
                <div class="tasks-separator">
                    <div class="separator-line"></div>
                    <div class="separator-title">
                        <span class="separator-icon">✅</span>
                        <span class="separator-text">Task Conclusi</span>
                        <span class="separator-count"><?= $stats['completed'] ?></span>
                    </div>
                    <div class="separator-line"></div>
                </div>
                
                <!-- FILTRI PER TASK CONCLUSI -->
                <div class="completed-tasks-filters">
                <!-- Filtro Cliente -->
                <div class="filter-group">
                    <label class="filter-label" for="completedClientFilter">
                        🏢 Filtra per Cliente:
                    </label>
                    <select id="completedClientFilter" class="filter-select" onchange="filterCompletedTasks()">
                        <option value="">Tutti i clienti</option>
                        <?php 
                        $completedClients = [];
                        foreach ($tasks as $task) {
                            if ($task['status'] === 'completed' && $task['client_name']) {
                                $completedClients[$task['client_id']] = $task['client_name'];
                            }
                        }
                        asort($completedClients);
                        foreach ($completedClients as $id => $name): ?>
                            <option value="<?= $id ?>"><?= htmlspecialchars($name) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <!-- Filtro Tipologia -->
                <div class="filter-group">
                    <label class="filter-label" for="completedCategoryFilter">
                        🏷️ Filtra per Tipologia:
                    </label>
                    <select id="completedCategoryFilter" class="filter-select" onchange="filterCompletedTasks()">
                        <option value="">Tutte le tipologie</option>
                        <?php 
                        $completedCategories = [];
                        foreach ($tasks as $task) {
                            if ($task['status'] === 'completed' && $task['category_name']) {
                                $completedCategories[$task['category_id']] = [
                                    'name' => $task['category_name'],
                                    'icon' => $task['category_icon']
                                ];
                            }
                        }
                        uasort($completedCategories, function($a, $b) {
                            return strcmp($a['name'], $b['name']);
                        });
                        foreach ($completedCategories as $id => $cat): ?>
                            <option value="<?= $id ?>"><?= $cat['icon'] ?> <?= htmlspecialchars($cat['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <!-- Filtro Periodo -->
                <div class="filter-group">
                    <label class="filter-label" for="completedPeriodFilter">
                        📅 Periodo:
                    </label>
                    <select id="completedPeriodFilter" class="filter-select" onchange="filterCompletedTasks()">
                        <option value="">Tutti i periodi</option>
                        <option value="today">Oggi</option>
                        <option value="week">Questa settimana</option>
                        <option value="month">Questo mese</option>
                        <option value="quarter">Questo trimestre</option>
                        <option value="year">Quest'anno</option>
                    </select>
                </div>
                
                <!-- Pulsante Reset -->
                
                
                <!-- Contatore task -->
             
            </div>
            
            <div style="
                display: flex;
                margin-bottom: 2em;
            ">
                <button class="reset-filters-btn" onclick="resetCompletedFilters()">
                    🔄 Reset Filtri
                </button>
                   <div class="completed-stats">
                    <span id="filteredCompletedCount"><?= $stats['completed'] ?></span> di 
                    <span id="totalCompletedCount"><?= $stats['completed'] ?></span> task visualizzati
                </div>
            </div>
            
            <style>
            /* ================================================ */
            /* SEZIONE FILTRI TASK CONCLUSI - DESIGN MIGLIORATO */
            /* ================================================ */
            
            .completed-tasks-filters {
                display: flex;
                gap: 20px;
                padding: 24px;
                background: linear-gradient(135deg, #f8fafb 0%, #f1f5f9 100%);
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                margin-bottom: 24px;
                align-items: center;
                flex-wrap: wrap;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
                position: relative;
            }
            
            .filter-group {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
                min-width: 220px;
                position: relative;
            }
            
            .filter-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 14px;
                font-weight: 600;
                color: #64748b;
                white-space: nowrap;
                min-width: fit-content;
            }
            
            .filter-select {
                flex: 1;
                padding: 10px 36px 10px 14px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                background: #ffffff;
                color: #1e293b;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 10px center;
                background-size: 20px;
                min-width: 180px;
            }
            
            .filter-select:hover {
                border-color: #cbd5e1;
                background-color: #f8fafc;
            }
            
            .filter-select:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            /* Select con valore attivo */
            .filter-select:has(option:not([value=""]):checked) {
                background-color: #eff6ff;
                border-color: #3b82f6;
                color: #1e40af;
                font-weight: 600;
            }
            
            .reset-filters-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 10px 18px;
                background: #ffffff;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                color: #64748b;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            
            .reset-filters-btn:hover {
                background: #f1f5f9;
                border-color: #cbd5e1;
                color: #475569;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
            
            .reset-filters-btn:active {
                transform: translateY(0);
            }
            
            .completed-stats {
                margin-left: auto;
                padding: 10px 18px;
                background: #ffffff;
                border: 2px solid #10b981;
                border-radius: 8px;
                font-size: 14px;
                color: #64748b;
                display: flex
            ;
                align-items: center;
                gap: 6px;
                box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
            }
            
            .completed-stats::before {
                content: '✅';
                font-size: 16px;
            }
            
            .completed-stats span {
                font-weight: 700;
                color: #10b981;
            }
            
            /* Responsive */
            @media (max-width: 1200px) {
                .completed-tasks-filters {
                    padding: 16px;
                    gap: 12px;
                }
                
                .filter-group {
                    flex: 1 1 calc(50% - 6px);
                    min-width: 200px;
                }
                
                .completed-stats {
                    flex: 1 1 100%;
                    justify-content: center;
                    margin-left: 0;
                    margin-top: 8px;
                }
            }
            
            @media (max-width: 768px) {
                .completed-tasks-filters {
                    padding: 12px;
                    gap: 10px;
                }
                
                .filter-group {
                    flex: 1 1 100%;
                    min-width: 100%;
                }
                
                .filter-label {
                    min-width: 40px;
                    font-size: 13px;
                }
                
                .filter-select {
                    font-size: 13px;
                    padding: 8px 30px 8px 12px;
                }
                
                .reset-filters-btn {
                    width: 100%;
                    justify-content: center;
                    padding: 10px;
                }
                
                .completed-stats {
                    width: 100%;
                    justify-content: center;
                    padding: 12px;
                    font-size: 13px;
                }
            }
            
            /* Animazione filtri attivi */
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
            
            .completed-stats.active-filters {
                animation: pulse 2s infinite;
            }
            </style>
                
                <!-- SEZIONE TASK CONCLUSI (full width in basso) -->
                <div class="kanban-board completed-tasks-section">
                    <div class="kanban-column completed-column full-width" data-status="completed">
                        <div class="kanban-header completed-header">
                            <div class="column-title">
                                <div class="column-icon">✅</div>
                                <span>Conclusi</span>
                                <div class="column-count" id="completedCount"><?= $stats['completed'] ?></div>
                            </div>
                            <div class="completed-view-controls">
                                <button class="view-mode-btn grid-view active" onclick="setCompletedViewMode('grid')" title="Vista Griglia">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                        <rect x="1" y="1" width="6" height="6"/>
                                        <rect x="9" y="1" width="6" height="6"/>
                                        <rect x="1" y="9" width="6" height="6"/>
                                        <rect x="9" y="9" width="6" height="6"/>
                                    </svg>
                                </button>
                                <button class="view-mode-btn list-view" onclick="setCompletedViewMode('list')" title="Vista Lista">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                        <rect x="1" y="2" width="14" height="2"/>
                                        <rect x="1" y="7" width="14" height="2"/>
                                        <rect x="1" y="12" width="14" height="2"/>
                                    </svg>
                                </button>
                                <button class="toggle-completed-btn" onclick="toggleCompletedSection()" title="Comprimi/Espandi">
                                    <span class="toggle-icon">▼</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="completed-tasks-container" id="completedTasksContainer">
                            <div class="kanban-tasks completed-grid" id="tasks-completed">
                                <?php foreach ($tasks as $task): if ($task['status'] === 'completed'): ?>
                                    <div class="task-card completed-task-card" 
                                         data-task-id="<?= $task['id'] ?>"
                                         data-client-id="<?= $task['client_id'] ?>"
                                         data-category-id="<?= $task['category_id'] ?>"
                                         data-completed-date="<?= $task['updated_at'] ?>"
                                         onclick="openTaskPreviewModal(<?= $task['id'] ?>)">
                                        
                                        <div class="task-card-header">
                                            <div class="task-completion-date">
                                                ✅ <?= date('d/m/Y', strtotime($task['updated_at'])) ?>
                                            </div>
                                            <?php 
                                            $completionTime = (strtotime($task['updated_at']) - strtotime($task['created_at'])) / 86400;
                                            if ($completionTime <= 1): ?>
                                                <div class="task-badge fast-completion">⚡ Rapido</div>
                                            <?php endif; ?>
                                        </div>
                                        
                                        <div class="task-card-title">
                                            <?= htmlspecialchars($task['title']) ?>
                                        </div>
                                        
                                        <div class="task-card-meta">
                                            <?php if ($task['client_name']): ?>
                                                <div class="task-meta-item">
                                                    <span class="meta-label">Cliente:</span>
                                                    <span class="meta-value"><?= htmlspecialchars($task['client_name']) ?></span>
                                                </div>
                                            <?php endif; ?>
                                            
                                            <div class="task-meta-item">
                                                <span class="meta-label">Durata:</span>
                                                <span class="meta-value"><?= round($completionTime) ?> giorni</span>
                                            </div>
                                            
                                            <?php if ($task['actual_hours'] > 0): ?>
                                                <div class="task-meta-item">
                                                    <span class="meta-label">Ore:</span>
                                                    <span class="meta-value"><?= $task['actual_hours'] ?>h</span>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                        
                                        <div class="task-card-footer">
                                            <div class="task-category" style="background: <?= $task['category_color'] ?>20; color: <?= $task['category_color'] ?>">
                                                <?= htmlspecialchars($task['category_name']) ?>
                                            </div>
                                            
                                            <div class="task-actions-completed">
                                                <?php if (!empty($task['has_agenda_event']) && $task['has_agenda_event'] > 0): ?>
                                                    <button class="mini-action-btn" onclick="event.stopPropagation(); viewTaskInAgenda(<?= $task['id'] ?>)" title="Vedi in Agenda">
                                                        📅
                                                    </button>
                                                <?php endif; ?>
                                                <button class="mini-action-btn" onclick="event.stopPropagation(); reopenTask(<?= $task['id'] ?>)" title="Riapri">
                                                    🔄
                                                </button>
                                                <button class="mini-action-btn" onclick="event.stopPropagation(); archiveTask(<?= $task['id'] ?>)" title="Archivia">
                                                    📦
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                <?php endif; endforeach; ?>
                            </div>
                            
                            <!-- Messaggio quando non ci sono task filtrati -->
                            <div class="no-filtered-tasks" id="noFilteredTasks" style="display: none;">
                                <div class="no-tasks-icon">🔍</div>
                                <h3>Nessun task trovato</h3>
                                <p>Prova a modificare i filtri per vedere altri task conclusi</p>
                                <button class="btn btn-secondary" onclick="resetCompletedFilters()">
                                    🔄 Reset Filtri
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        <!-- Vista Tabella -->
        <div id="table-view" class="task-view <?= $currentView === 'table' ? 'active' : '' ?>">
            <div class="table-container">
                <table class="tasks-table">
                    <thead>
                        <tr>
                            <th class="task-col"><span>Task</span></th>
                            <th class="responsible-col" onclick="sortTable('responsables_names')">
                                Responsabili <span class="sort-indicator"></span>
                            </th>
                            <th class="deadline-col" onclick="sortTable('deadline')">
                                Deadline <span class="sort-indicator"></span>
                            </th>
                            <th class="client-col" onclick="sortTable('client_name')">
                                Cliente <span class="sort-indicator"></span>
                            </th>
                            <th class="project-col" onclick="sortTable('category_name')">
                                Progetto <span class="sort-indicator"></span>
                            </th>
                            <th class="priority-col" onclick="sortTable('priority')">
                                Priorità <span class="sort-indicator"></span>
                            </th>
                            <th class="category-col" onclick="sortTable('category_name')">
                                Tipologia <span class="sort-indicator"></span>
                            </th>
                            <th class="status-col" onclick="sortTable('status')">
                                Status <span class="sort-indicator"></span>
                            </th>
                            <th class="actions-col">Azioni</th>
                        </tr>
                    </thead>
                    <tbody id="tasks-table-body">
                        <?php
                        // Raggruppa task per status
                        $todoTasks = array_filter($tasks, fn($t) => $t['status'] === 'todo');
                        $inProgressTasks = array_filter($tasks, fn($t) => $t['status'] === 'in_progress');
                        $pendingTasks = array_filter($tasks, fn($t) => $t['status'] === 'pending');

                        // Renderizza per stato: Da fare -> In corso -> In attesa (esclusi i conclusi)
                        ?>
                        <?php if (!empty($todoTasks)): ?>
                            <tr class="status-group-header">
                                <td colspan="9" class="status-group-title todo">Da fare (<?= count($todoTasks) ?>)</td>
                            </tr>
                            <?php foreach ($todoTasks as $task): ?>
                                <?= renderTaskRow($task) ?>
                            <?php endforeach; ?>
                        <?php endif; ?>

                        <?php if (!empty($inProgressTasks)): ?>
                            <tr class="status-group-header">
                                <td colspan="9" class="status-group-title in_progress">In corso (<?= count($inProgressTasks) ?>)</td>
                            </tr>
                            <?php foreach ($inProgressTasks as $task): ?>
                                <?= renderTaskRow($task) ?>
                            <?php endforeach; ?>
                        <?php endif; ?>

                        <?php if (!empty($pendingTasks)): ?>
                            <tr class="status-group-header">
                                <td colspan="9" class="status-group-title pending">In attesa (<?= count($pendingTasks) ?>)</td>
                            </tr>
                            <?php foreach ($pendingTasks as $task): ?>
                                <?= renderTaskRow($task) ?>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
                
                <?php if (empty($tasks)): ?>
                <div class="no-tasks">
                    <div class="no-tasks-icon">📋</div>
                    <h3>Nessun task presente</h3>
                    <p>Inizia creando il tuo primo task</p>
                    <button class="btn btn-primary" onclick="openTaskModal()">
                        + Crea primo task
                    </button>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Modal Anteprima Task (IDENTICA) -->
<div id="taskPreviewModal" class="modal task-preview-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="taskPreviewModalTitle">Anteprima Task</h3>
            <button type="button" class="modal-close" onclick="closeTaskPreviewModal()">&times;</button>
        </div>
        
        <div class="modal-body">
            <div id="taskPreviewContent">
                <!-- Contenuto dinamico task preview -->
            </div>
        </div>
        
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeTaskPreviewModal()">
                ❌ Chiudi
            </button>
            <button type="button" class="btn btn-primary" id="editTaskFromPreview" onclick="editTaskFromPreview()">
                ✏️ Modifica
            </button>
        </div>
    </div>
</div>

<!-- 🎯 MODAL TASK CON NUOVO SELETTORE CONTATTI -->
<div id="taskModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="taskModalTitle">Nuovo Task</h3>
            <button type="button" class="modal-close" onclick="closeTaskModal()">&times;</button>
        </div>
        
        <form id="taskForm" onsubmit="return false;">
            <div class="modal-body">
                <input type="hidden" id="taskId" name="task_id">
                <input type="hidden" name="csrf_token" value="<?= isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : 'temp_' . time() ?>">
                
                <!-- Nome Task -->
                <div class="form-group">
                    <label for="taskTitle">Nome Task *</label>
                    <input type="text" id="taskTitle" name="title" required 
                           placeholder="Es: Grafica + funzionalità portale">
                </div>
                
                <div class="form-row">
                    <!-- 🎯 NUOVO SELETTORE CONTATTI -->
                    <?= renderContactSelector('taskClient', 'client_id', 'Cliente/Progetto', null, false, 'Cerca contatto dall\'anagrafica...') ?>
                    
                    <!-- Tipologia -->
                    <div class="form-group">
                        <label for="taskCategory">Tipologia *</label>
                        <select id="taskCategory" name="category_id" required>
                            <option value="">Seleziona tipologia...</option>
                            <?php foreach ($categories as $category): ?>
                            <option value="<?= $category['id'] ?>" 
                                    data-color="<?= $category['color'] ?>" 
                                    data-icon="<?= $category['icon'] ?>">
                                <?= $category['icon'] ?> <?= htmlspecialchars($category['name']) ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <!-- Priorità -->
                    <div class="form-group">
                        <label for="taskPriority">Priorità *</label>
                        <select id="taskPriority" name="priority" required>
                            <option value="P1">🔴 P1 - Alta</option>
                            <option value="P2" selected>🟡 P2 - Media</option>
                            <option value="P3">🟢 P3 - Bassa</option>
                        </select>
                    </div>
                    
                    <!-- Deadline -->
                    <div class="form-group">
                        <label for="taskDeadline">Deadline *</label>
                        <input type="date" id="taskDeadline" name="deadline" required 
                               value="<?= date('Y-m-d') ?>">
                    </div>
                </div>
                
                <!-- RESPONSABILI (IDENTICI) -->
                <div class="form-group">
                    <label for="taskResponsables">Responsabili *</label>
                    <div class="responsables-selector" id="responsablesSelector">
                        <div class="add-responsable-dropdown">
                            <button type="button" class="add-responsable-btn" onclick="toggleResponsableDropdown()">
                                + Aggiungi responsabile
                            </button>
                            <div class="responsable-dropdown" id="responsableDropdown" style="display: none;">
                                <?php foreach ($admins as $admin): 
                                    $fullName = htmlspecialchars($admin['first_name'] . ' ' . $admin['last_name']);
                                    $isCurrentUser = $admin['id'] == $currentUser['id'];
                                ?>
                                <div class="responsable-option" data-user-id="<?= $admin['id'] ?>" 
                                     onclick="addResponsable(<?= $admin['id'] ?>, '<?= $fullName ?>')">
                                    <div class="user-avatar" style="background: <?= generateUserColor($admin['id']) ?>">
                                        <?= strtoupper(substr($admin['first_name'], 0, 1) . substr($admin['last_name'], 0, 1)) ?>
                                    </div>
                                    <span><?= $fullName ?></span>
                                </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>
                    <div id="responsablesInputs"></div>
                </div>
                
                <div class="form-row">
                    <!-- Status -->
                    <div class="form-group">
                        <label for="taskStatus">Status *</label>
                        <select id="taskStatus" name="status" required>
                            <option value="todo" selected>Da fare</option>
                            <option value="in_progress">In corso</option>
                            <option value="pending">In attesa</option>
                            <option value="completed">Concluso</option>
                        </select>
                    </div>
                    
                    <!-- Tempo stimato -->
                    <div class="form-group">
                        <label for="taskEstimated">Tempo stimato (minuti)</label>
                        <input type="number" id="taskEstimated" name="estimated_hours" 
                               step="0.5" min="0" placeholder="Es: 60">
                    </div>
                </div>
                
                <!-- Descrizione -->
                <div class="form-group">
                    <label for="taskDescription">Descrizione</label>
                    <textarea id="taskDescription" name="description" rows="3" 
                              placeholder="Dettagli aggiuntivi sul task..."></textarea>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeTaskModal()">
                    ❌ Annulla
                </button>
                <button type="button" class="btn btn-danger" id="deleteTaskBtn" 
                        onclick="deleteTask()" style="display: none;">
                    🗑️ Elimina
                </button>
                <button type="submit" class="btn btn-primary" id="saveTaskBtn">
                    💾 Salva Task
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Modal Gestione Categorie (IDENTICA) -->
<div id="categoriesModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Gestisci Tipologie Task</h3>
            <button class="modal-close" onclick="closeCategoriesModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="category-form">
                <h4>➕ Nuova Tipologia</h4>
                <form id="categoryForm">
                    <input type="hidden" name="csrf_token" value="<?= isset($_SESSION['csrf_token']) ? $_SESSION['csrf_token'] : 'temp_' . time() ?>">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="catName">Nome *</label>
                            <input type="text" id="catName" name="name" required placeholder="Es: Marketing">
                        </div>
                        <div class="form-group">
                            <label for="catColor">Colore</label>
                            <input type="color" id="catColor" name="color" value="#3b82f6">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="catIcon">Icona (emoji)</label>
                        <input type="text" id="catIcon" name="icon" placeholder="📋" maxlength="5">
                        <small>Suggerimenti: 📱 🎨 ⚙️ 🏢 🎯 🔍 👤</small>
                    </div>
                    <button type="submit" class="btn btn-primary">Aggiungi Tipologia</button>
                </form>
            </div>
            
            <div class="categories-list-container">
                <h4>📋 Tipologie Esistenti</h4>
                <div id="categoriesList">
                    <div class="loading-categories">📂 Caricamento tipologie...</div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Console Log (IDENTICA) -->
<div id="taskConsole" class="task-console">
    <div class="console-header">
        <div class="console-title">
            <span>🖥️ Console Log</span>
        </div>
        <button class="console-toggle" onclick="toggleConsole()" title="Nascondi console">−</button>
    </div>
    <div class="console-content" id="consoleContent">
        <div class="console-log">
            <span class="console-time"><?= date('H:i:s') ?></span>
            <span class="console-message">📋 Task Manager inizializzato</span>
        </div>
    </div>
</div>

<button id="consoleToggleBtn" class="console-toggle-btn" onclick="showConsole()" style="display: none;">
    🖥️ Console
</button>

<?php
// Funzioni helper per rendering (IDENTICHE)
function renderTaskCard($task) {
    $priorityColors = ['P1' => '#ef4444', 'P2' => '#f59e0b', 'P3' => '#22c55e'];
    $isOverdue = $task['deadline_status'] === -1;
    $isDueToday = $task['days_until_deadline'] === 0 && $task['status'] !== 'completed';
    
    ob_start();
    ?>
    <div class="task-card" data-task-id="<?= $task['id'] ?>" draggable="true" onclick="openTaskPreviewModal(<?= $task['id'] ?>)">
        <div class="task-card-header">
            <div class="task-priority" style="background: <?= $priorityColors[$task['priority']] ?>">
                <?= $task['priority'] ?>
            </div>
            <?php if ($isOverdue): ?>
                <div class="task-overdue">Scaduto</div>
            <?php elseif ($isDueToday): ?>
                <div class="task-due-today">📅 Oggi</div>
            <?php endif; ?>
        </div>
        
        <div class="task-card-title">
            <?= htmlspecialchars($task['title']) ?>
        </div>
        
        <div class="task-card-meta">
            <?php if ($task['client_name']): ?>
                <div class="task-meta-item">
                    <span class="meta-label">Cliente:</span>
                    <span class="meta-value"><?= htmlspecialchars($task['client_name']) ?></span>
                </div>
            <?php endif; ?>
            
            <div class="task-meta-item">
                <span class="meta-label">Scadenza:</span>
                <span class="meta-value"><?= date('d/m/Y', strtotime($task['deadline'])) ?></span>
            </div>
            
            <?php if ($task['estimated_hours'] > 0): ?>
                <div class="task-meta-item">
                    <span class="meta-label">Tempo:</span>
                    <span class="meta-value"><?= $task['estimated_hours'] ?></span>
                </div>
            <?php endif; ?>
        </div>
        
        <div class="task-card-footer">
            <div class="task-category" style="background: <?= $task['category_color'] ?>20; color: <?= $task['category_color'] ?>">
                 <?= htmlspecialchars($task['category_name']) ?>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
                <?php if (!empty($task['has_agenda_event']) && $task['has_agenda_event'] > 0): ?>
                    <button class="btn-view-agenda" onclick="event.stopPropagation(); viewTaskInAgenda(<?= $task['id'] ?>)" title="Vedi in Agenda">
                        📅
                    </button>
                <?php endif; ?>
                <div class="task-assignees">
                <?php
                $responsablesIds = !empty($task['responsables_ids']) ? explode(',', $task['responsables_ids']) : [$task['assigned_to']];
                $count = 0;
                foreach ($responsablesIds as $respId):
                    if ($count >= 3) break;
                    $respId = trim($respId);
                    if (empty($respId)) continue;
                    $profileImage = getUserProfileImage($respId);
                    $userName = isset($allUsers[$respId]) ? $allUsers[$respId]['first_name'] . ' ' . $allUsers[$respId]['last_name'] : 'Utente ' . $respId;
                ?>
                <div class="task-assignee" style="background: <?= generateUserColor($respId) ?>"
                     title="<?= htmlspecialchars($userName) ?>">
                    <?php if ($profileImage): ?>
                        <img src="<?= htmlspecialchars($profileImage) ?>?v=<?= time() ?>" alt="<?= htmlspecialchars($userName) ?>">
                    <?php else: ?>
                        <?= generateUserInitials($respId) ?>
                    <?php endif; ?>
                </div>
                <?php
                $count++;
                endforeach; 
                if (count($responsablesIds) > 3): ?>
                <div class="task-assignee more-assignees" title="+<?= count($responsablesIds) - 3 ?> altri">
                    +<?= count($responsablesIds) - 3 ?>
                </div>
                <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

function renderTaskRow($task) {
    $priorityColors = ['P1' => '#ef4444', 'P2' => '#f59e0b', 'P3' => '#22c55e'];
    $statusColors = ['todo' => '#ef4444', 'in_progress' => '#3b82f6', 'pending' => '#f59e0b', 'completed' => '#22c55e'];
    $statusLabels = ['todo' => 'Da fare', 'in_progress' => 'In corso', 'pending' => 'In attesa', 'completed' => 'Concluso'];
    $isOverdue = $task['deadline_status'] === -1;
    
    ob_start();
    ?>
    <tr class="task-row <?= $isOverdue ? 'overdue' : '' ?>" data-task-id="<?= $task['id'] ?>">
        <td class="task-col">
            <div class="task-title-cell" onclick="openTaskPreviewModal(<?= $task['id'] ?>)">
                <div class="task-title"><?= htmlspecialchars($task['title']) ?></div>
                <?php if ($task['description']): ?>
                    <div class="task-description"><?= htmlspecialchars(substr($task['description'], 0, 100)) ?>...</div>
                <?php endif; ?>
            </div>
        </td>
        
        <td class="responsible-col">
            <div class="user-info">
                <?php if (!empty($task['responsables_names'])): ?>
                    <div class="responsables-list">
                        <?= htmlspecialchars($task['responsables_names']) ?> 
                        <span class="responsables-count">(<?= $task['responsables_count'] ?>)</span>
                    </div>
                <?php else: ?>
                    <div class="user-avatar" style="background: <?= generateUserColor($task['assigned_to']) ?>">
                        <?= strtoupper(substr($task['assigned_first_name'], 0, 1) . substr($task['assigned_last_name'], 0, 1)) ?>
                    </div>
                    <span><?= htmlspecialchars($task['assigned_first_name'] . ' ' . $task['assigned_last_name']) ?></span>
                <?php endif; ?>
            </div>
        </td>
        
        <td class="deadline-col">
            <div class="deadline-info <?= $isOverdue ? 'overdue' : '' ?>">
                <?= date('d/m/Y', strtotime($task['deadline'])) ?>
                <?php if ($task['days_until_deadline'] === 0 && $task['status'] !== 'completed'): ?>
                    <span class="due-badge">Oggi</span>
                <?php elseif ($isOverdue): ?>
                    <span class="overdue-badge">Scaduto</span>
                <?php endif; ?>
            </div>
        </td>
        
        <td class="client-col">
            <?= $task['client_name'] ? htmlspecialchars($task['client_name']) : '-' ?>
        </td>
        
        <td class="project-col">
            <?= htmlspecialchars($task['category_name']) ?>
        </td>
        
        <td class="priority-col">
            <div class="priority-badge" style="background: <?= $priorityColors[$task['priority']] ?>">
                <?= $task['priority'] ?>
            </div>
        </td>
        
        <td class="category-col">
            <div class="category-badge" style="background: <?= $task['category_color'] ?>20; color: <?= $task['category_color'] ?>">
                <?= $task['category_icon'] ?> <?= htmlspecialchars($task['category_name']) ?>
            </div>
        </td>
        
        <td class="status-col">
            <div class="status-badge" style="background: <?= $statusColors[$task['status']] ?>">
                <?= $statusLabels[$task['status']] ?>
            </div>
        </td>
        
        <td class="actions-col">
            <div class="task-actions">
                <?php if (!empty($task['has_agenda_event']) && $task['has_agenda_event'] > 0): ?>
                    <button class="action-btn agenda-btn" onclick="viewTaskInAgenda(<?= $task['id'] ?>)" title="Vedi in Agenda">📅</button>
                <?php endif; ?>
                <button class="action-btn edit-btn" onclick="openTaskModal(<?= $task['id'] ?>)" title="Modifica">✏️</button>
                <button class="action-btn delete-btn" onclick="deleteTask(<?= $task['id'] ?>)" title="Elimina">🗑️</button>
            </div>
        </td>
    </tr>
    <?php
    return ob_get_clean();
}

function generateUserColor($userId) {
    $colors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6', '#6366f1', '#a855f7'];
    return $colors[$userId % count($colors)];
}

function generateUserInitials($userId) {
    global $allUsers;
    if (isset($allUsers[$userId])) {
        $user = $allUsers[$userId];
        return strtoupper(substr($user['first_name'], 0, 1) . substr($user['last_name'], 0, 1));
    }
    return 'U' . substr($userId, -1);
}

function getUserProfileImage($userId) {
    global $allUsers;
    if (isset($allUsers[$userId]) && !empty($allUsers[$userId]['profile_image'])) {
        return $allUsers[$userId]['profile_image'];
    }
    return null;
}

$pageContent = ob_get_clean();

// CSS e JavaScript AGGIORNATI
$additionalCSS = [
    '/assets/css/task_manager.css?v=' . time(),
    '/assets/css/contact-selector.css?v=' . time() // 🎯 NUOVO CSS
];
$additionalJS = [
    '/assets/js/toast.js',
    '/assets/js/contact-selector.js?v=' . time(), // 🎯 NUOVO JS
    '/assets/js/task_manager.js?v=' . time(),
    '/assets/js/notifications.js'
];

// 🎯 DATI JAVASCRIPT AGGIORNATI
echo '<script>';
echo 'console.log("📋 Caricamento dati Task Manager...");';
echo 'window.taskManagerData = {';
echo '  currentView: "' . $currentView . '",';
echo '  categories: ' . json_encode($categories) . ',';
echo '  contacts: ' . json_encode($contacts) . ','; // 🎯 CAMBIATO: contacts invece di clients
echo '  admins: ' . json_encode($admins) . ',';
echo '  tasks: ' . json_encode($tasks) . ',';
echo '  userId: ' . $currentUser['id'] . ',';
echo '  userName: "' . htmlspecialchars($currentUser['first_name'] . ' ' . $currentUser['last_name']) . '",';
echo '  stats: ' . json_encode($stats);
echo '};';
echo 'console.log("✅ Dati Task Manager caricati:", window.taskManagerData);';
echo '</script>';

// Rendering della pagina
if (function_exists('renderPage')) {
    renderPage('Task Manager', $pageContent, $additionalCSS, $additionalJS);
} else {
    echo '<!DOCTYPE html>';
    echo '<html><head><title>Task Manager</title>';
    foreach ($additionalCSS as $css) {
        echo '<link rel="stylesheet" href="' . $css . '">';
    }
    echo '</head><body>';
    echo $pageContent;
    foreach ($additionalJS as $js) {
        echo '<script src="' . $js . '"></script>';
    }
    echo '</body></html>';
}
?>
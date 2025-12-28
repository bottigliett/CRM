<?php
// File: /modules/agenda/index.php
// Modulo Agenda aggiornato con selettore contatti dall'anagrafica

require_once __DIR__ . '/../../core/includes/auth_helper.php';
require_once __DIR__ . '/../../core/components/contact_selector.php'; // 🎯 NUOVO COMPONENTE

// Verifica autenticazione e ottieni utente
$currentUser = getCurrentUser();

// Sostituisci requireAuth() con:
requireModulePermission('agenda', 'read');

// Per controlli granulari:
$canWrite = hasPermission('agenda', 'write');
$canDelete = hasPermission('agenda', 'delete');

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

// Imposta locale italiana per date
setlocale(LC_TIME, 'it_IT.UTF-8', 'it_IT', 'italian');
date_default_timezone_set('Europe/Rome');

// Ottieni parametri di visualizzazione
$view = $_GET['view'] ?? 'week';
$date = $_GET['date'] ?? date('Y-m-d');
$currentDate = new DateTime($date);

// Modalità embedded per iframe dashboard
$isEmbedded = isset($_GET['embedded']) && $_GET['embedded'] == '1';

// Ottieni categorie eventi
$stmt = $pdo->query("SELECT * FROM agenda_categories ORDER BY name");
$categories = $stmt->fetchAll();

// 🎯 CAMBIATO: Ora usa contatti dall'anagrafica invece della tabella clients
$contacts = getContactsForSelector($pdo);

// Ottieni tutti gli admin per responsabili
$stmt = $pdo->query("SELECT id, first_name, last_name, email FROM users WHERE role IN ('admin', 'super_admin') AND is_active = 1 ORDER BY first_name");
$admins = $stmt->fetchAll();

// Ottieni eventi del periodo corrente
$events = getEventsForPeriod($pdo, $view, $currentDate);

// Statistiche rapide
$stats = getAgendaStats($pdo, $currentUser['id']);

// Funzioni helper per traduzione italiana
function getDayNameIT($date) {
    $days = [
        'Monday' => 'lunedì',
        'Tuesday' => 'martedì',
        'Wednesday' => 'mercoledì',
        'Thursday' => 'giovedì',
        'Friday' => 'venerdì',
        'Saturday' => 'sabato',
        'Sunday' => 'domenica'
    ];
    $englishDay = $date->format('l');
    return $days[$englishDay] ?? $englishDay;
}

function getMonthNameIT($date) {
    $months = [
        'January' => 'gennaio',
        'February' => 'febbraio',
        'March' => 'marzo',
        'April' => 'aprile',
        'May' => 'maggio',
        'June' => 'giugno',
        'July' => 'luglio',
        'August' => 'agosto',
        'September' => 'settembre',
        'October' => 'ottobre',
        'November' => 'novembre',
        'December' => 'dicembre'
    ];
    $englishMonth = $date->format('F');
    return $months[$englishMonth] ?? $englishMonth;
}

function formatDateIT($date) {
    return getMonthNameIT($date) . ' ' . $date->format('Y');
}

// Funzioni helper (identiche)
function getEventsForPeriod($pdo, $view, $date) {
    switch ($view) {
        case 'day':
            $start = $date->format('Y-m-d 00:00:00');
            $end = $date->format('Y-m-d 23:59:59');
            break;
        case 'week':
            $start = clone $date;
            $start->modify('monday this week');
            $startStr = $start->format('Y-m-d 00:00:00');
            $end = clone $date;
            $end->modify('sunday this week');
            $endStr = $end->format('Y-m-d 23:59:59');
            $start = $startStr;
            $end = $endStr;
            break;
        case 'month':
        default:
            $start = $date->format('Y-m-01 00:00:00');
            $end = $date->format('Y-m-t 23:59:59');
            break;
    }
    
    $stmt = $pdo->prepare("
        SELECT * FROM agenda_events_detailed
        WHERE (start_datetime <= ? AND end_datetime >= ?)
           OR (start_datetime BETWEEN ? AND ?)
        ORDER BY start_datetime ASC
    ");
    $stmt->execute([$end, $start, $start, $end]);
    $events = $stmt->fetchAll();

    // Aggiungi i nomi dei clienti - usa la stessa tabella del Task Manager
    if (!empty($events)) {
        foreach ($events as $key => $event) {
            if (!empty($event['client_id'])) {
                try {
                    // Usa leads_contacts come nel Task Manager
                    $clientStmt = $pdo->prepare("SELECT id, name, contact_type, email, phone FROM leads_contacts WHERE id = ?");
                    $clientStmt->execute([$event['client_id']]);
                    $client = $clientStmt->fetch(PDO::FETCH_ASSOC);

                    if ($client) {
                        $events[$key]['client_name'] = $client['name'] ?? null;
                    } else {
                        $events[$key]['client_name'] = null;
                    }
                } catch (Exception $e) {
                    error_log("ERRORE Agenda recupero cliente: " . $e->getMessage());
                    $events[$key]['client_name'] = null;
                }
            } else {
                $events[$key]['client_name'] = null;
            }
        }
    }

    return $events;
}

function getAgendaStats($pdo, $userId) {
    $stats = [
        'today' => 0,
        'this_week' => 0,
        'next_week' => 0,
        'total_events' => 0,
        'completed_events' => 0,
        'pending_events' => 0,
        'high_priority' => 0
    ];
    
    try {
        $today = date('Y-m-d');
        $todayEnd = date('Y-m-d 23:59:59');

        // Query che gestisce anche end_datetime nullo/invalido ('0000-00-00')
        // Un evento è "oggi" se:
        // - Ha start_datetime oggi (per eventi senza end_datetime valido)
        // - Oppure si sovrappone con oggi (per eventi con end_datetime valido)
        $stmt = $pdo->prepare("
            SELECT COUNT(DISTINCT e.id) as count
            FROM agenda_events e
            JOIN agenda_event_responsables r ON e.id = r.event_id
            WHERE r.user_id = ?
            AND e.status != 'cancelled'
            AND (
                (DATE(e.start_datetime) = ?)
                OR (e.start_datetime <= ? AND e.end_datetime >= ? AND e.end_datetime > '0000-00-00')
            )
        ");
        $stmt->execute([$userId, $today, $todayEnd, $today]);
        $stats['today'] = (int)$stmt->fetch()['count'];
        
        $monday = date('Y-m-d', strtotime('monday this week'));
        $sunday = date('Y-m-d', strtotime('sunday this week'));
        
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM agenda_events e
            JOIN agenda_event_responsables r ON e.id = r.event_id
            WHERE r.user_id = ?
            AND (
                (DATE(e.start_datetime) BETWEEN ? AND ?) OR
                (DATE(e.start_datetime) <= ? AND DATE(e.end_datetime) >= ?)
            )
            AND e.status != 'cancelled'
        ");
        $stmt->execute([$userId, $monday, $sunday, $monday, $sunday]);
        $stats['this_week'] = (int)$stmt->fetch()['count'];
        
        $nextMonday = date('Y-m-d', strtotime('monday next week'));
        $nextSunday = date('Y-m-d', strtotime('sunday next week'));
        
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM agenda_events e
            JOIN agenda_event_responsables r ON e.id = r.event_id
            WHERE r.user_id = ?
            AND (
                (DATE(e.start_datetime) BETWEEN ? AND ?) OR
                (DATE(e.start_datetime) <= ? AND DATE(e.end_datetime) >= ?)
            )
            AND e.status != 'cancelled'
        ");
        $stmt->execute([$userId, $nextMonday, $nextSunday, $nextMonday, $nextSunday]);
        $stats['next_week'] = (int)$stmt->fetch()['count'];
        
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM agenda_events e
            JOIN agenda_event_responsables r ON e.id = r.event_id
            WHERE r.user_id = ?
            AND e.status != 'cancelled'
        ");
        $stmt->execute([$userId]);
        $stats['total_events'] = (int)$stmt->fetch()['count'];
        
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM agenda_events e
            JOIN agenda_event_responsables r ON e.id = r.event_id
            WHERE r.user_id = ?
            AND e.status = 'completed'
        ");
        $stmt->execute([$userId]);
        $stats['completed_events'] = (int)$stmt->fetch()['count'];
        
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM agenda_events e
            JOIN agenda_event_responsables r ON e.id = r.event_id
            WHERE r.user_id = ?
            AND e.start_datetime > NOW()
            AND e.status IN ('scheduled', 'confirmed')
        ");
        $stmt->execute([$userId]);
        $stats['pending_events'] = (int)$stmt->fetch()['count'];
        
        $next30Days = date('Y-m-d', strtotime('+30 days'));
        
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM agenda_events e
            JOIN agenda_event_responsables r ON e.id = r.event_id
            WHERE r.user_id = ?
            AND DATE(e.start_datetime) BETWEEN ? AND ?
            AND e.priority IN ('high', 'urgent')
            AND e.status != 'cancelled'
        ");
        $stmt->execute([$userId, $today, $next30Days]);
        $stats['high_priority'] = (int)$stmt->fetch()['count'];
        
        return $stats;
        
    } catch (Exception $e) {
        error_log("Errore calcolo statistiche agenda: " . $e->getMessage());
        return $stats;
    }
}

// Genera contenuto specifico dell'agenda (IDENTICO, cambia solo il modal)
ob_start();
?>

<div class="agenda-container <?= $isEmbedded ? 'embedded-mode' : '' ?>">
    <?php if (!$isEmbedded): ?>
    <!-- Header con controlli (IDENTICO) -->
    <div class="agenda-header">
        <div class="agenda-title-section">
            <h1>Agenda MISMO®STUDIO</h1>
            <p>Aggiornata Novembre 2025</p>
        </div>

        <div class="agenda-controls">
            <div class="view-controls">
                <button class="view-btn <?= $view === 'day' ? 'active' : '' ?>"
                        onclick="changeView('day')">Giorno</button>
                <button class="view-btn <?= $view === 'week' ? 'active' : '' ?>"
                        onclick="changeView('week')">Settimana</button>
                <button class="view-btn <?= $view === 'month' ? 'active' : '' ?>"
                        onclick="changeView('month')">Mese</button>
            </div>

            <div class="date-navigation">
                <button class="nav-btn" onclick="navigateDate('prev')">‹</button>
                <button class="today-btn" onclick="goToToday()">Oggi</button>
                <button class="nav-btn" onclick="navigateDate('next')">›</button>
            </div>

            <button class="create-event-btn" onclick="openEventModal()">
                + Nuovo Evento
            </button>
        </div>
    </div>
    <?php endif; ?>

    <!-- Stats Cards (IDENTICHE) -->
    <!-- <div class="agenda-stats">
        <div class="stat-card today-card">
            <div class="stat-icon">📋</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['today'] ?></div>
                <div class="stat-label">Eventi Oggi</div>
                <div class="stat-sublabel"><?= date('d M Y') ?></div>
            </div>
            <?php if ($stats['today'] > 0): ?>
                <div class="stat-indicator active"></div>
            <?php endif; ?>
        </div>
        
        <div class="stat-card week-card">
            <div class="stat-icon">📅</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['this_week'] ?></div>
                <div class="stat-label">Questa Settimana</div>
                <div class="stat-sublabel">
                    <?= date('d M', strtotime('monday this week')) ?> - <?= date('d M', strtotime('sunday this week')) ?>
                </div>
            </div>
        </div>
        
        <div class="stat-card next-week-card">
            <div class="stat-icon">⏭️</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['next_week'] ?></div>
                <div class="stat-label">Prossima Settimana</div>
                <div class="stat-sublabel">
                    <?= date('d M', strtotime('monday next week')) ?> - <?= date('d M', strtotime('sunday next week')) ?>
                </div>
            </div>
        </div>
        
        <?php if (isset($stats['high_priority']) && $stats['high_priority'] > 0): ?>
        <div class="stat-card priority-card">
            <div class="stat-icon">🚨</div>
            <div class="stat-content">
                <div class="stat-value"><?= $stats['high_priority'] ?></div>
                <div class="stat-label">Alta Priorità</div>
                <div class="stat-sublabel">Prossimi 30 giorni</div>
            </div>
            <div class="stat-indicator urgent"></div>
        </div>
        <?php endif; ?>
    </div>-->

    <!-- CALENDARIO A SCHERMO INTERO -->
    <div class="calendar-fullscreen-container">
        <div class="calendar-header-fullscreen">
            <h2 id="calendarTitle"><?= getCalendarTitle($view, $currentDate) ?></h2>
            <button class="btn-open-datepicker" onclick="openDatepickerModal()">
                Navigazione rapida
            </button>
        </div>

        <div id="calendar" class="calendar-grid-fullscreen <?= $view ?>-view">
            <?php renderCalendarView($view, $currentDate, $events); ?>
        </div>
    </div>

    <!-- TUTTO IL RESTO SOTTO IL CALENDARIO -->
    <div class="agenda-bottom-sections">
        <!-- Categorie -->
        <div class="bottom-section">
            <div class="section-header-toggle" onclick="toggleSidebarSection('categories')">
                <h3>🏷️ Categorie</h3>
                <span class="toggle-icon">▼</span>
            </div>
            <div id="categories-section" class="section-content" style="display: none;">
                <div class="categories-list-compact">
                    <?php foreach ($categories as $category): ?>
                    <div class="category-item-compact" data-category-id="<?= $category['id'] ?>">
                        <div class="category-color" style="background: <?= $category['color'] ?>"></div>
                        <span class="category-icon"><?= $category['icon'] ?></span>
                        <span class="category-name"><?= htmlspecialchars($category['name']) ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>
                <button class="manage-categories-btn" onclick="openCategoriesModal()">
                    Gestisci Categorie
                </button>
            </div>
        </div>

        <!-- Crea Categoria -->
        <div class="bottom-section">
            <div class="section-header-toggle" onclick="toggleSidebarSection('quick-create')">
                <h3>➕ Crea Categoria</h3>
                <span class="toggle-icon">▼</span>
            </div>
            <div id="quick-create-section" class="section-content" style="display: none;">
                <form id="quickCategoryForm" class="mini-form">
                    <input type="hidden" name="csrf_token" value="<?= generateCSRFToken() ?>">
                    <div class="mini-form-row">
                        <input type="text" name="name" placeholder="Nome" required>
                        <input type="color" name="color" value="#3b82f6" title="Colore">
                        <input type="text" name="icon" placeholder="📅" maxlength="3">
                        <button type="submit" class="btn-mini">+</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Log -->
        <div class="bottom-section">
            <div class="section-header-toggle" onclick="toggleSidebarSection('logs')">
                <h3>📋 Log Attività</h3>
                <span class="toggle-icon">▼</span>
            </div>
            <div id="logs-section" class="section-content" style="display: none;">
                <div class="log-filters-compact">
                    <select id="logFilter" onchange="AgendaManager.filterLogs(this.value)">
                        <option value="all">Tutte</option>
                        <option value="events">Eventi</option>
                        <option value="categories">Categorie</option>
                    </select>
                </div>
                <div id="logEntries" class="log-entries-compact">
                    <div class="log-loading">📋 Caricamento...</div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- POP-UP NAVIGAZIONE RAPIDA (DRAGGABLE) -->
<div id="datepickerModal" class="modal-datepicker-draggable" style="display: none;">
    <div class="modal-datepicker-content-draggable">
        <div class="modal-datepicker-header-draggable" id="dragHandle">
            <h3>📅 Navigazione Rapida</h3>
            <button class="modal-datepicker-close" onclick="closeDatepickerModal()">&times;</button>
        </div>
        <div class="modal-datepicker-body">
            <div class="mini-calendar-controls">
                <button class="mini-cal-nav-btn" onclick="navigateMiniCalendar(-1)" title="Mese precedente">‹</button>
                <span id="miniCalendarMonth" class="mini-cal-month-label"></span>
                <button class="mini-cal-nav-btn" onclick="navigateMiniCalendar(1)" title="Mese successivo">›</button>
            </div>
            <div id="miniCalendarModal" class="mini-calendar-modal"></div>
        </div>
    </div>
</div>

<!-- 🎯 MODAL NUOVO EVENTO CON SELETTORE CONTATTI -->
<div id="eventModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="modalTitle">Nuovo Evento</h3>
            <div class="modal-header-actions">
                <button type="button" class="btn-import-task" onclick="openTaskSelector()" title="Crea evento da task esistente">
                    📋 Importa da Task
                </button>
                <button type="button" class="modal-close" onclick="closeEventModal()">&times;</button>
            </div>
        </div>
        
        <form id="eventForm" onsubmit="return false;">
            <div class="modal-body">
                <input type="hidden" id="eventId" name="event_id">
                <input type="hidden" name="csrf_token" value="<?= generateCSRFToken() ?>">
                
                <div class="form-group">
                    <label for="eventTitle">Titolo *</label>
                    <input type="text" id="eventTitle" name="title" required 
                           placeholder="Inserisci il titolo dell'evento">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="eventStartDate">Data Inizio *</label>
                        <input type="date" id="eventStartDate" name="start_date" required 
                               value="<?= date('Y-m-d') ?>">
                    </div>
                    <div class="form-group">
                        <label for="eventStartTime">Ora Inizio</label>
                        <input type="time" id="eventStartTime" name="start_time" value="09:00">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="eventEndDate">Data Fine</label>
                        <input type="date" id="eventEndDate" name="end_date" 
                               value="<?= date('Y-m-d') ?>">
                    </div>
                    <div class="form-group">
                        <label for="eventEndTime">Ora Fine</label>
                        <input type="time" id="eventEndTime" name="end_time" value="10:00">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="allDayEvent" name="all_day">
                        <span class="checkmark"></span>
                        Tutto il giorno
                    </label>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="eventCategory">Categoria *</label>
                        <select id="eventCategory" name="category_id" required>
                            <option value="">Seleziona categoria...</option>
                            <?php foreach ($categories as $category): ?>
                            <option value="<?= $category['id'] ?>" 
                                    data-color="<?= $category['color'] ?>"
                                    data-icon="<?= $category['icon'] ?>">
                                <?= $category['icon'] ?> <?= htmlspecialchars($category['name']) ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <!-- 🎯 CAMBIATO: NUOVO SELETTORE CONTATTI -->
                    <div class="form-group">
                        <?= renderContactSelector('eventClient', 'client_id', 'Cliente', null, false, 'Cerca contatto dall\'anagrafica...') ?>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="eventLocation">Luogo</label>
                    <input type="text" id="eventLocation" name="location" 
                           placeholder="Sede, online, indirizzo...">
                </div>
                
                <div class="form-group">
                    <label for="eventDescription">Descrizione</label>
                    <textarea id="eventDescription" name="description" rows="3" 
                              placeholder="Dettagli aggiuntivi sull'evento..."></textarea>
                </div>
                
                <!-- RESPONSABILI (IDENTICI, ma più compatti) -->
                <div class="form-group">
                    <label for="eventResponsables">Responsabili / Partecipanti *</label>
                    <div class="responsables-selection">
                        <?php foreach ($admins as $admin): 
                            $isCurrentUser = $admin['id'] == $currentUser['id'];
                            $fullName = htmlspecialchars($admin['first_name'] . ' ' . $admin['last_name']);
                            $email = htmlspecialchars($admin['email']);
                            $initials = strtoupper(substr($admin['first_name'], 0, 1) . substr($admin['last_name'], 0, 1));
                        ?>
                            <label class="responsable-option">
                                <input type="checkbox" name="responsables[]" value="<?= $admin['id'] ?>" 
                                       <?= $isCurrentUser ? 'checked' : '' ?>>
                                <div class="responsable-card">
                                    <div class="responsable-avatar" style="background: <?= generateUserColor($admin['id']) ?>;">
                                        <?= $initials ?>
                                    </div>
                                    <div class="responsable-details">
                                        <div class="responsable-name"><?= $fullName ?></div>
                                        <div class="responsable-email"><?= $email ?></div>
                                    </div>
                                    <div class="responsable-check">✓</div>
                                </div>
                            </label>
                        <?php endforeach; ?>
                    </div>
                    <div class="form-help">
                        💡 <strong>I responsabili selezionati riceveranno le notifiche email.</strong>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="eventPriority">Priorità</label>
                        <select id="eventPriority" name="priority">
                            <option value="low">🟢 Bassa</option>
                            <option value="medium" selected>🟡 Media</option>
                            <option value="high">🟠 Alta</option>
                            <option value="urgent">🔴 Urgente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="eventReminder">Promemoria</label>
                        <select id="eventReminder" name="reminder_minutes">
                            <option value="0" selected>Nessuno</option>
                            <option value="5">5 minuti prima</option>
                            <option value="15">15 minuti prima</option>
                            <option value="30">30 minuti prima</option>
                            <option value="60">1 ora prima</option>
                            <option value="1440">1 giorno prima</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeEventModal()">
                    ❌ Annulla
                </button>
                <button type="button" class="btn btn-danger" id="deleteEventBtn" 
                        onclick="deleteEvent()" style="display: none;">
                    🗑️ Elimina
                </button>
                <button type="submit" class="btn btn-primary" id="saveEventBtn">
                    💾 Salva Evento
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Modal Selettore Task -->
<div id="taskSelectorModal" class="modal">
    <div class="modal-content modal-large">
        <div class="modal-header">
            <h3>📋 Seleziona Task da Importare</h3>
            <button type="button" class="modal-close" onclick="closeTaskSelector()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="task-selector-filters">
                <input type="text" id="taskSearchInput" placeholder="🔍 Cerca task..." onkeyup="filterTasks()">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; white-space: nowrap;">
                    <input type="checkbox" id="showCompletedTasks" onchange="filterTasks()">
                    Includi completati
                </label>
            </div>
            <div id="tasksList" class="tasks-list-selector">
                <div class="loading">Caricamento task...</div>
            </div>
        </div>
    </div>
</div>

<!-- Modal Gestione Categorie (IDENTICA) -->
<div id="categoriesModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Gestisci Categorie</h3>
            <button class="modal-close" onclick="AgendaManager.closeCategoriesModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="category-form">
                <h4>➕ Nuova Categoria</h4>
                <form id="categoryForm">
                    <input type="hidden" name="csrf_token" value="<?= generateCSRFToken() ?>">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="catName">Nome *</label>
                            <input type="text" id="catName" name="name" required placeholder="Es: Riunioni Clienti">
                        </div>
                        <div class="form-group">
                            <label for="catColor">Colore</label>
                            <input type="color" id="catColor" name="color" value="#3b82f6">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="catIcon">Icona (emoji)</label>
                        <input type="text" id="catIcon" name="icon" placeholder="📅" maxlength="5">
                        <small>Suggerimenti: 👥 📞 ✈️ 💻 📊 🎯 ⏰ 📚</small>
                    </div>
                    <button type="submit" class="btn btn-primary">Aggiungi Categoria</button>
                </form>
            </div>
            
            <div class="categories-list-container">
                <h4>📋 Categorie Esistenti</h4>
                <div id="categoriesList">
                    <div class="loading-categories">📂 Caricamento categorie...</div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php
// Funzioni helper per rendering (IDENTICHE)
function generateUserColor($userId) {
    $colors = [
        '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', 
        '#84cc16', '#f97316', '#ec4899', '#14b8a6', '#6366f1', '#a855f7'
    ];
    return $colors[$userId % count($colors)];
}

$pageContent = ob_get_clean();

function getCalendarTitle($view, $date) {
    switch ($view) {
        case 'day':
            return $date->format('l j F Y');
        case 'week':
            $monday = clone $date;
            $monday->modify('monday this week');
            $sunday = clone $date;
            $sunday->modify('sunday this week');
            return $monday->format('j M') . ' - ' . $sunday->format('j M Y');
        case 'month':
        default:
            return formatDateIT($date);
    }
}

function renderCalendarView($view, $date, $events) {
    switch ($view) {
        case 'day':
            renderDayView($date, $events);
            break;
        case 'week':
            renderWeekView($date, $events);
            break;
        case 'month':
        default:
            renderMonthView($date, $events);
            break;
    }
}

// Funzioni di rendering (IDENTICHE al file originale)
function renderMonthView($date, $events) {
    $firstDay = new DateTime($date->format('Y-m-01'));
    $lastDay = new DateTime($date->format('Y-m-t'));

    echo '<div class="month-view-grid">';

    // Header con nomi giorni
    echo '<div class="calendar-header-row">';
    $days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    foreach ($days as $day) {
        echo '<div class="calendar-header-cell">' . $day . '</div>';
    }
    echo '</div>';

    $current = clone $firstDay;
    $current->modify('monday this week');

    // Raccogli tutti gli eventi all-day multi-giorno
    $allDayMultiDayEvents = array_filter($events, function($event) {
        if (!$event['is_all_day']) return false;
        $startDate = date('Y-m-d', strtotime($event['start_datetime']));
        $endDate = date('Y-m-d', strtotime($event['end_datetime']));
        return $startDate !== $endDate;
    });

    for ($week = 0; $week < 6; $week++) {
        $weekStart = clone $current;

        // Filtra eventi multi-giorno per questa settimana
        $weekMultiDayEvents = [];
        foreach ($allDayMultiDayEvents as $event) {
            $eventStart = new DateTime(date('Y-m-d', strtotime($event['start_datetime'])));
            $eventEnd = new DateTime(date('Y-m-d', strtotime($event['end_datetime'])));
            $weekEnd = clone $weekStart;
            $weekEnd->add(new DateInterval('P6D'));

            if ($eventStart <= $weekEnd && $eventEnd >= $weekStart) {
                $weekMultiDayEvents[] = $event;
            }
        }

        // Organizza eventi multi-giorno in righe
        $eventRows = [];
        foreach ($weekMultiDayEvents as $event) {
            $eventStart = new DateTime(date('Y-m-d', strtotime($event['start_datetime'])));
            $eventEnd = new DateTime(date('Y-m-d', strtotime($event['end_datetime'])));

            $placed = false;
            foreach ($eventRows as &$row) {
                $canPlace = true;
                foreach ($row as $placedEvent) {
                    $placedStart = new DateTime(date('Y-m-d', strtotime($placedEvent['start_datetime'])));
                    $placedEnd = new DateTime(date('Y-m-d', strtotime($placedEvent['end_datetime'])));

                    if ($eventStart <= $placedEnd && $eventEnd >= $placedStart) {
                        $canPlace = false;
                        break;
                    }
                }
                if ($canPlace) {
                    $row[] = $event;
                    $placed = true;
                    break;
                }
            }
            if (!$placed) {
                $eventRows[] = [$event];
            }
        }

        // Renderizza righe eventi multi-giorno
        foreach ($eventRows as $row) {
            echo '<div class="calendar-week-allday-row">';

            foreach ($row as $event) {
                $eventStart = new DateTime(date('Y-m-d', strtotime($event['start_datetime'])));
                $eventEnd = new DateTime(date('Y-m-d', strtotime($event['end_datetime'])));

                $weekEnd = clone $weekStart;
                $weekEnd->add(new DateInterval('P6D'));

                // Calcola giorni dall'inizio della settimana (può essere negativo)
                $interval = $weekStart->diff($eventStart);
                $daysDiff = (int)$interval->format('%r%a'); // %r aggiunge il segno, %a i giorni

                // Calcola durata evento
                $duration = $eventEnd->diff($eventStart)->days + 1;

                // Solo se l'evento è visibile in questa settimana
                if ($eventStart <= $weekEnd && $eventEnd >= $weekStart) {
                    $startCol = max(1, $daysDiff);
                    $endCol = min(8, $daysDiff + $duration);
                    $span = $endCol - $startCol;

                    if ($span > 0) {
                        $eventColor = $event['category_color'] ?? '#3b82f6';
                        echo '<div class="calendar-allday-bar" ';
                        echo 'style="grid-column: ' . $startCol . ' / span ' . $span . '; background: ' . $eventColor . '; color: white;" ';
                        echo 'onclick="openEventModal(' . $event['id'] . ')">';
                        echo htmlspecialchars($event['title']);
                        echo '</div>';
                    }
                }
            }

            echo '</div>';
        }

        // Riga celle giorni
        echo '<div class="calendar-week">';
        for ($day = 0; $day < 7; $day++) {
            $isCurrentMonth = $current->format('m') === $date->format('m');
            $isToday = $current->format('Y-m-d') === date('Y-m-d');
            $currentDateString = $current->format('Y-m-d');

            // Filtra solo eventi NON multi-giorno all-day
            $dayEvents = array_filter($events, function($event) use ($currentDateString) {
                $startDate = date('Y-m-d', strtotime($event['start_datetime']));
                $endDate = date('Y-m-d', strtotime($event['end_datetime']));

                if ($event['is_all_day'] && $startDate !== $endDate) {
                    return false;
                }

                return $currentDateString >= $startDate && $currentDateString <= $endDate;
            });

            echo '<div class="calendar-day ' .
                 ($isCurrentMonth ? 'current-month' : 'other-month') .
                 ($isToday ? ' today' : '') . '" ' .
                 'data-date="' . $currentDateString . '" ' .
                 'onclick="dayClick(\'' . $currentDateString . '\')">';

            echo '<div class="day-number">' . $current->format('j') . '</div>';

            if ($dayEvents) {
                echo '<div class="day-events">';
                $count = 0;
                foreach ($dayEvents as $event) {
                    if ($count >= 3) {
                        $remaining = count($dayEvents) - 3;
                        echo '<div class="event-more">+' . $remaining . '</div>';
                        break;
                    }

                    $eventColor = $event['category_color'] ?? '#3b82f6';
                    echo '<div class="event-item" ';
                    echo 'style="background: ' . $eventColor . '20; border-left: 3px solid ' . $eventColor . '" ';
                    echo 'onclick="event.stopPropagation(); openEventModal(' . $event['id'] . ')">';

                    if (!$event['is_all_day']) {
                        echo '<span class="event-time">' . date('H:i', strtotime($event['start_datetime'])) . '</span> ';
                    } else {
                        echo '<span class="event-time">📅</span> ';
                    }

                    echo '<span class="event-title">' . htmlspecialchars($event['title']) . '</span>';
                    echo '</div>';
                    $count++;
                }
                echo '</div>';
            }

            echo '</div>';
            $current->add(new DateInterval('P1D'));
        }
        echo '</div>';

        if ($current > $lastDay && $week > 3) break;
    }

    echo '</div>';
}

function renderWeekView($date, $events) {
    $monday = clone $date;
    $monday->modify('monday this week');

    // Array giorni in italiano
    $dayNamesIT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    echo '<div class="week-view-container-timeslots">';

    // Header con i giorni della settimana
    echo '<div class="week-timeslots-header">';
    echo '<div class="timeslots-gutter">Orario</div>'; // Colonna orari

    for ($i = 0; $i < 7; $i++) {
        $day = clone $monday;
        $day->add(new DateInterval("P{$i}D"));
        $isToday = $day->format('Y-m-d') === date('Y-m-d');
        $dayString = $day->format('Y-m-d');

        echo '<div class="week-day-header-timeslot ' . ($isToday ? 'today' : '') . '" data-date="' . $dayString . '">';
        echo '<div class="day-name-it">' . $dayNamesIT[$i] . '</div>';
        echo '<div class="day-number">' . $day->format('j') . '</div>';

        // Placeholder per eventi multi-giorno (renderizzati dopo)
        echo '<div class="all-day-events-container" data-date="' . $dayString . '"></div>';

        echo '</div>';
    }
    echo '</div>';

    // Barra eventi multi-giorno (stile Google Calendar)
    echo '<div class="week-all-day-events">';

    // Raggruppa eventi all-day per riga
    $allDayEvents = array_filter($events, function($event) {
        return $event['is_all_day'];
    });

    // Organizza eventi multi-giorno in righe senza sovrapposizione
    $eventRows = [];
    foreach ($allDayEvents as $event) {
        $startDate = new DateTime(date('Y-m-d', strtotime($event['start_datetime'])));
        $endDate = new DateTime(date('Y-m-d', strtotime($event['end_datetime'])));

        // Trova la prima riga disponibile
        $placed = false;
        foreach ($eventRows as $rowIndex => &$row) {
            $canPlace = true;
            foreach ($row as $placedEvent) {
                $placedStart = new DateTime(date('Y-m-d', strtotime($placedEvent['start_datetime'])));
                $placedEnd = new DateTime(date('Y-m-d', strtotime($placedEvent['end_datetime'])));

                // Check overlap
                if ($startDate <= $placedEnd && $endDate >= $placedStart) {
                    $canPlace = false;
                    break;
                }
            }
            if ($canPlace) {
                $row[] = $event;
                $placed = true;
                break;
            }
        }
        if (!$placed) {
            $eventRows[] = [$event];
        }
    }
    unset($row); // Rilascia il riferimento per evitare bug

    // Renderizza ogni riga di eventi
    foreach ($eventRows as $row) {
        echo '<div class="all-day-row">';
        echo '<div class="all-day-row-label">Tutto il giorno</div>';
        echo '<div class="all-day-row-events">';

        foreach ($row as $event) {
            $startDate = new DateTime(date('Y-m-d', strtotime($event['start_datetime'])));
            $endDate = new DateTime(date('Y-m-d', strtotime($event['end_datetime'])));

            // Calcola posizione e larghezza
            $weekStart = clone $monday;
            $weekEnd = clone $monday;
            $weekEnd->add(new DateInterval('P6D'));

            // Calcola giorni dall'inizio della settimana (può essere negativo)
            $interval = $weekStart->diff($startDate);
            $daysDiff = (int)$interval->format('%r%a'); // %r aggiunge il segno, %a i giorni

            // Calcola durata evento
            $duration = $endDate->diff($startDate)->days + 1;

            // Solo se l'evento è visibile in questa settimana
            if ($startDate <= $weekEnd && $endDate >= $weekStart) {
                // Calcola colonna di inizio e fine
                $startCol = max(0, $daysDiff);
                $endCol = min(7, $daysDiff + $duration);
                $span = $endCol - $startCol;

                if ($span > 0) {
                    $eventColor = $event['category_color'] ?? '#3b82f6';
                    $eventTitle = htmlspecialchars($event['title']);
                    $clientName = !empty($event['client_name']) ? ' - ' . htmlspecialchars($event['client_name']) : '';

                    echo '<div class="all-day-event-bar" ';
                    echo 'style="';
                    echo 'grid-column: ' . ($startCol + 1) . ' / span ' . $span . '; ';
                    echo 'background: ' . $eventColor . '; ';
                    echo 'color: white; ';
                    echo '" ';
                    echo 'onclick="openEventModal(' . $event['id'] . ')" ';
                    echo 'title="' . $eventTitle . $clientName . '">';
                    echo '<span class="all-day-event-title">' . $eventTitle . '</span>';
                    if (!empty($event['client_name'])) {
                        echo '<span class="all-day-event-client"> • ' . htmlspecialchars($event['client_name']) . '</span>';
                    }
                    echo '</div>';
                }
            }
        }

        echo '</div>';
        echo '</div>';
    }

    echo '</div>';

    // Corpo con fasce orarie e eventi
    echo '<div class="week-timeslots-body" id="weekTimeslotsBody">';

    // Genera fasce orarie dalle 07:00 alle 22:00 (orario lavorativo)
    $startHour = 7;
    $endHour = 22;

    // FIX TIMEZONE: Usa timezone Italia
    date_default_timezone_set('Europe/Rome');
    $currentHour = (int)date('H');
    $currentMinutes = (int)date('i');
    $todayDate = date('Y-m-d');

    for ($hour = $startHour; $hour <= $endHour; $hour++) {
        $timeLabel = sprintf('%02d:00', $hour);
        $isCurrentHour = ($hour === $currentHour);

        echo '<div class="timeslot-row" data-hour="' . $hour . '" id="hour-' . $hour . '">';

        // Colonna orario
        echo '<div class="timeslot-time">' . $timeLabel . '</div>';

        // Colonne per ogni giorno
        for ($i = 0; $i < 7; $i++) {
            $day = clone $monday;
            $day->add(new DateInterval("P{$i}D"));
            $dayString = $day->format('Y-m-d');
            $isToday = ($dayString === $todayDate);

            // Filtra TUTTI gli eventi che sono attivi in questa ora per questo giorno
            $activeEvents = array_filter($events, function($event) use ($dayString, $hour) {
                if ($event['is_all_day']) return false;

                $eventStart = strtotime($event['start_datetime']);
                $eventEnd = strtotime($event['end_datetime']);
                $slotStart = strtotime($dayString . ' ' . sprintf('%02d:00:00', $hour));
                $slotEnd = strtotime($dayString . ' ' . sprintf('%02d:59:59', $hour));

                // L'evento è attivo se si sovrappone con questa fascia oraria
                return ($eventStart < $slotEnd && $eventEnd > $slotStart);
            });

            echo '<div class="timeslot-cell" data-date="' . $dayString . '" data-hour="' . $hour . '" ';
            echo 'onclick="createEventAtTime(\'' . $dayString . '\', ' . $hour . ')">';

            // Raggruppa eventi che INIZIANO in questa fascia oraria
            $displayedEvents = [];
            foreach ($activeEvents as $event) {
                $eventStart = strtotime($event['start_datetime']);

                // Mostra solo se l'evento INIZIA in questa fascia
                if ((int)date('H', $eventStart) !== $hour) continue;

                $displayedEvents[] = $event;
            }

            // Per ogni evento che inizia qui, calcola quanti eventi si sovrappongono TEMPORALMENTE
            $eventIndex = 0;

            foreach ($displayedEvents as $event) {
                $startTime = new DateTime($event['start_datetime']);
                $endTime = new DateTime($event['end_datetime']);
                $duration = ($endTime->getTimestamp() - $startTime->getTimestamp()) / 3600;

                $eventColor = $event['category_color'] ?? '#3b82f6';
                $startMinute = (int)$startTime->format('i');
                $topOffset = ($startMinute / 60) * 100;

                // Conta quanti eventi si sovrappongono con questo evento
                $overlappingEvents = [];
                foreach ($displayedEvents as $otherEvent) {
                    $otherStart = strtotime($otherEvent['start_datetime']);
                    $otherEnd = strtotime($otherEvent['end_datetime']);
                    $currentStart = $startTime->getTimestamp();
                    $currentEnd = $endTime->getTimestamp();

                    // Check se si sovrappongono temporalmente
                    if ($otherStart < $currentEnd && $otherEnd > $currentStart) {
                        $overlappingEvents[] = $otherEvent;
                    }
                }

                $totalOverlap = count($overlappingEvents);

                // Trova la posizione di questo evento nell'array degli eventi sovrapposti
                $position = 0;
                foreach ($overlappingEvents as $idx => $oe) {
                    if ($oe['id'] === $event['id']) {
                        $position = $idx;
                        break;
                    }
                }

                // Calcola larghezza e posizione
                $widthPercent = $totalOverlap > 1 ? (100 / $totalOverlap) : 100;
                $leftPercent = $totalOverlap > 1 ? ($position * $widthPercent) : 0;

                echo '<div class="timeslot-event';
                if ($totalOverlap > 1) echo ' overlapping';
                echo '" ';
                echo 'data-event-id="' . $event['id'] . '" ';
                echo 'style="';
                echo 'background: ' . $eventColor . '; ';
                echo 'border-left: 3px solid ' . $eventColor . '; ';
                echo 'height: ' . ($duration * 60) . 'px; ';
                echo 'top: ' . $topOffset . '%;';
                echo '--event-color: ' . $eventColor . '; ';
                if ($totalOverlap > 1) {
                    echo 'width: ' . ($widthPercent - 2) . '%; ';
                    echo 'left: ' . $leftPercent . '%;';
                }
                echo '" ';
                echo 'onclick="event.stopPropagation(); openEventModal(' . $event['id'] . ')">';

                echo '<div class="timeslot-event-time">';
                echo $startTime->format('H:i') . ' - ' . $endTime->format('H:i');
                echo '</div>';

                echo '<div class="timeslot-event-title">';
                echo htmlspecialchars($event['title']);
                echo '</div>';

                // Mostra categoria
                if (!empty($event['category_name'])) {
                    echo '<div class="timeslot-event-category">';
                    /*
                    if (!empty($event['category_icon'])) {
                        echo '<span>' . htmlspecialchars($event['category_icon']) . '</span>';
                    }
                    */
                    echo '<span>' . htmlspecialchars($event['category_name']) . '</span>';
                    echo '</div>';
                }

                // Mostra cliente - sempre visibile
                if (!empty($event['client_name'])) {
                    echo '<div class="timeslot-event-client">';
                    echo '<span class="client-badge"> ' . htmlspecialchars($event['client_name']) . '</span>';
                    echo '</div>';
                }

                // Location solo se c'è spazio
                if ($event['location'] && $totalOverlap <= 2) {
                    echo '<div class="timeslot-event-location">📍 ' . htmlspecialchars($event['location']) . '</div>';
                }

                echo '</div>';
                $eventIndex++;
            }

            // Linea rossa ora corrente (solo per oggi)
            if ($isToday && $isCurrentHour) {
                $currentTimeOffset = ($currentMinutes / 60) * 100;
                echo '<div class="current-time-indicator" style="top: ' . $currentTimeOffset . '%;"></div>';
                echo '<div class="current-time-label" style="top: ' . $currentTimeOffset . '%;">' . date('H:i') . '</div>';
            }

            echo '</div>';
        }

        echo '</div>';
    }

    echo '</div>'; // week-timeslots-body

    // Script per scroll automatico all'ora corrente
    echo '<script>';
    echo 'document.addEventListener("DOMContentLoaded", function() {';
    echo '    setTimeout(function() {';
    echo '        const currentHourElement = document.getElementById("hour-' . $currentHour . '");';
    echo '        if (currentHourElement) {';
    echo '            currentHourElement.scrollIntoView({ behavior: "smooth", block: "center" });';
    echo '        }';
    echo '    }, 300);';
    echo '});';
    echo '</script>';

    echo '</div>'; // week-view-container-timeslots
}

function renderDayView($date, $events) {
    $dayString = $date->format('Y-m-d');
    $isToday = $dayString === date('Y-m-d');

    // Filtra eventi per questo giorno
    $dayEvents = array_filter($events, function($event) use ($dayString) {
        $startDate = date('Y-m-d', strtotime($event['start_datetime']));
        $endDate = date('Y-m-d', strtotime($event['end_datetime']));
        return $dayString >= $startDate && $dayString <= $endDate;
    });

    echo '<div class="day-view-container-timeslots">';

    // Header con data
    echo '<div class="day-timeslots-header">';
    echo '<div class="timeslots-gutter">Orario</div>';
    echo '<div class="day-header-timeslot ' . ($isToday ? 'today' : '') . '" data-date="' . $dayString . '">';
    echo '<div class="day-name-full">' . ucfirst(getDayNameIT($date)) . '</div>';
    echo '<div class="day-number-large">' . $date->format('j') . '</div>';
    echo '<div class="day-month-year">' . ucfirst(formatDateIT($date)) . '</div>';

    // Eventi giornata intera in cima
    $allDayEvents = array_filter($dayEvents, function($event) {
        return $event['is_all_day'];
    });

    if (!empty($allDayEvents)) {
        echo '<div class="all-day-events-day">';
        foreach ($allDayEvents as $event) {
            $eventColor = $event['category_color'] ?? '#3b82f6';
            echo '<div class="all-day-event-day" ';
            echo 'style="background: ' . $eventColor . '; color: white;" ';
            echo 'onclick="openEventModal(' . $event['id'] . ')">';
            echo '<span>📅 ' . htmlspecialchars($event['title']) . '</span>';
            if (!empty($event['client_name'])) {
                echo '<span class="all-day-client"> • ' . htmlspecialchars($event['client_name']) . '</span>';
            }
            echo '</div>';
        }
        echo '</div>';
    }

    echo '</div>';
    echo '</div>';

    // Corpo con fasce orarie
    echo '<div class="day-timeslots-body" id="dayTimeslotsBody">';

    // Genera fasce orarie dalle 07:00 alle 22:00
    $startHour = 7;
    $endHour = 22;

    // Timezone Italia
    date_default_timezone_set('Europe/Rome');
    $currentHour = (int)date('H');
    $currentMinutes = (int)date('i');

    for ($hour = $startHour; $hour <= $endHour; $hour++) {
        $isCurrentHour = $isToday && $hour === $currentHour;

        echo '<div class="timeslot-row-day">';

        // Colonna orario
        echo '<div class="timeslot-hour-label">';
        echo sprintf('%02d:00', $hour);
        echo '</div>';

        // Filtra eventi attivi in questa fascia oraria
        $activeEvents = array_filter($dayEvents, function($event) use ($dayString, $hour) {
            if ($event['is_all_day']) return false;

            $eventStart = strtotime($event['start_datetime']);
            $eventEnd = strtotime($event['end_datetime']);
            $slotStart = strtotime($dayString . ' ' . sprintf('%02d:00:00', $hour));
            $slotEnd = strtotime($dayString . ' ' . sprintf('%02d:59:59', $hour));

            return ($eventStart < $slotEnd && $eventEnd > $slotStart);
        });

        echo '<div class="timeslot-cell-day" data-date="' . $dayString . '" data-hour="' . $hour . '" ';
        echo 'onclick="createEventAtTime(\'' . $dayString . '\', ' . $hour . ')">';

        // Raggruppa eventi che INIZIANO in questa fascia oraria
        $displayedEvents = [];
        foreach ($activeEvents as $event) {
            $eventStart = strtotime($event['start_datetime']);
            if ((int)date('H', $eventStart) !== $hour) continue;
            $displayedEvents[] = $event;
        }

        // Per ogni evento che inizia qui, calcola sovrapposizioni
        foreach ($displayedEvents as $event) {
            $startTime = new DateTime($event['start_datetime']);
            $endTime = new DateTime($event['end_datetime']);
            $duration = ($endTime->getTimestamp() - $startTime->getTimestamp()) / 3600;

            $eventColor = $event['category_color'] ?? '#3b82f6';
            $startMinute = (int)$startTime->format('i');
            $topOffset = ($startMinute / 60) * 100;

            // Conta quanti eventi si sovrappongono
            $overlappingEvents = [];
            foreach ($displayedEvents as $otherEvent) {
                $otherStart = strtotime($otherEvent['start_datetime']);
                $otherEnd = strtotime($otherEvent['end_datetime']);
                $currentStart = $startTime->getTimestamp();
                $currentEnd = $endTime->getTimestamp();

                if ($otherStart < $currentEnd && $otherEnd > $currentStart) {
                    $overlappingEvents[] = $otherEvent;
                }
            }

            $totalOverlap = count($overlappingEvents);
            $position = 0;
            foreach ($overlappingEvents as $idx => $oe) {
                if ($oe['id'] === $event['id']) {
                    $position = $idx;
                    break;
                }
            }

            $widthPercent = $totalOverlap > 1 ? (100 / $totalOverlap) : 100;
            $leftPercent = $totalOverlap > 1 ? ($position * $widthPercent) : 0;

            echo '<div class="timeslot-event-day';
            if ($totalOverlap > 1) echo ' overlapping';
            echo '" ';
            echo 'data-event-id="' . $event['id'] . '" ';
            echo 'style="';
            echo 'background: ' . $eventColor . '; ';
            echo 'border-left: 3px solid ' . $eventColor . '; ';
            echo 'height: ' . ($duration * 60) . 'px; ';
            echo 'top: ' . $topOffset . '%;';
            echo '--event-color: ' . $eventColor . '; ';
            if ($totalOverlap > 1) {
                echo 'width: ' . ($widthPercent - 2) . '%; ';
                echo 'left: ' . $leftPercent . '%;';
            }
            echo '" ';
            echo 'onclick="event.stopPropagation(); openEventModal(' . $event['id'] . ')">';

            echo '<div class="timeslot-event-time">';
            echo $startTime->format('H:i') . ' - ' . $endTime->format('H:i');
            echo '</div>';

            echo '<div class="timeslot-event-title">';
            echo htmlspecialchars($event['title']);
            echo '</div>';

            if (!empty($event['category_name'])) {
                echo '<div class="timeslot-event-category">';
                if (!empty($event['category_icon'])) {
                    echo '<span>' . htmlspecialchars($event['category_icon']) . '</span>';
                }
                echo '<span>' . htmlspecialchars($event['category_name']) . '</span>';
                echo '</div>';
            }

            if (!empty($event['client_name'])) {
                echo '<div class="timeslot-event-client">';
                echo '<span class="client-badge">🏢 ' . htmlspecialchars($event['client_name']) . '</span>';
                echo '</div>';
            }

            if ($event['location']) {
                echo '<div class="timeslot-event-location">📍 ' . htmlspecialchars($event['location']) . '</div>';
            }

            echo '</div>';
        }

        // Linea rossa ora corrente
        if ($isToday && $isCurrentHour) {
            $currentTimeOffset = ($currentMinutes / 60) * 100;
            echo '<div class="current-time-indicator" style="top: ' . $currentTimeOffset . '%;"></div>';
            echo '<div class="current-time-label" style="top: ' . $currentTimeOffset . '%;">' . date('H:i') . '</div>';
        }

        echo '</div>';
        echo '</div>';
    }

    echo '</div>';
    echo '</div>';

    // Script per scroll automatico all'ora corrente
    if ($isToday) {
        echo '<script>';
        echo 'setTimeout(() => {';
        echo '  const body = document.getElementById("dayTimeslotsBody");';
        echo '  if (body) {';
        echo '    const hourHeight = 60;';
        echo '    const currentHour = ' . $currentHour . ';';
        echo '    const scrollTo = (currentHour - ' . $startHour . ') * hourHeight - 100;';
        echo '    body.scrollTop = scrollTo;';
        echo '  }';
        echo '}, 300);';
        echo '</script>';
    }
}

// 🎯 CSS e JavaScript AGGIORNATI
$additionalCSS = [
    '/assets/css/agenda.css?v=' . time()
];

// Aggiungi stili specifici per modalità embedded
if ($isEmbedded) {
    array_unshift($additionalCSS, '<style>
        body {
            margin: 0;
            padding: 0;
            background: transparent;
            overflow-x: hidden;
            font-family: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif !important;
        }
        * {
            font-family: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif !important;
        }
        .agenda-container.embedded-mode {
            padding: 0;
            margin: 0;
            background: transparent;
        }
        .agenda-container.embedded-mode .agenda-content {
            padding: 0;
            margin: 0;
        }
    </style>');
}
$additionalJS = [
    '/assets/js/toast.js',           
    '/assets/js/contact-selector.js?v=' . time(),
    '/assets/js/agenda.js?v=' . time(),
    '/assets/js/agenda-layout-management.js?v=' . time(),
    '/assets/js/notifications.js'
];

// 🎯 DATI JAVASCRIPT AGGIORNATI
echo '<script>';
echo 'window.agendaData = {';
echo '  currentView: "' . $view . '",';
echo '  currentDate: "' . $date . '",';
echo '  categories: ' . json_encode($categories) . ',';
echo '  contacts: ' . json_encode($contacts) . ','; // 🎯 CAMBIATO: contacts invece di clients
echo '  admins: ' . json_encode($admins) . ',';
echo '  events: ' . json_encode($events) . ',';
echo '  userId: ' . $currentUser['id'] . ',';
echo '  userName: "' . htmlspecialchars($currentUser['first_name'] . ' ' . $currentUser['last_name']) . '",';
echo '  stats: ' . json_encode($stats);
echo '};';
echo '</script>';

// Rendering della pagina
if ($isEmbedded) {
    // Modalità embedded: stampa solo il contenuto senza layout wrapper
    echo '<!DOCTYPE html>';
    echo '<html lang="it">';
    echo '<head>';
    echo '<meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';

    // Font Google (Inter Tight)
    echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
    echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    echo '<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">';

    // Carica CSS
    foreach ($additionalCSS as $css) {
        if (strpos($css, '<style>') !== false) {
            echo $css; // CSS inline
        } else {
            echo '<link rel="stylesheet" href="' . $css . '">'; // CSS esterno
        }
    }

    echo '</head>';
    echo '<body>';
    echo $pageContent;

    // Carica JavaScript
    foreach ($additionalJS as $js) {
        echo '<script src="' . $js . '"></script>';
    }

    echo '</body>';
    echo '</html>';
} else {
    // Modalità normale: usa il layout completo
    renderPage('Agenda', $pageContent, $additionalCSS, $additionalJS);
}
?>
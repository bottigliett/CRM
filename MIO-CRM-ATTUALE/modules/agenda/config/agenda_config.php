<?php
// File: /modules/agenda/config/agenda_config.php
// Configurazioni avanzate per modulo Agenda

// ==========================================
// CONFIGURAZIONI GENERALI
// ==========================================

// Vista di default quando si apre l'agenda
define('AGENDA_DEFAULT_VIEW', 'month'); // month, week, day

// Prima settimana (0 = domenica, 1 = lunedì)
define('AGENDA_WEEK_START', 1); // 1 = lunedì (standard europeo)

// Orario lavorativo
define('AGENDA_WORK_START', '08:00');
define('AGENDA_WORK_END', '18:00');

// Fuso orario
define('AGENDA_TIMEZONE', 'Europe/Rome');

// Lingua
define('AGENDA_LOCALE', 'it_IT');

// ==========================================
// CONFIGURAZIONI EVENTI
// ==========================================

// Durata default evento (minuti)
define('AGENDA_DEFAULT_EVENT_DURATION', 60);

// Massimo eventi per giorno nella vista mensile
define('AGENDA_MAX_EVENTS_PER_DAY_MONTH_VIEW', 3);

// Consentire eventi nel passato
define('AGENDA_ALLOW_PAST_EVENTS', true);

// Consentire eventi sovrapposti
define('AGENDA_ALLOW_OVERLAPPING_EVENTS', true);

// Massima durata evento (giorni)
define('AGENDA_MAX_EVENT_DURATION_DAYS', 30);

// Auto-assegnazione come responsabile
define('AGENDA_AUTO_ASSIGN_CREATOR', true);

// ==========================================
// CONFIGURAZIONI NOTIFICHE
// ==========================================

// Abilita notifiche email
define('AGENDA_EMAIL_NOTIFICATIONS_ENABLED', true);

// Abilita notifiche browser (future)
define('AGENDA_BROWSER_NOTIFICATIONS_ENABLED', false);

// Massimo numero notifiche per evento
define('AGENDA_MAX_NOTIFICATIONS_PER_EVENT', 3);

// Default reminder (minuti)
define('AGENDA_DEFAULT_REMINDER_MINUTES', 15);

// Notifiche per eventi passati (cleanup)
define('AGENDA_CLEANUP_OLD_NOTIFICATIONS_DAYS', 30);

// Template email personalizzabile
define('AGENDA_EMAIL_TEMPLATE_HEADER_COLOR', '#3b82f6');
define('AGENDA_EMAIL_TEMPLATE_LOGO', 'https://studiomismo.it/logo.png');

// ==========================================
// CONFIGURAZIONI CATEGORIE
// ==========================================

// Massimo numero categorie
define('AGENDA_MAX_CATEGORIES', 20);

// Categorie obbligatorie (non eliminabili)
$AGENDA_REQUIRED_CATEGORIES = [
    'Riunioni Interne',
    'Appuntamenti Clienti',
    'Scadenze'
];

// Colori suggeriti per nuove categorie
$AGENDA_SUGGESTED_COLORS = [
    '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
    '#ec4899', '#14b8a6', '#6366f1', '#a855f7'
];

// Icone suggerite
$AGENDA_SUGGESTED_ICONS = [
    '👥', '📞', '✈️', '💻', '📊', '🎯', '⏰', '📚',
    '🎨', '🔧', '💼', '🏠', '🚗', '🏥', '🍕', '🎵'
];

// ==========================================
// CONFIGURAZIONI PERFORMANCE
// ==========================================

// Cache eventi (secondi)
define('AGENDA_CACHE_EVENTS_SECONDS', 300); // 5 minuti

// Limite eventi per query
define('AGENDA_EVENTS_QUERY_LIMIT', 1000);

// Log attività - giorni conservazione
define('AGENDA_ACTIVITY_LOG_RETENTION_DAYS', 365);

// Limite log per pagina
define('AGENDA_ACTIVITY_LOG_PAGE_LIMIT', 50);

// ==========================================
// CONFIGURAZIONI INTERFACCIA
// ==========================================

// Tema colori
$AGENDA_THEME_COLORS = [
    'primary' => '#3b82f6',
    'success' => '#22c55e',
    'warning' => '#f59e0b',
    'danger' => '#ef4444',
    'info' => '#06b6d4',
    'light' => '#f8fafc',
    'dark' => '#1e293b'
];

// Animazioni UI
define('AGENDA_ENABLE_ANIMATIONS', true);
define('AGENDA_ANIMATION_SPEED', 'normal'); // slow, normal, fast

// Tooltip su mobile
define('AGENDA_MOBILE_TOOLTIPS', false);

// ==========================================
// CONFIGURAZIONI SICUREZZA
// ==========================================

// Log accessi dettagliato
define('AGENDA_DETAILED_ACCESS_LOG', true);

// Timeout sessione agenda (secondi)
define('AGENDA_SESSION_TIMEOUT', 604800); // 1 ora

// Rate limiting creazione eventi
define('AGENDA_RATE_LIMIT_EVENTS_PER_MINUTE', 10);

// Validazione XSS avanzata
define('AGENDA_ADVANCED_XSS_PROTECTION', true);

// ==========================================
// CONFIGURAZIONI BACKUP
// ==========================================

// Abilita backup automatico
define('AGENDA_AUTO_BACKUP_ENABLED', true);

// Frequenza backup (ore)
define('AGENDA_BACKUP_FREQUENCY_HOURS', 24);

// Directory backup
define('AGENDA_BACKUP_DIRECTORY', '/backups/agenda/');

// Numero backup da conservare
define('AGENDA_BACKUP_RETENTION_COUNT', 30);

// ==========================================
// CONFIGURAZIONI INTEGRAZIONE
// ==========================================

// API esterna (future)
define('AGENDA_EXTERNAL_API_ENABLED', false);
define('AGENDA_API_KEY', ''); // Da generare

// Webhook per eventi (future)
define('AGENDA_WEBHOOKS_ENABLED', false);
define('AGENDA_WEBHOOK_URL', '');

// Integrazione calendario esterno
define('AGENDA_EXTERNAL_CALENDAR_SYNC', false);

// ==========================================
// CONFIGURAZIONI SVILUPPO
// ==========================================

// Debug mode
define('AGENDA_DEBUG_MODE', false);

// Log verbose
define('AGENDA_VERBOSE_LOGGING', false);

// Mostra query database
define('AGENDA_SHOW_DB_QUERIES', false);

// ==========================================
// FUNZIONI HELPER CONFIGURAZIONE
// ==========================================

/**
 * Ottieni configurazione con fallback
 */
function getAgendaConfig($key, $default = null) {
    return defined($key) ? constant($key) : $default;
}

/**
 * Ottieni colori tema
 */
function getAgendaThemeColors() {
    global $AGENDA_THEME_COLORS;
    return $AGENDA_THEME_COLORS ?? [
        'primary' => '#3b82f6',
        'success' => '#22c55e',
        'warning' => '#f59e0b',
        'danger' => '#ef4444'
    ];
}

/**
 * Ottieni categorie obbligatorie
 */
function getRequiredCategories() {
    global $AGENDA_REQUIRED_CATEGORIES;
    return $AGENDA_REQUIRED_CATEGORIES ?? [];
}

/**
 * Ottieni colori suggeriti
 */
function getSuggestedColors() {
    global $AGENDA_SUGGESTED_COLORS;
    return $AGENDA_SUGGESTED_COLORS ?? ['#3b82f6', '#22c55e', '#ef4444'];
}

/**
 * Ottieni icone suggerite  
 */
function getSuggestedIcons() {
    global $AGENDA_SUGGESTED_ICONS;
    return $AGENDA_SUGGESTED_ICONS ?? ['📅', '👥', '📞'];
}

/**
 * Verifica se feature è abilitata
 */
function isAgendaFeatureEnabled($feature) {
    $features = [
        'email_notifications' => AGENDA_EMAIL_NOTIFICATIONS_ENABLED,
        'browser_notifications' => AGENDA_BROWSER_NOTIFICATIONS_ENABLED,
        'auto_backup' => AGENDA_AUTO_BACKUP_ENABLED,
        'external_api' => AGENDA_EXTERNAL_API_ENABLED,
        'webhooks' => AGENDA_WEBHOOKS_ENABLED,
        'animations' => AGENDA_ENABLE_ANIMATIONS,
        'debug' => AGENDA_DEBUG_MODE
    ];
    
    return $features[$feature] ?? false;
}

/**
 * Personalizza configurazione per ambiente
 */
function loadEnvironmentConfig() {
    $environment = $_SERVER['SERVER_NAME'] ?? 'localhost';
    
    // Configurazioni specifiche per ambiente
    switch ($environment) {
        case 'portale.studiomismo.it':
            // Produzione
            define('AGENDA_ENVIRONMENT', 'production');
            break;
            
        case 'test.studiomismo.it':
            // Staging
            define('AGENDA_ENVIRONMENT', 'staging');
            break;
            
        default:
            // Sviluppo
            define('AGENDA_ENVIRONMENT', 'development');
    }
}

// Carica configurazione ambiente
loadEnvironmentConfig();

// Log configurazione caricata
if (getAgendaConfig('AGENDA_VERBOSE_LOGGING', false)) {
    error_log("Agenda config loaded for environment: " . getAgendaConfig('AGENDA_ENVIRONMENT', 'unknown'));
}

// ==========================================
// VALIDAZIONI CONFIGURAZIONE
// ==========================================

/**
 * Valida configurazioni all'avvio
 */
function validateAgendaConfig() {
    $errors = [];
    
    // Verifica configurazioni critiche
    if (!defined('AGENDA_DEFAULT_VIEW') || !in_array(AGENDA_DEFAULT_VIEW, ['month', 'week', 'day'])) {
        $errors[] = 'AGENDA_DEFAULT_VIEW deve essere month, week o day';
    }
    
    if (!defined('AGENDA_WEEK_START') || !in_array(AGENDA_WEEK_START, [0, 1])) {
        $errors[] = 'AGENDA_WEEK_START deve essere 0 o 1';
    }
    
    if (AGENDA_MAX_EVENTS_PER_DAY_MONTH_VIEW < 1 || AGENDA_MAX_EVENTS_PER_DAY_MONTH_VIEW > 10) {
        $errors[] = 'AGENDA_MAX_EVENTS_PER_DAY_MONTH_VIEW deve essere tra 1 e 10';
    }
    
    // Log errori se presenti
    if (!empty($errors)) {
        error_log("Agenda configuration errors: " . implode(', ', $errors));
    }
    
    return empty($errors);
}

// Esegui validazione
validateAgendaConfig();
?>
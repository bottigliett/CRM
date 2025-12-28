<?php
// File: /core/config/menu_config.php
// Configurazione menu laterale per CRM Studio Mismo

// Struttura menu - facilmente modificabile per aggiungere nuove pagine
$menu_config = [
    'admin' => [
        'title' => 'Dashboard Admin',
        'items' => [
            [
                'id' => 'home_dashboard',
                'label' => 'Home Dashboard',
                'icon' => 'home',
                'url' => '/modules/dashboard/index.php',
                'permission' => 'dashboard',
                'active' => true
            ],
            [
                'id' => 'agenda',
                'label' => 'Agenda',
                'icon' => 'calendar',
                'url' => '/modules/agenda/index.php',
                'permission' => 'agenda',
                'active' => false
            ],
            [
                'id' => 'task_manager',
                'label' => 'Task Manager',
                'icon' => 'tasks',
                'url' => '/modules/task_manager/index.php',
                'permission' => 'task_manager',
                'active' => false
            ],
            [
                'id' => 'finance_tracker',
                'label' => 'Finance Tracker',
                'icon' => 'dollar-sign',
                'url' => '/modules/finance_tracker/index.php',
                'permission' => 'finance_tracker',
                'active' => false
            ],
            [
                'id' => 'fatture',
                'label' => 'Fatture',
                'icon' => 'file-text',
                'url' => '/modules/fatture/index.php',
                'permission' => 'fatture',
                'active' => false
            ],
            [
                'id' => 'lead_contatti',
                'label' => 'Lead e Contatti',
                'icon' => 'users',
                'url' => '/modules/lead_contatti/index.php',
                'permission' => 'lead_contatti',
                'active' => false
            ],
            [
                'id' => 'post_it',
                'label' => 'Post-it',
                'icon' => 'sticky-note',
                'url' => '/modules/post_it/index.php',
                'permission' => 'post_it',
                'active' => false
            ],
            [
                'id' => 'blog',
                'label' => 'Blog',
                'icon' => 'edit',
                'url' => '/modules/blog/index.php',
                'permission' => 'blog',
                'active' => false
            ],
            [
                'id' => 'media',
                'label' => 'Media',
                'icon' => 'image',
                'url' => '/modules/media/index.php',
                'permission' => 'media',
                'active' => false
            ],
            [
                'id' => 'admin_utenti',
                'label' => 'Admin utenti',
                'icon' => 'user-check',
                'url' => '/modules/admin_utenti/index.php',
                'permission' => 'admin_utenti',
                'active' => false,
                'super_admin_only' => true
            ]
        ]
    ],
    'client' => [
        'title' => 'Dashboard Clienti',
        'items' => [
            [
                'id' => 'progetti',
                'label' => 'Progetti',
                'icon' => 'folder',
                'url' => '/modules/progetti/index.php',
                'permission' => 'progetti',
                'active' => false
            ],
            [
                'id' => 'proposte_contratti',
                'label' => 'Proposte e contratti',
                'icon' => 'file-signature',
                'url' => '/modules/proposte_contratti/index.php',
                'permission' => 'proposte_contratti',
                'active' => false
            ],
            [
                'id' => 'calcolatore_preventivi',
                'label' => 'Calcolatore preventivi',
                'icon' => 'calculator',
                'url' => '/modules/calcolatore_preventivi/index.php',
                'permission' => 'calcolatore_preventivi',
                'active' => false
            ],
            [
                'id' => 'ticket',
                'label' => 'Ticket',
                'icon' => 'help-circle',
                'url' => '/modules/ticket/index.php',
                'permission' => 'ticket',
                'active' => false
            ]
        ]
    ]
];

// Funzione per ottenere il menu filtrato per l'utente corrente
function getMenuForUser($userRole, $userPermissions) {
    global $menu_config;
    $filteredMenu = [];
    
    foreach ($menu_config as $sectionKey => $section) {
        $sectionItems = [];
        
        foreach ($section['items'] as $item) {
            // Controlla se l'item è solo per super admin
            if (isset($item['super_admin_only']) && $item['super_admin_only'] && $userRole !== 'super_admin') {
                continue;
            }
            
            // Controlla i permessi utente
            if (isset($userPermissions[$item['permission']]) && $userPermissions[$item['permission']]['can_read']) {
                $sectionItems[] = $item;
            }
        }
        
        if (!empty($sectionItems)) {
            $filteredMenu[$sectionKey] = [
                'title' => $section['title'],
                'items' => $sectionItems
            ];
        }
    }
    
    return $filteredMenu;
}

// Funzione per ottenere l'item attivo corrente
function getCurrentMenuItem($currentUrl) {
    global $menu_config;
    
    foreach ($menu_config as $section) {
        foreach ($section['items'] as $item) {
            if (strpos($currentUrl, $item['url']) !== false) {
                return $item;
            }
        }
    }
    
    return null;
}

// Funzione per aggiungere un nuovo item al menu (per future estensioni)
function addMenuItem($section, $item) {
    global $menu_config;
    
    if (isset($menu_config[$section])) {
        $menu_config[$section]['items'][] = $item;
        return true;
    }
    
    return false;
}

// Funzione per verificare se un utente può accedere a una specifica pagina
function canUserAccess($userId, $permission) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            SELECT can_read 
            FROM user_permissions 
            WHERE user_id = ? AND module_name = ?
        ");
        $stmt->execute([$userId, $permission]);
        $result = $stmt->fetch();
        
        return $result && $result['can_read'];
    } catch (Exception $e) {
        error_log("Error checking user permissions: " . $e->getMessage());
        return false;
    }
}
?>
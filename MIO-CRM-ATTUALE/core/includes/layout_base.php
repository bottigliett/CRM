<?php
// File: /core/includes/layout_base.php
// Layout base per tutte le pagine del CRM Studio Mismo - CON SOTTO-MENU

// Verifica che le variabili necessarie siano definite
if (!isset($currentUser)) {
    die('Layout error: currentUser not defined');
}

$pageTitle = $pageTitle ?? 'CRM Studio Mismo';
$currentPath = $_SERVER['REQUEST_URI'];
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?> - CRM Studio Mismo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/layout.css">
    <link rel="icon" href="/assets/images/Favicon_180x180_CRM.png" type="image/x-icon">
    <?php if (isset($additionalCSS)): ?>
        <?php foreach ($additionalCSS as $css): ?>
            <link rel="stylesheet" href="<?= htmlspecialchars($css) ?>">
        <?php endforeach; ?>
    <?php endif; ?>
    <style>
        /* Stili per sotto-menu - Stile Notion */
        .menu-item.has-submenu {
            position: relative;
        }
        
        .menu-item.has-submenu .submenu-arrow {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 10px;
            color: #787774;
            transition: transform 0.2s ease;
        }
        
        .menu-item.has-submenu.expanded .submenu-arrow {
            transform: translateY(-50%) rotate(90deg);
        }
        
        .submenu {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            background: rgba(55, 53, 47, 0.03);
        }
        
        .submenu.expanded {
            max-height: 200px;
        }
        
        .submenu-item {
            display: flex;
            align-items: center;
            padding: 8px 16px 8px 44px;
            color: #787774;
            text-decoration: none;
            font-size: 13px;
            font-weight: 400;
            transition: all 0.15s ease;
            border-left: 2px solid transparent;
            position: relative;
        }
        
        .submenu-item:hover {
            background: #e9e9e7;
            color: #37352f;
        }
        
        .submenu-item.active {
            background: #ffffff;
            color: #37352f;
            border-left-color: #37352f;
            font-weight: 500;
        }
        
        .submenu-item::before {
            content: '';
            width: 4px;
            height: 4px;
            background: #9b9b9b;
            border-radius: 50%;
            margin-right: 12px;
            flex-shrink: 0;
        }
        
        .submenu-item.active::before {
            background: #37352f;
        }
        
        /* Tooltip per submenu quando sidebar è collapsed */
        .sidebar.collapsed .submenu-item:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            background: #37352f;
            color: #ffffff;
            padding: 6px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1001;
            margin-left: 8px;
        }
        
        .sidebar.collapsed .submenu-item:hover::before {
            content: '';
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 4px solid transparent;
            border-right-color: #37352f;
            z-index: 1001;
        }
        
        /* Nascondi submenu quando sidebar è collapsed */
        .sidebar.collapsed .submenu {
            display: none;
        }
        
        .sidebar.collapsed .menu-item.has-submenu .submenu-arrow {
            display: none;
        }
    </style>
</head>
<body>
    <div class="app-layout">
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <div class="logo-icon">M</div>
                    <div class="logo-text">
                          <img src="/assets/images/logo_mismo_black.svg" alt="Logo Mismo" style="width: 4.2em;">
                    </div>
                </div>
                <button class="collapse-btn" id="collapseBtn">
                    <i>«</i>
                </button>
            </div>

            <div class="sidebar-content">
                <div class="menu-section">
                    <div class="menu-section-title">Dashboard Admin</div>
                    
                    <!-- Home Dashboard -->
                    <a href="/dashboard.php" 
                       class="menu-item <?= (basename($_SERVER['PHP_SELF']) === 'dashboard.php') ? 'active' : '' ?>" 
                       data-tooltip="Home Dashboard">
                        <img src="/assets/images/icone/house-blank.svg" alt="Icona Casa" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Home Dashboard</span>
                    </a>
                    
                    <!-- Agenda -->
                    <a href="/modules/agenda/" 
                       class="menu-item <?= strpos($currentPath, '/agenda/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Agenda">
                        <img src="/assets/images/icone/calendar-days.svg" alt="Icona Calendario" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Agenda</span>
                    </a>
                    
                    <!-- Task Manager -->
                    <a href="/modules/task_manager/" 
                       class="menu-item <?= strpos($currentPath, '/task_manager/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Task Manager">
                        <img src="/assets/images/icone/list-check.svg" alt="Icona Task Manager" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Task Manager</span>
                    </a>
                    
                    <!-- Lead e Contatti - CON SOTTO-MENU -->
                    <div class="menu-item has-submenu <?= strpos($currentPath, '/lead_contatti/') !== false ? 'active expanded' : '' ?>" 
                         id="leadContactsMenu" data-tooltip="Lead e Contatti">
                        <img src="/assets/images/icone/bullseye-arrow.svg" alt="Icona Lead e Contatti" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Lead e Contatti</span>
                        <span class="submenu-arrow">▶</span>
                    </div>
                    <div class="submenu <?= strpos($currentPath, '/lead_contatti/') !== false ? 'expanded' : '' ?>" id="leadContactsSubmenu">
                        <a href="/modules/lead_contatti/lead/" 
                           class="submenu-item <?= strpos($currentPath, '/lead_contatti/lead/') !== false ? 'active' : '' ?>" 
                           data-tooltip="Lead Board">
                            Lead Board
                        </a>
                        <a href="/modules/lead_contatti/contatti/" 
                           class="submenu-item <?= strpos($currentPath, '/lead_contatti/contatti/') !== false ? 'active' : '' ?>" 
                           data-tooltip="Anagrafiche Contatti">
                            Anagrafiche Contatti
                        </a>
                    </div>
                    
                    <!-- Finance Tracker -->
                    <a href="/modules/finance_tracker/" 
                       class="menu-item <?= strpos($currentPath, '/finance_tracker/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Finance Tracker">
                        <img src="/assets/images/icone/usd-circle.svg" alt="Icona Finance Tracker" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Finance Tracker</span>
                    </a>
                    
                    <!-- Fatture -->
                    <a href="/modules/fatture/" 
                       class="menu-item <?= strpos($currentPath, '/fatture/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Fatture">
                        <img src="/assets/images/icone/receipt.svg" alt="Icona Fatture" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Fatture</span>
                    </a>
                    
                    <!-- Post-it -->
                    <a href="/modules/notes/" 
                       class="menu-item <?= strpos($currentPath, '/notes/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Note">
                        <img src="/assets/images/icone/note-sticky.svg" alt="Icona Note" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Note</span>
                    </a>
                    
                    <!-- Blog -->
                    <!--<a href="/modules/blog/" 
                       class="menu-item <?= strpos($currentPath, '/blog/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Blog">
                        <img src="/assets/images/icone/pen-nib.svg" alt="Icona Blog" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Blog</span>
                    </a>-->
                    
                    <!-- Media -->
                    <!--<a href="/modules/media/" 
                       class="menu-item <?= strpos($currentPath, '/media/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Media">
                        <img src="/assets/images/icone/resources.svg" alt="Icona Media" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Media</span>
                    </a>-->
                    
                    <!-- Admin utenti -->
                    <a href="/modules/admin_utenti/" 
                       class="menu-item <?= strpos($currentPath, '/admin_utenti/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Admin utenti">
                        <img src="/assets/images/icone/gears.svg" alt="Icona Admin" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Admin utenti</span>
                    </a>
                </div>

                <div class="menu-section">
                    <div class="menu-section-title">Assistenza Clienti</div>
                    
                    <!-- Progetti -->
                    <!--<a href="/modules/progetti/" 
                       class="menu-item <?= strpos($currentPath, '/progetti/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Progetti">
                        <img src="/assets/images/icone/category-alt.svg" alt="Icona Progetti" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Progetti</span>
                    </a>-->
                    
                    <!-- Proposte e contratti -->
                    <!--<a href="/modules/proposte_contratti/" 
                       class="menu-item <?= strpos($currentPath, '/proposte_contratti/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Proposte e contratti">
                        <img src="/assets/images/icone/paperclip-vertical.svg" alt="Icona Proposte e Contratti" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Contratti</span>
                    </a>-->
                    
                    <!-- Calcolatore preventivi -->
                    <!--<a href="/modules/calcolatore_preventivi/" 
                       class="menu-item <?= strpos($currentPath, '/calcolatore_preventivi/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Calcolatore preventivi">
                        <img src="/assets/images/icone/calculator-simple.svg" alt="Icona Calcolatore Preventivi" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Calcolatore preventivi</span>
                    </a>-->
                    
                    <!-- Ticket -->
                    <a href="/modules/ticket/" 
                       class="menu-item <?= strpos($currentPath, '/ticket/') !== false ? 'active' : '' ?>" 
                       data-tooltip="Ticket">
                        <img src="/assets/images/icone/interrogation.svg" alt="Icona Ticket" style="width: 1.2em; height: 1.2em; margin-right: 1em;">
                        <span>Ticket</span>
                    </a>
                </div>
            </div>

            <div class="sidebar-footer">
                <a href="/core/auth/account.php" class="user-profile" id="userProfile">
                    <div class="user-avatar"><?= strtoupper(substr($currentUser['first_name'], 0, 1)) ?></div>
                    <div class="user-info">
                        <h4><?= htmlspecialchars($currentUser['first_name']) ?></h4>
                        <p><?= $currentUser['role'] === 'super_admin' ? 'Super Admin' : 'Admin' ?></p>
                    </div>
                </a>
            </div>
        </aside>

        <!-- Sidebar overlay for mobile -->
        <div class="sidebar-overlay" id="sidebarOverlay"></div>

        <!-- Main Content -->
        <main class="main-content" id="mainContent">
            <header class="top-header">
                <button class="mobile-menu-btn" id="mobileMenuBtn">
                    ☰
                </button>
                <h1 class="page-title"><?= htmlspecialchars($pageTitle) ?></h1>
                <div class="top-header-right">
                    <div class="date-time" id="currentDateTime"></div>
                    <button class="notification-bell" id="notificationBtn">
                        <img src="/assets/images/icone/bell.svg" alt="Icona Notifiche" style="width: 1.2em; height: 1.2em;">
                        <span class="notification-badge"></span>
                    </button>
                </div>
            </header>

            <div class="content-area">
                <?php if (isset($pageContent)): ?>
                    <?= $pageContent ?>
                <?php else: ?>
                    <p>Contenuto non definito</p>
                <?php endif; ?>
            </div>
        </main>
    </div>

    <!-- Scripts base -->
 <script src="/assets/js/menu.js?v=<?= time() ?>"></script>
    <script src="/assets/js/datetime.js?v=<?= time() ?>"></script>
    
    <?php if (isset($additionalJS)): ?>
        <?php foreach ($additionalJS as $js): ?>
            <script src="<?= htmlspecialchars($js) ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>

    <script>
        // Initialize layout when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof MenuManager !== 'undefined') {
                MenuManager.init();
            }
            if (typeof DateTimeUpdater !== 'undefined') {
                DateTimeUpdater.init();
            }
            
            // Gestione sotto-menu Lead/Contatti
            const leadContactsMenu = document.getElementById('leadContactsMenu');
            const leadContactsSubmenu = document.getElementById('leadContactsSubmenu');
            
            if (leadContactsMenu && leadContactsSubmenu) {
                leadContactsMenu.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Toggle expanded state
                    const isExpanded = leadContactsMenu.classList.contains('expanded');
                    
                    if (isExpanded) {
                        leadContactsMenu.classList.remove('expanded');
                        leadContactsSubmenu.classList.remove('expanded');
                        localStorage.setItem('leadContactsMenuExpanded', 'false');
                    } else {
                        leadContactsMenu.classList.add('expanded');
                        leadContactsSubmenu.classList.add('expanded');
                        localStorage.setItem('leadContactsMenuExpanded', 'true');
                    }
                });
                
                // Ripristina stato da localStorage
                const savedExpanded = localStorage.getItem('leadContactsMenuExpanded');
                if (savedExpanded === 'true') {
                    leadContactsMenu.classList.add('expanded');
                    leadContactsSubmenu.classList.add('expanded');
                }
            }
            
            console.log('Layout initialized for user:', {
                id: <?= $currentUser['id'] ?>,
                name: '<?= htmlspecialchars($currentUser['first_name']) ?>',
                role: '<?= $currentUser['role'] ?>'
            });
        });
    </script>
    <script>
    // Fix temporaneo submenu
    setTimeout(() => {
        const menu = document.getElementById('leadContactsMenu');
        const submenu = document.getElementById('leadContactsSubmenu');
        
        if (menu && submenu) {
            menu.onclick = function(e) {
                e.preventDefault();
                if (document.getElementById('sidebar').classList.contains('collapsed')) return;
                
                menu.classList.toggle('expanded');
                submenu.classList.toggle('expanded');
                console.log('Submenu toggled!');
            };
            console.log('Fix submenu applicato');
        }
    }, 500);
    </script>
</body>
</html>
<!DOCTYPE html>
<!-- File: /core/includes/layout.php -->
<!-- Layout principale per CRM Studio Mismo - Stile Notion -->
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?? 'CRM Studio Mismo' ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- CSS Esterni Stile Notion -->
    <link rel="stylesheet" href="/assets/css/layout.css">
    <link rel="stylesheet" href="/assets/css/dashboard.css">
    
    <!-- CSS Aggiuntivi se specificati -->
    <?php if (isset($additionalCSS) && is_array($additionalCSS)): ?>
        <?php foreach ($additionalCSS as $css): ?>
            <link rel="stylesheet" href="<?= htmlspecialchars($css) ?>">
        <?php endforeach; ?>
    <?php endif; ?>
</head>
<body>
    <div class="app-layout">
        <!-- Sidebar -->
        <nav class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <div class="logo-icon">M</div>
                    <div class="logo-text">MISMO</div>
                </div>
                <button class="collapse-btn" id="collapseBtn">
                    <i class="fas fa-chevron-left"></i>
                </button>
            </div>

            <div class="sidebar-content">
                <!-- Dashboard Admin -->
                <div class="menu-section">
                    <div class="menu-section-title">Dashboard Admin</div>
                    <a href="/dashboard.php" class="menu-item <?= ($pageTitle === 'Dashboard' || !isset($pageTitle)) ? 'active' : '' ?>" data-tooltip="Home Dashboard">
                        <i class="fas fa-home"></i>
                        <span>Home Dashboard</span>
                    </a>
                    <a href="/modules/agenda/" class="menu-item" data-tooltip="Agenda">
                        <i class="fas fa-calendar"></i>
                        <span>Agendas</span>
                    </a>
                    <a href="/modules/task_manager/" class="menu-item" data-tooltip="Task Manager">
                        <i class="fas fa-tasks"></i>
                        <span>Task Manager</span>
                    </a>
                    <a href="/modules/finance_tracker/" class="menu-item" data-tooltip="Finance Tracker">
                        <i class="fas fa-chart-line"></i>
                        <span>Finance Tracker</span>
                    </a>
                    <a href="/modules/fatture/" class="menu-item" data-tooltip="Fatture">
                        <i class="fas fa-file-invoice"></i>
                        <span>Fatture</span>
                    </a>
                    <a href="/modules/lead_contatti/" class="menu-item" data-tooltip="Lead e Contatti">
                        <i class="fas fa-users"></i>
                        <span>Lead e Contatti</span>
                    </a>
                    <a href="/modules/post_it/" class="menu-item" data-tooltip="Post-it">
                        <i class="fas fa-sticky-note"></i>
                        <span>Post-it</span>
                    </a>
                    <a href="/modules/blog/" class="menu-item" data-tooltip="Blog">
                        <i class="fas fa-blog"></i>
                        <span>Blog</span>
                    </a>
                    <a href="/modules/media/" class="menu-item" data-tooltip="Media">
                        <i class="fas fa-images"></i>
                        <span>Media</span>
                    </a>
                    <a href="/modules/admin_utenti/" class="menu-item" data-tooltip="Admin Utenti">
                        <i class="fas fa-user-cog"></i>
                        <span>Admin utenti</span>
                    </a>
                </div>

                <!-- Dashboard Clienti -->
                <div class="menu-section">
                    <div class="menu-section-title">Dashboard Clienti</div>
                    <a href="/modules/progetti/" class="menu-item" data-tooltip="Progetti">
                        <i class="fas fa-folder"></i>
                        <span>Progetti</span>
                    </a>
                    <a href="/modules/proposte_contratti/" class="menu-item" data-tooltip="Proposte e Contratti">
                        <i class="fas fa-file-contract"></i>
                        <span>Proposte e contratti</span>
                    </a>
                    <a href="/modules/calcolatore_preventivi/" class="menu-item" data-tooltip="Calcolatore Preventivi">
                        <i class="fas fa-calculator"></i>
                        <span>Calcolatore preventivi</span>
                    </a>
                    <a href="/modules/ticket/" class="menu-item" data-tooltip="Ticket">
                        <i class="fas fa-ticket-alt"></i>
                        <span>Ticket</span>
                    </a>
                </div>
            </div>

            <div class="sidebar-footer">
                <a href="/core/auth/account.php" class="user-profile">
                    <div class="user-avatar">
                        <?php
                        // DEBUG TEMPORANEO - rimuovere dopo il fix
                        error_log("Layout avatar debug: " . print_r($currentUser, true));

                        // Ricarica utente per forzare i dati aggiornati
                        if (!isset($currentUser['profile_image'])) {
                            require_once __DIR__ . '/../includes/auth_helper.php';
                            $currentUser = getCurrentUser();
                        }

                        if (!empty($currentUser['profile_image'])):
                        ?>
                            <img src="<?= htmlspecialchars($currentUser['profile_image']) ?>?v=<?= time() ?>" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">
                        <?php else: ?>
                            <?= strtoupper(substr($currentUser['first_name'], 0, 1) . substr($currentUser['last_name'], 0, 1)) ?>
                        <?php endif; ?>
                    </div>
                    <div class="user-info">
                        <h4><?= htmlspecialchars($currentUser['first_name'] . ' ' . $currentUser['last_name']) ?></h4>
                        <p><?= $currentUser['role'] === 'super_admin' ? 'Super Admin' : 'Admin' ?></p>
                    </div>
                </a>
            </div>
        </nav>

        <!-- Sidebar overlay for mobile -->
        <div class="sidebar-overlay" id="sidebarOverlay"></div>

        <!-- Main content -->
        <main class="main-content" id="mainContent">
            <!-- Top header -->
            <header class="top-header">
                <div class="top-header-left">
                    <button class="mobile-menu-btn" id="mobileMenuBtn">
                        <i class="fas fa-bars"></i>
                    </button>
                    <h1 class="page-title"><?= $pageTitle ?? 'Dashboard' ?></h1>
                </div>

                <div class="top-header-right">
                    <div class="date-time" id="currentDateTime"></div>
                    
                    <button class="notification-bell" onclick="toggleNotifications()">
                        <i class="fas fa-bell"></i>
                        <span class="notification-badge">3</span>
                    </button>
                </div>
            </header>

            <!-- Page content -->
            <div class="content-area">
                <?php if (isset($content)) echo $content; ?>
            </div>
        </main>
    </div>

    <!-- JavaScript Esterni -->
    <script src="/assets/js/menu.js"></script>
    <script src="/assets/js/datetime.js"></script>
    
    <!-- JavaScript Aggiuntivi se specificati -->
    <?php if (isset($additionalJS) && is_array($additionalJS)): ?>
        <?php foreach ($additionalJS as $js): ?>
            <script src="<?= htmlspecialchars($js) ?>"></script>
        <?php endforeach; ?>
    <?php endif; ?>

    <script>
        // Menu mobile toggle
        document.getElementById('mobileMenuBtn')?.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            
            sidebar.classList.add('mobile-open');
            overlay.classList.add('show');
        });

        // Sidebar collapse toggle (desktop)
        document.getElementById('collapseBtn')?.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('sidebar-collapsed');
        });

        // Overlay click to close
        document.getElementById('sidebarOverlay')?.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('show');
        });

        // Update current date and time
        function updateDateTime() {
            const now = new Date();
            const options = { 
                weekday: 'short', 
                day: '2-digit', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
            };
            const dateTimeElement = document.getElementById('currentDateTime');
            if (dateTimeElement) {
                dateTimeElement.textContent = now.toLocaleDateString('it-IT', options).toUpperCase();
            }
        }

        updateDateTime();
        setInterval(updateDateTime, 60000); // Update every minute

        // Notifications toggle (placeholder)
        function toggleNotifications() {
            console.log('Notifications clicked');
            // TODO: Implement notifications panel
        }

        // Active menu item highlighting
        document.addEventListener('DOMContentLoaded', function() {
            const currentPath = window.location.pathname;
            const menuItems = document.querySelectorAll('.menu-item');
            
            menuItems.forEach(item => {
                item.classList.remove('active');
                const href = item.getAttribute('href');
                
                // Highlighting logic
                if (href === '/dashboard.php' && (currentPath === '/' || currentPath === '/dashboard.php')) {
                    item.classList.add('active');
                } else if (href !== '/dashboard.php' && currentPath.includes(href.replace('/modules/', '').replace('/', ''))) {
                    item.classList.add('active');
                }
            });
        });

        console.log('Layout Notion loaded:', {
            page: '<?= $pageTitle ?? 'Dashboard' ?>',
            user: '<?= htmlspecialchars($currentUser['first_name']) ?>',
            time: new Date().toISOString()
        });
    </script>
</body>
</html>
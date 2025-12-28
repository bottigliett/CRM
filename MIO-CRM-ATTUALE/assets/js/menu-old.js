// JavaScript per gestione menu CRM Studio Mismo - CON SUPPORTO SOTTO-MENU
// VERSIONE: 2.1 - Fix collapse button (26 Aug 2025)

console.log('📋 Menu.js v2.1 caricato - Fix collapse button');

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inizializzazione menu...');
    
    // Elementi del menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const collapseBtn = document.getElementById('collapseBtn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Menu mobile toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            sidebar?.classList.add('mobile-open');
            sidebarOverlay?.classList.add('show');
        });
    }

    // Sidebar collapse toggle (desktop)
    if (collapseBtn) {
        console.log('✅ Collapse button trovato, aggiungo listener');
        collapseBtn.addEventListener('click', function() {
            console.log('🔄 Collapse button cliccato');
            sidebar?.classList.toggle('collapsed');
            mainContent?.classList.toggle('sidebar-collapsed');
            
            // Salva stato nel localStorage
            const isCollapsed = sidebar?.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
            
            console.log('Sidebar collapsed:', isCollapsed);
        });
    } else {
        console.log('❌ Collapse button non trovato!');
    }

    // Ripristina stato sidebar dal localStorage
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed === 'true') {
        sidebar?.classList.add('collapsed');
        mainContent?.classList.add('sidebar-collapsed');
    }

    // Overlay click to close
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar?.classList.remove('mobile-open');
            sidebarOverlay?.classList.remove('show');
        });
    }

    // Chiudi menu mobile con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            sidebar?.classList.remove('mobile-open');
            sidebarOverlay?.classList.remove('show');
        }
    });

    // === GESTIONE SOTTO-MENU ===
    setupSubmenus();

    // Active menu item highlighting
    highlightActiveMenuItem();

    // Auto-collapse su tablet in landscape
    handleResponsiveCollapse();
    window.addEventListener('resize', handleResponsiveCollapse);
    
    console.log('✅ Menu inizializzato con successo');
});

function setupSubmenus() {
    // Gestione sotto-menu per Lead e Contatti
    const leadContactsMenu = document.getElementById('leadContactsMenu');
    const leadContactsSubmenu = document.getElementById('leadContactsSubmenu');
    
    if (leadContactsMenu && leadContactsSubmenu) {
        leadContactsMenu.addEventListener('click', function(e) {
            e.preventDefault();
            
            const sidebar = document.getElementById('sidebar');
            
            // Non aprire/chiudere il submenu se la sidebar è collapsed
            if (sidebar?.classList.contains('collapsed')) {
                return;
            }
            
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
        
        // Ripristina stato da localStorage (solo se sidebar non è collapsed)
        const sidebar = document.getElementById('sidebar');
        if (!sidebar?.classList.contains('collapsed')) {
            const savedExpanded = localStorage.getItem('leadContactsMenuExpanded');
            if (savedExpanded === 'true') {
                leadContactsMenu.classList.add('expanded');
                leadContactsSubmenu.classList.add('expanded');
            }
        }
        
        // Auto-expand se siamo in una delle sotto-pagine
        const currentPath = window.location.pathname;
        if (currentPath.includes('/lead_contatti/')) {
            leadContactsMenu.classList.add('expanded');
            leadContactsSubmenu.classList.add('expanded');
            localStorage.setItem('leadContactsMenuExpanded', 'true');
        }
    }
}

function highlightActiveMenuItem() {
    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        // Solo per elementi <a>, non per i div dei submenu
        if (item.tagName === 'A') {
            item.classList.remove('active');
            const href = item.getAttribute('href');
            
            if (href === '/dashboard.php' && (currentPath === '/' || currentPath === '/dashboard.php')) {
                item.classList.add('active');
            } else if (href !== '/dashboard.php' && href && currentPath.includes(href.split('/')[2])) {
                item.classList.add('active');
            }
        }
    });
}

function handleResponsiveCollapse() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (window.innerWidth <= 1200 && window.innerWidth > 768) {
        // Tablet: forza collapse
        sidebar?.classList.add('collapsed');
        mainContent?.classList.add('sidebar-collapsed');
    } else if (window.innerWidth > 1200) {
        // Desktop: ripristina stato salvato
        const savedCollapsed = localStorage.getItem('sidebarCollapsed');
        if (savedCollapsed !== 'true') {
            sidebar?.classList.remove('collapsed');
            mainContent?.classList.remove('sidebar-collapsed');
        }
    }
}

// Funzioni utility esportate globalmente
window.MenuUtils = {
    toggleSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        sidebar?.classList.toggle('collapsed');
        mainContent?.classList.toggle('sidebar-collapsed');
        
        // Salva stato
        const isCollapsed = sidebar?.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    },
    
    closeMobileMenu: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar?.classList.remove('mobile-open');
        overlay?.classList.remove('show');
    },
    
    openMobileMenu: function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar?.classList.add('mobile-open');
        overlay?.classList.add('show');
    },
    
    // Debug function
    debugSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const collapseBtn = document.getElementById('collapseBtn');
        
        console.log('Debug Sidebar:', {
            sidebar: sidebar,
            sidebarClasses: sidebar?.classList.toString(),
            mainContent: mainContent,
            mainContentClasses: mainContent?.classList.toString(),
            collapseBtn: collapseBtn,
            localStorage: localStorage.getItem('sidebarCollapsed')
        });
    }
};

console.log('📋 Menu.js v2.1 - Caricamento completato');
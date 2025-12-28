// File: /assets/js/notifications.js
// Sistema Centro Notifiche - Stile Notion

class NotificationCenter {
    constructor() {
        this.isOpen = false;
        this.notifications = [];
        this.pollInterval = null;
        this.init();
    }
    
    init() {
        console.log('🔔 Inizializzazione Centro Notifiche...');
        
        // Crea elementi UI
        this.createNotificationPanel();
        this.attachEventListeners();
        
        // Carica notifiche iniziali
        this.loadNotifications();
        
        // Polling per aggiornamenti (ogni 30 secondi)
        this.startPolling();
        
        console.log('✅ Centro Notifiche inizializzato');
    }
    
    createNotificationPanel() {
        // Crea overlay
        const overlay = document.createElement('div');
        overlay.id = 'notification-overlay';
        overlay.className = 'notification-overlay';
        document.body.appendChild(overlay);
        
        // Crea pannello notifiche
        const panel = document.createElement('div');
        panel.id = 'notification-panel';
        panel.className = 'notification-panel';
        panel.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    
                    <h3>Notifiche</h3>
                </div>
                <div class="notification-actions">
                    <button class="action-btn mark-all-read" title="Segna tutte come lette">
                        ✓ Tutte lette
                    </button>
                    <button class="action-btn close-panel" title="Chiudi">
                        ✕
                    </button>
                </div>
            </div>
            
            <div class="notification-content">
                <div class="notification-loading">
                    <div class="loading-spinner"></div>
                    <p>Caricamento notifiche...</p>
                </div>
            </div>
            
            <div class="notification-footer">
                <button class="load-more-btn" style="display: none;">
                    Carica altre notifiche
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // CSS del pannello
        this.injectCSS();
    }
    
    attachEventListeners() {
        // Click su campanello
        const bellBtn = document.getElementById('notificationBtn');
        if (bellBtn) {
            bellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePanel();
            });
        }
        
        // Click su overlay per chiudere
        document.getElementById('notification-overlay').addEventListener('click', () => {
            this.closePanel();
        });
        
        // Bottone chiudi
        document.querySelector('.close-panel').addEventListener('click', () => {
            this.closePanel();
        });
        
        // Segna tutte come lette
        document.querySelector('.mark-all-read').addEventListener('click', () => {
            this.markAllAsRead();
        });
        
        // Carica altre notifiche
        document.querySelector('.load-more-btn').addEventListener('click', () => {
            this.loadMoreNotifications();
        });
        
        // Click fuori dal pannello
        document.addEventListener('click', (e) => {
            if (this.isOpen && !e.target.closest('#notification-panel') && !e.target.closest('#notificationBtn')) {
                this.closePanel();
            }
        });
    }
    
    async loadNotifications(offset = 0) {
        try {
            const response = await fetch(`/api/notifications.php?action=get&offset=${offset}&limit=20`);
            const data = await response.json();
            
            if (data.success) {
                if (offset === 0) {
                    this.notifications = data.notifications;
                } else {
                    this.notifications.push(...data.notifications);
                }
                
                this.renderNotifications();
                this.updateBadge(data.unread_count);
                
                // Mostra/nascondi bottone "carica altro"
                const loadMoreBtn = document.querySelector('.load-more-btn');
                loadMoreBtn.style.display = data.notifications.length === 20 ? 'block' : 'none';
                
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            console.error('❌ Errore caricamento notifiche:', error);
            this.showError('Errore nel caricamento delle notifiche');
        }
    }
    
    async loadMoreNotifications() {
        await this.loadNotifications(this.notifications.length);
    }
    
    renderNotifications() {
        const content = document.querySelector('.notification-content');
        
        if (this.notifications.length === 0) {
            content.innerHTML = `
                <div class="no-notifications">
                    <div class="no-notifications-icon">🔕</div>
                    <h4>Nessuna notifica</h4>
                    <p>Quando riceverai notifiche, appariranno qui</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="notifications-list">';
        
        this.notifications.forEach(notification => {
            const isUnread = !notification.is_read;
            
            html += `
                <div class="notification-item ${isUnread ? 'unread' : ''}" 
                     data-id="${notification.id}">
                    
                    <div class="notification-item-icon" 
                         style="background: ${notification.event_color || notification.type_color}20;">
                        ${notification.event_icon || notification.type_icon}
                    </div>
                    
                    <div class="notification-item-content">
                        <div class="notification-item-title">
                            ${notification.title}
                            ${isUnread ? '<div class="unread-dot"></div>' : ''}
                        </div>
                        
                        <div class="notification-item-message">
                            ${notification.message}
                        </div>
                        
                        ${notification.event_title ? `
                            <div class="notification-item-event">
                                📅 ${notification.event_title}
                            </div>
                        ` : ''}
                        
                        <div class="notification-item-time">
                            ${notification.time_ago}
                        </div>
                    </div>
                    
                    <div class="notification-item-actions">
                        ${isUnread ? `
                            <button class="notification-action read-btn" 
                                    onclick="notificationCenter.markAsRead(${notification.id})"
                                    title="Segna come letta">
                                ✓
                            </button>
                        ` : ''}
                        
                        <button class="notification-action delete-btn" 
                                onclick="notificationCenter.deleteNotification(${notification.id})"
                                title="Elimina">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        content.innerHTML = html;
    }
    
    async markAsRead(notificationId) {
        try {
            const formData = new FormData();
            formData.append('action', 'mark_read');
            formData.append('notification_id', notificationId);
            
            const response = await fetch('/api/notifications.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Aggiorna localmente
                const notification = this.notifications.find(n => n.id == notificationId);
                if (notification) {
                    notification.is_read = true;
                }
                
                this.renderNotifications();
                this.updateUnreadCount();
                
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            console.error('❌ Errore marca come letta:', error);
        }
    }
    
    async markAllAsRead() {
        try {
            const formData = new FormData();
            formData.append('action', 'mark_all_read');
            
            const response = await fetch('/api/notifications.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Aggiorna tutte localmente
                this.notifications.forEach(n => n.is_read = true);
                
                this.renderNotifications();
                this.updateBadge(0);
                
                if (window.toastManager) {
                    window.toastManager.success(data.message, 'Notifiche');
                }
                
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            console.error('❌ Errore marca tutte come lette:', error);
        }
    }
    
    async deleteNotification(notificationId) {
        try {
            const formData = new FormData();
            formData.append('action', 'delete');
            formData.append('notification_id', notificationId);
            
            const response = await fetch('/api/notifications.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Rimuovi localmente
                this.notifications = this.notifications.filter(n => n.id != notificationId);
                
                this.renderNotifications();
                this.updateUnreadCount();
                
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            console.error('❌ Errore eliminazione notifica:', error);
        }
    }
    
    async updateUnreadCount() {
        try {
            const response = await fetch('/api/notifications.php?action=get_count');
            const data = await response.json();
            
            if (data.success) {
                this.updateBadge(data.unread_count);
            }
            
        } catch (error) {
            console.error('❌ Errore conteggio notifiche:', error);
        }
    }
    
    updateBadge(count) {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    togglePanel() {
        if (this.isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }
    
    openPanel() {
        document.getElementById('notification-overlay').classList.add('show');
        document.getElementById('notification-panel').classList.add('show');
        this.isOpen = true;
        
        // Ricarica notifiche quando si apre
        this.loadNotifications();
    }
    
    closePanel() {
        document.getElementById('notification-overlay').classList.remove('show');
        document.getElementById('notification-panel').classList.remove('show');
        this.isOpen = false;
    }
    
    startPolling() {
        this.pollInterval = setInterval(() => {
            if (!this.isOpen) {
                this.updateUnreadCount();
            }
        }, 30000); // Ogni 30 secondi
    }
    
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }
    
    showError(message) {
        const content = document.querySelector('.notification-content');
        content.innerHTML = `
            <div class="notification-error">
                <div class="error-icon">❌</div>
                <p>${message}</p>
                <button onclick="notificationCenter.loadNotifications()">
                    🔄 Riprova
                </button>
            </div>
        `;
    }
    
    injectCSS() {
        if (document.getElementById('notification-center-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-center-styles';
        style.textContent = `
            /* Overlay */
            .notification-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.4);
                z-index: 9998;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
            }
            
            .notification-overlay.show {
                opacity: 1;
                visibility: visible;
            }
            
            /* Pannello notifiche */
            .notification-panel {
                position: fixed;
                top: 60px;
                right: 20px;
                width: 380px;
                max-height: 600px;
                background: #ffffff;
                border: 1px solid #e9e9e7;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                z-index: 9999;
                transform: translateY(-10px) scale(0.95);
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
            }
            
            .notification-panel.show {
                transform: translateY(0) scale(1);
                opacity: 1;
                visibility: visible;
            }
            
            /* Header */
            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid #e9e9e7;
                background: #f7f7f5;
                border-radius: 12px 12px 0 0;
            }
            
            .notification-title {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .notification-title h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #37352f;
            }
            
            .notification-icon {
                font-size: 18px;
            }
            
            .notification-actions {
                display: flex;
                gap: 8px;
            }
            
            .action-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                background: #e9e9e7;
                color: #37352f;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            
            .action-btn:hover {
                background: #d1d1d1;
            }
            
            /* Content */
            .notification-content {
                flex: 1;
                overflow-y: auto;
                max-height: 480px;
            }
            
            .notifications-list {
                padding: 0;
            }
            
            .notification-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 16px 20px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: background 0.15s ease;
                position: relative;
            }
            
            .notification-item:hover {
                background: #f7f7f5;
            }
            
            .notification-item.unread {
                background: #f0f9ff;
                border-left: 3px solid #3b82f6;
            }
            
            .notification-item-icon {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
            }
            
            .notification-item-content {
                flex: 1;
                min-width: 0;
            }
            
            .notification-item-title {
                font-size: 14px;
                font-weight: 600;
                color: #37352f;
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .unread-dot {
                width: 6px;
                height: 6px;
                background: #3b82f6;
                border-radius: 50%;
                flex-shrink: 0;
            }
            
            .notification-item-message {
                font-size: 13px;
                color: #787774;
                line-height: 1.4;
                margin-bottom: 6px;
            }
            
            .notification-item-event {
                font-size: 12px;
                color: #8b5cf6;
                background: #f3f4f6;
                padding: 4px 8px;
                border-radius: 4px;
                display: inline-block;
                margin-bottom: 6px;
            }
            
            .notification-item-time {
                font-size: 11px;
                color: #9ca3af;
            }
            
            .notification-item-actions {
                display: flex;
                gap: 4px;
                opacity: 0;
                transition: opacity 0.15s ease;
            }
            
            .notification-item:hover .notification-item-actions {
                opacity: 1;
            }
            
            .notification-action {
                width: 24px;
                height: 24px;
                border: none;
                border-radius: 4px;
                background: #f0f0f0;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                transition: all 0.15s ease;
            }
            
            .notification-action:hover {
                background: #e0e0e0;
                transform: scale(1.1);
            }
            
            .read-btn:hover {
                background: #dcfce7;
                color: #16a34a;
            }
            
            .delete-btn:hover {
                background: #fecaca;
                color: #dc2626;
            }
            
            /* Footer */
            .notification-footer {
                padding: 16px 20px;
                border-top: 1px solid #e9e9e7;
                background: #fafafa;
                border-radius: 0 0 12px 12px;
            }
            
            .load-more-btn {
                width: 100%;
                padding: 8px 16px;
                border: 1px solid #e9e9e7;
                border-radius: 6px;
                background: #ffffff;
                color: #37352f;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            
            .load-more-btn:hover {
                background: #f7f7f5;
                border-color: #d1d1d1;
            }
            
            /* Stati vuoti */
            .no-notifications,
            .notification-loading,
            .notification-error {
                text-align: center;
                padding: 40px 20px;
            }
            
            .no-notifications-icon,
            .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .no-notifications h4 {
                margin: 0 0 8px 0;
                font-size: 16px;
                font-weight: 600;
                color: #37352f;
            }
            
            .no-notifications p {
                margin: 0;
                font-size: 14px;
                color: #787774;
            }
            
            .loading-spinner {
                width: 24px;
                height: 24px;
                border: 2px solid #f0f0f0;
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Responsive */
            @media (max-width: 480px) {
                .notification-panel {
                    right: 10px;
                    left: 10px;
                    width: auto;
                    top: 50px;
                }
                
                .notification-item {
                    padding: 12px 16px;
                }
                
                .notification-header {
                    padding: 12px 16px;
                }
            }
            
            /* Badge migliorato */
            .notification-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: #ef4444;
                color: white;
                border-radius: 10px;
                padding: 2px 6px;
                font-size: 11px;
                font-weight: 600;
                min-width: 18px;
                text-align: center;
                line-height: 1.2;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Inizializza quando DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    // Aspetta che il layout sia caricato
    setTimeout(() => {
        if (document.getElementById('notificationBtn')) {
            window.notificationCenter = new NotificationCenter();
        }
    }, 500);
});

console.log('🔔 Notification Center Script caricato');
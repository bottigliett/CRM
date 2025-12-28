// File: /assets/js/toast.js
// Sistema di notifiche toast per CRM Studio Mismo

class ToastManager {
    constructor() {
        this.toasts = [];
        this.container = null;
        this.init();
    }
    
    init() {
        // Crea container per i toast se non esiste
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
        
        // Aggiungi CSS se non esiste
        this.injectCSS();
    }
    
    injectCSS() {
        if (document.getElementById('toast-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 400px;
            }
            
            .toast {
                background: white;
                border: 1px solid #e9e9e7;
                border-radius: 8px;
                padding: 16px 20px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 300px;
                animation: toastSlideIn 0.3s ease-out;
                position: relative;
                overflow: hidden;
            }
            
            .toast.removing {
                animation: toastSlideOut 0.3s ease-in forwards;
            }
            
            @keyframes toastSlideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes toastSlideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .toast-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            
            .toast-content {
                flex: 1;
            }
            
            .toast-title {
                font-weight: 600;
                font-size: 14px;
                color: #37352f;
                margin-bottom: 4px;
            }
            
            .toast-message {
                font-size: 13px;
                color: #787774;
                line-height: 1.4;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: #787774;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.15s ease;
                flex-shrink: 0;
            }
            
            .toast-close:hover {
                background: #f7f7f5;
                color: #37352f;
            }
            
            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: currentColor;
                opacity: 0.3;
                animation: toastProgress linear;
            }
            
            @keyframes toastProgress {
                from { width: 100%; }
                to { width: 0%; }
            }
            
            /* Tipi di toast */
            .toast.success {
                border-left: 4px solid #22c55e;
                color: #22c55e;
            }
            
            .toast.error {
                border-left: 4px solid #ef4444;
                color: #ef4444;
            }
            
            .toast.warning {
                border-left: 4px solid #f59e0b;
                color: #f59e0b;
            }
            
            .toast.info {
                border-left: 4px solid #3b82f6;
                color: #3b82f6;
            }
            
            /* Responsive */
            @media (max-width: 480px) {
                .toast-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
                
                .toast {
                    min-width: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    show(message, type = 'info', title = null, duration = 5000) {
        const id = this.generateId();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.dataset.id = id;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const titles = {
            success: title || 'Successo',
            error: title || 'Errore',
            warning: title || 'Attenzione',
            info: title || 'Informazione'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="toastManager.remove('${id}')">&times;</button>
            ${duration > 0 ? `<div class="toast-progress" style="animation-duration: ${duration}ms"></div>` : ''}
        `;
        
        this.container.appendChild(toast);
        this.toasts.push({ id, element: toast, type });
        
        // Auto-remove dopo duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }
        
        // Limita il numero di toast visibili
        this.limitToasts();
        
        return id;
    }
    
    success(message, title = null, duration = 4000) {
        return this.show(message, 'success', title, duration);
    }
    
    error(message, title = null, duration = 6000) {
        return this.show(message, 'error', title, duration);
    }
    
    warning(message, title = null, duration = 5000) {
        return this.show(message, 'warning', title, duration);
    }
    
    info(message, title = null, duration = 4000) {
        return this.show(message, 'info', title, duration);
    }
    
    remove(id) {
        const toast = this.toasts.find(t => t.id === id);
        if (!toast) return;
        
        toast.element.classList.add('removing');
        
        setTimeout(() => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
            this.toasts = this.toasts.filter(t => t.id !== id);
        }, 300);
    }
    
    clear() {
        this.toasts.forEach(toast => {
            this.remove(toast.id);
        });
    }
    
    limitToasts(maxToasts = 5) {
        while (this.toasts.length > maxToasts) {
            const oldest = this.toasts[0];
            this.remove(oldest.id);
        }
    }
    
    generateId() {
        return 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
}

// Crea istanza globale
const toastManager = new ToastManager();

// Export per uso in moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToastManager;
}

// Rendi disponibile globalmente
window.toastManager = toastManager;
window.ToastManager = ToastManager;

console.log('🍞 Toast Manager caricato');
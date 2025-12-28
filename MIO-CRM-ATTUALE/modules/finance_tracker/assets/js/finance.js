// File: /modules/finance_tracker/assets/js/finance.js
// Finance Tracker JavaScript - Versione Corretta con Fix Grafici

// Variabili globali
let trendChart = null;
let balanceChart = null;
let incomeChart = null;
let expenseChart = null;
let currentTransactionType = 'income';
let editingTransactionId = null;
let chartsInitialized = false;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    console.log('💰 Finance Tracker inizializzato');
    
    // Verifica che Chart.js sia caricato
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js non caricato!');
        return;
    }
    
    // Inizializza grafici solo una volta
    if (!chartsInitialized) {
        initCharts();
        chartsInitialized = true;
    }
    
    // Event listeners
    setupEventListeners();
    
    // Carica dati iniziali
    if (typeof chartData !== 'undefined') {
        updateCharts(chartData);
    }
});

// Setup Event Listeners
function setupEventListeners() {
    // Form transazione
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionSubmit);
    }
    
    // Form categoria
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategorySubmit);
    }
    
    // Checkbox ricorrente
    const recurringCheckbox = document.querySelector('input[name="is_recurring"]');
    if (recurringCheckbox) {
        recurringCheckbox.addEventListener('change', function() {
            const intervalSelect = document.querySelector('select[name="recurring_interval"]');
            intervalSelect.style.display = this.checked ? 'block' : 'none';
        });
    }
}

// Inizializza grafici Chart.js
function initCharts() {
    console.log('📊 Inizializzazione grafici...');
    
    // Configurazione comune
    Chart.defaults.font.family = "'Inter Tight', -apple-system, sans-serif";
    Chart.defaults.color = '#37352f';
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    
    // Grafico andamento mensile
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx && !trendChart) {
        const ctx = trendCtx.getContext('2d');
        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Entrate',
                    data: [],
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true
                }, {
                    label: 'Uscite',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#37352f',
                        titleFont: { size: 13 },
                        bodyFont: { size: 12 },
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': € ' + 
                                       context.parsed.y.toLocaleString('it-IT', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { size: 12 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f7f7f5'
                        },
                        ticks: {
                            font: { size: 12 },
                            callback: function(value) {
                                return '€ ' + value.toLocaleString('it-IT');
                            }
                        }
                    }
                },
                animation: {
                    duration: 750
                }
            }
        });
        console.log('✅ Grafico trend creato');
    }

    // Grafico bilancio entrate/uscite
    const balanceCtx = document.getElementById('balanceChart');
    if (balanceCtx && !balanceChart) {
        const ctx = balanceCtx.getContext('2d');

        // Ottieni i dati totali dalla pagina
        const statsCards = document.querySelectorAll('.stat-card');
        let totalIncome = 0;
        let totalExpense = 0;

        statsCards.forEach(card => {
            const value = card.querySelector('.stat-value');
            if (value) {
                const amount = parseFloat(value.textContent.replace('€', '').replace(/\./g, '').replace(',', '.').trim());
                if (card.classList.contains('income-card')) {
                    totalIncome = amount;
                } else if (card.classList.contains('expense-card')) {
                    totalExpense = amount;
                }
            }
        });

        balanceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['💵 Entrate', '💸 Uscite'],
                datasets: [{
                    data: [totalIncome, totalExpense],
                    backgroundColor: ['#22c55e', '#ef4444'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#37352f',
                        titleFont: { size: 13 },
                        bodyFont: { size: 12 },
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return label + ': € ' + value.toLocaleString('it-IT', { minimumFractionDigits: 2 }) +
                                       ' (' + percentage + '%)';
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateRotate: true,
                    animateScale: false
                }
            }
        });
        console.log('✅ Grafico bilancio creato');

        // Aggiorna legenda personalizzata
        updateBalanceLegend(totalIncome, totalExpense);
    }

    // Grafico entrate per categoria
    const incomeCtx = document.getElementById('incomeChart');
    if (incomeCtx && !incomeChart) {
        const ctx = incomeCtx.getContext('2d');
        incomeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#37352f',
                        titleFont: { size: 13 },
                        bodyFont: { size: 12 },
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return label + ': € ' + value.toLocaleString('it-IT', { minimumFractionDigits: 2 }) + 
                                       ' (' + percentage + '%)';
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateRotate: true,
                    animateScale: false
                }
            }
        });
        console.log('✅ Grafico entrate creato');
    }
    
    // Grafico uscite per categoria
    const expenseCtx = document.getElementById('expenseChart');
    if (expenseCtx && !expenseChart) {
        const ctx = expenseCtx.getContext('2d');
        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#37352f',
                        titleFont: { size: 13 },
                        bodyFont: { size: 12 },
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return label + ': € ' + value.toLocaleString('it-IT', { minimumFractionDigits: 2 }) + 
                                       ' (' + percentage + '%)';
                            }
                        }
                    }
                },
                cutout: '60%',
                animation: {
                    animateRotate: true,
                    animateScale: false
                }
            }
        });
        console.log('✅ Grafico uscite creato');
    }
}

// Aggiorna grafici con nuovi dati
function updateCharts(data) {
    console.log('📈 Aggiornamento grafici con dati:', data);
    
    // Aggiorna grafico andamento
    if (trendChart && data.monthlyTrend) {
        const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        const labels = data.monthlyTrend.map(item => months[item.month - 1]);
        const incomeData = data.monthlyTrend.map(item => parseFloat(item.income));
        const expenseData = data.monthlyTrend.map(item => parseFloat(item.expense));
        
        trendChart.data.labels = labels;
        trendChart.data.datasets[0].data = incomeData;
        trendChart.data.datasets[1].data = expenseData;
        trendChart.update('none'); // Aggiorna senza animazione per evitare problemi
        console.log('✅ Grafico trend aggiornato');
    }
    
    // Aggiorna grafico entrate
    if (incomeChart && data.incomeByCategory && data.incomeByCategory.length > 0) {
        const labels = data.incomeByCategory.map(item => item.icon + ' ' + item.name);
        const values = data.incomeByCategory.map(item => parseFloat(item.total));
        const colors = data.incomeByCategory.map(item => item.color || '#22c55e');
        
        incomeChart.data.labels = labels;
        incomeChart.data.datasets[0].data = values;
        incomeChart.data.datasets[0].backgroundColor = colors;
        incomeChart.update('none');
        console.log('✅ Grafico entrate aggiornato');
        
        // Aggiorna legenda
        updateLegend('incomeLegend', data.incomeByCategory, 'income');
    }
    
    // Aggiorna grafico uscite
    if (expenseChart && data.expenseByCategory && data.expenseByCategory.length > 0) {
        const labels = data.expenseByCategory.map(item => item.icon + ' ' + item.name);
        const values = data.expenseByCategory.map(item => parseFloat(item.total));
        const colors = data.expenseByCategory.map(item => item.color || '#ef4444');
        
        expenseChart.data.labels = labels;
        expenseChart.data.datasets[0].data = values;
        expenseChart.data.datasets[0].backgroundColor = colors;
        expenseChart.update('none');
        console.log('✅ Grafico uscite aggiornato');
        
        // Aggiorna legenda
        updateLegend('expenseLegend', data.expenseByCategory, 'expense');
    }
}

// Aggiorna legenda personalizzata
function updateLegend(elementId, data, type) {
    const legendEl = document.getElementById(elementId);
    if (!legendEl) return;

    const total = data.reduce((sum, item) => sum + parseFloat(item.total), 0);

    if (total === 0) {
        legendEl.innerHTML = '<p style="color: #787774; text-align: center;">Nessun dato disponibile</p>';
        return;
    }

    legendEl.innerHTML = data.map(item => {
        const percentage = ((parseFloat(item.total) / total) * 100).toFixed(1);
        return `
            <div class="legend-item">
                <span class="color-box" style="background: ${item.color}"></span>
                <span>${item.icon} ${item.name}</span>
                <span style="margin-left: auto; font-weight: 600;">
                    € ${parseFloat(item.total).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
                <span style="color: #787774; font-size: 11px;">(${percentage}%)</span>
            </div>
        `;
    }).join('');
}

// Aggiorna legenda bilancio
function updateBalanceLegend(income, expense) {
    const legendEl = document.getElementById('balanceLegend');
    if (!legendEl) return;

    const total = income + expense;

    if (total === 0) {
        legendEl.innerHTML = '<p style="color: #787774; text-align: center;">Nessun dato disponibile</p>';
        return;
    }

    const incomePercentage = ((income / total) * 100).toFixed(1);
    const expensePercentage = ((expense / total) * 100).toFixed(1);

    legendEl.innerHTML = `
        <div class="legend-item">
            <span class="color-box" style="background: #22c55e"></span>
            <span>💵 Entrate</span>
            <span style="margin-left: auto; font-weight: 600;">
                € ${income.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
            <span style="color: #787774; font-size: 11px;">(${incomePercentage}%)</span>
        </div>
        <div class="legend-item">
            <span class="color-box" style="background: #ef4444"></span>
            <span>💸 Uscite</span>
            <span style="margin-left: auto; font-weight: 600;">
                € ${expense.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
            <span style="color: #787774; font-size: 11px;">(${expensePercentage}%)</span>
        </div>
    `;
}

// Filtro periodo
function updatePeriodFilter() {
    const year = document.getElementById('yearFilter').value;
    const month = document.getElementById('monthFilter').value;
    
    window.location.href = `?year=${year}&month=${month}`;
}

// Modal Transazione
function openTransactionModal(type = 'income') {
    currentTransactionType = type;
    editingTransactionId = null;
    
    const modal = document.getElementById('transactionModal');
    const form = document.getElementById('transactionForm');
    const title = document.getElementById('transactionModalTitle');
    
    // Reset form
    form.reset();
    document.getElementById('transactionId').value = '';
    document.getElementById('transactionType').value = type;
    
    // Aggiorna UI
    title.textContent = type === 'income' ? 'Nuova Entrata' : 'Nuova Uscita';
    updateTransactionTypeUI(type);
    loadCategoriesForType(type);
    
    // Mostra modal
    modal.classList.add('show');
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('show');
}

function setTransactionType(type) {
    currentTransactionType = type;
    document.getElementById('transactionType').value = type;
    updateTransactionTypeUI(type);
    loadCategoriesForType(type);
}

function updateTransactionTypeUI(type) {
    // Aggiorna bottoni tipo
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.type-btn.${type}`).classList.add('active');
    
    // Aggiorna label
    const sourceLabel = document.getElementById('sourceLabel');
    sourceLabel.textContent = type === 'income' ? 'Cliente' : 'Fornitore';
}

function loadCategoriesForType(type) {
    const select = document.getElementById('categorySelect');
    select.innerHTML = '<option value="">Seleziona categoria...</option>';
    
    if (typeof categories === 'undefined') {
        console.error('Categorie non caricate');
        return;
    }
    
    const filteredCategories = categories.filter(cat => cat.type === type);
    filteredCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.icon} ${cat.name}`;
        select.appendChild(option);
    });
}

// Gestione submit transazione
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/modules/finance_tracker/ajax/save_transaction.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Transazione salvata con successo', 'success');
            closeTransactionModal();
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(result.message || 'Errore nel salvataggio', 'error');
        }
    } catch (error) {
        console.error('Errore:', error);
        showToast('Errore di connessione', 'error');
    }
}

// Modifica transazione
async function editTransaction(id) {
    try {
        const response = await fetch(`/modules/finance_tracker/ajax/get_transaction.php?id=${id}`);
        const result = await response.json();
        
        if (result.success) {
            const transaction = result.data;
            editingTransactionId = id;
            
            // Popola il form
            document.getElementById('transactionId').value = id;
            document.getElementById('transactionType').value = transaction.type;
            document.querySelector('input[name="date"]').value = transaction.date;
            document.querySelector('input[name="amount"]').value = transaction.amount;
            document.querySelector('input[name="description"]').value = transaction.description;
            document.querySelector('input[name="source"]').value = transaction.source || '';
            document.querySelector('textarea[name="notes"]').value = transaction.notes || '';
            document.querySelector('select[name="payment_method_id"]').value = transaction.payment_method_id || '';
            
            // Imposta tipo e categorie
            setTransactionType(transaction.type);
            setTimeout(() => {
                document.querySelector('select[name="category_id"]').value = transaction.category_id;
            }, 100);
            
            // Mostra modal
            document.getElementById('transactionModalTitle').textContent = 'Modifica Transazione';
            document.getElementById('transactionModal').classList.add('show');
        }
    } catch (error) {
        console.error('Errore:', error);
        showToast('Errore nel caricamento', 'error');
    }
}

// Elimina transazione
async function deleteTransaction(id) {
    if (!confirm('Sei sicuro di voler eliminare questa transazione?')) {
        return;
    }
    
    try {
        const response = await fetch('/modules/finance_tracker/ajax/delete_transaction.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Transazione eliminata', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(result.message || 'Errore nella cancellazione', 'error');
        }
    } catch (error) {
        console.error('Errore:', error);
        showToast('Errore di connessione', 'error');
    }
}

// Modal Categorie
function openCategoriesModal() {
    loadCategories();
    document.getElementById('categoriesModal').classList.add('show');
}

function closeCategoriesModal() {
    document.getElementById('categoriesModal').classList.remove('show');
}

async function loadCategories() {
    try {
        const response = await fetch('/modules/finance_tracker/ajax/get_categories.php');
        const result = await response.json();
        
        if (result.success) {
            const listEl = document.getElementById('categoriesList');
            const groupedCategories = {
                income: result.data.filter(c => c.type === 'income'),
                expense: result.data.filter(c => c.type === 'expense')
            };
            
            listEl.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <h5 style="color: #16a34a; margin-bottom: 12px;">💵 Categorie Entrate</h5>
                    ${groupedCategories.income.map(cat => renderCategoryItem(cat)).join('')}
                </div>
                <div>
                    <h5 style="color: #dc2626; margin-bottom: 12px;">💸 Categorie Uscite</h5>
                    ${groupedCategories.expense.map(cat => renderCategoryItem(cat)).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Errore:', error);
    }
}

function renderCategoryItem(category) {
    return `
        <div class="category-item">
            <div class="category-info">
                <span style="font-size: 20px;">${category.icon}</span>
                <span style="font-weight: 500;">${category.name}</span>
                <span class="category-type ${category.type}">${category.type}</span>
                <div style="width: 20px; height: 20px; background: ${category.color}; border-radius: 4px;"></div>
            </div>
            <button class="btn-icon" onclick="deleteCategory(${category.id})" title="Elimina">
                🗑️
            </button>
        </div>
    `;
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/modules/finance_tracker/ajax/save_category.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Categoria aggiunta', 'success');
            e.target.reset();
            loadCategories();
            
            // Ricarica categorie globali
            const catResponse = await fetch('/modules/finance_tracker/ajax/get_categories.php');
            const catResult = await catResponse.json();
            if (catResult.success) {
                categories = catResult.data;
            }
        } else {
            showToast(result.message || 'Errore', 'error');
        }
    } catch (error) {
        console.error('Errore:', error);
        showToast('Errore di connessione', 'error');
    }
}

async function deleteCategory(id) {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) {
        return;
    }
    
    try {
        const response = await fetch('/modules/finance_tracker/ajax/delete_category.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Categoria eliminata', 'success');
            loadCategories();
        } else {
            showToast(result.message || 'Errore', 'error');
        }
    } catch (error) {
        console.error('Errore:', error);
        showToast('Errore di connessione', 'error');
    }
}

// Export dati
async function exportFinanceData() {
    const year = document.getElementById('yearFilter').value;
    const month = document.getElementById('monthFilter').value;
    
    window.location.href = `/modules/finance_tracker/ajax/export_data.php?year=${year}&month=${month}&format=excel`;
}

// Visualizza tutte le transazioni
function viewAllTransactions() {
    const year = document.getElementById('yearFilter').value;
    const month = document.getElementById('monthFilter').value;
    
    window.location.href = `/modules/finance_tracker/transactions.php?year=${year}&month=${month}`;
}

// Toast notification
function showToast(message, type = 'info') {
    // Se hai già un sistema toast, usalo
    if (typeof Toast !== 'undefined' && Toast.show) {
        Toast.show(message, type);
        return;
    }
    
    // Altrimenti usa un alert semplice
    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;
    toastEl.textContent = message;
    toastEl.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#37352f'};
        color: white;
        border-radius: 6px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toastEl);
    
    setTimeout(() => {
        toastEl.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toastEl.remove(), 300);
    }, 3000);
}

// Animazioni CSS
if (!document.getElementById('finance-animations-style')) {
    const style = document.createElement('style');
    style.id = 'finance-animations-style';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Gestione resize window per grafici
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
        if (trendChart) trendChart.resize();
        if (balanceChart) balanceChart.resize();
        if (incomeChart) incomeChart.resize();
        if (expenseChart) expenseChart.resize();
    }, 250);
});
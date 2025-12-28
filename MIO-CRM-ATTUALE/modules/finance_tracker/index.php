<?php
// File: /modules/finance_tracker/index.php
// Finance Tracker con integrazione fatture - Stile Notion

// IMPORTANTE: Carica financial_pin_guard PRIMA di auth_helper per gestire AJAX
require_once __DIR__ . '/../../core/includes/financial_pin_guard.php';

// Gestisci richieste AJAX PIN PRIMA di auth_helper (che potrebbe fare redirect)
handleFinancialPinAjax();

// Ora carica auth_helper
require_once __DIR__ . '/../../core/includes/auth_helper.php';

// Verifica autenticazione
$currentUser = getCurrentUser();

// Sostituisci requireAuth() con:
requireModulePermission('finance_tracker', 'read');

// ⭐ PROTEZIONE PIN - Verifica se serve il PIN
$needsPin = requireFinancialPin();

// Per controlli granulari:
$canWrite = hasPermission('finance_tracker', 'write');
$canDelete = hasPermission('finance_tracker', 'delete');

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

// Se serve il PIN, non caricare i dati
if (!$needsPin) {
    // Parametri filtro
    $year = $_GET['year'] ?? date('Y');
    $month = $_GET['month'] ?? 'all';

    // Ottieni statistiche
    $stats = getFinanceStats($pdo, $year, $month);
    $categories = getCategories($pdo);
    $paymentMethods = getPaymentMethods($pdo);
    $recentTransactions = getRecentTransactions($pdo, $year, $month, 10);
    $chartData = getChartData($pdo, $year, $month);
}

// Funzioni helper
function getFinanceStats($pdo, $year, $month) {
    $whereDate = "YEAR(date) = :year";
    $params = ['year' => $year];
    
    if ($month !== 'all') {
        $whereDate .= " AND MONTH(date) = :month";
        $params['month'] = $month;
    }
    
    $sql = "
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
            SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_profit,
            COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
            COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
        FROM finance_transactions
        WHERE $whereDate
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $stats = $stmt->fetch();
    
    // Calcola percentuali per il mese corrente vs precedente
    if ($month !== 'all') {
        $prevMonth = $month - 1;
        $prevYear = $year;
        if ($prevMonth < 1) {
            $prevMonth = 12;
            $prevYear--;
        }
        
        $prevSql = "
            SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as prev_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as prev_expense
            FROM finance_transactions
            WHERE YEAR(date) = :year AND MONTH(date) = :month
        ";
        
        $prevStmt = $pdo->prepare($prevSql);
        $prevStmt->execute(['year' => $prevYear, 'month' => $prevMonth]);
        $prevStats = $prevStmt->fetch();
        
        $stats['income_change'] = $prevStats['prev_income'] > 0 
            ? round((($stats['total_income'] - $prevStats['prev_income']) / $prevStats['prev_income']) * 100, 1)
            : 0;
        $stats['expense_change'] = $prevStats['prev_expense'] > 0
            ? round((($stats['total_expense'] - $prevStats['prev_expense']) / $prevStats['prev_expense']) * 100, 1)
            : 0;
    }
    
    return $stats;
}

function getCategories($pdo) {
    $stmt = $pdo->query("
        SELECT * FROM finance_categories 
        WHERE is_active = 1 
        ORDER BY type, name
    ");
    return $stmt->fetchAll();
}

function getPaymentMethods($pdo) {
    $stmt = $pdo->query("
        SELECT * FROM finance_payment_methods 
        WHERE is_active = 1 
        ORDER BY name
    ");
    return $stmt->fetchAll();
}

function getRecentTransactions($pdo, $year, $month, $limit = 10) {
    $whereDate = "YEAR(t.date) = :year";
    $params = ['year' => $year];
    
    if ($month !== 'all') {
        $whereDate .= " AND MONTH(t.date) = :month";
        $params['month'] = $month;
    }
    
    $sql = "
        SELECT 
            t.*,
            c.name as category_name,
            c.color as category_color,
            c.icon as category_icon,
            pm.name as payment_method,
            pm.icon as payment_icon,
            f.numero_fattura,
            u.first_name,
            u.last_name
        FROM finance_transactions t
        LEFT JOIN finance_categories c ON t.category_id = c.id
        LEFT JOIN finance_payment_methods pm ON t.payment_method_id = pm.id
        LEFT JOIN fatture f ON t.invoice_id = f.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE $whereDate
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT $limit
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function getChartData($pdo, $year, $month) {
    $whereDate = "YEAR(date) = :year";
    $params = ['year' => $year];
    
    if ($month !== 'all') {
        $whereDate .= " AND MONTH(date) = :month";
        $params['month'] = $month;
    }
    
    // Dati per grafici a torta
    $sql = "
        SELECT 
            c.name,
            c.color,
            c.icon,
            c.type,
            SUM(t.amount) as total
        FROM finance_transactions t
        JOIN finance_categories c ON t.category_id = c.id
        WHERE $whereDate
        GROUP BY c.id, c.type
        ORDER BY total DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $byCategory = $stmt->fetchAll();
    
    $incomeCategories = array_filter($byCategory, fn($c) => $c['type'] === 'income');
    $expenseCategories = array_filter($byCategory, fn($c) => $c['type'] === 'expense');
    
    // Dati per grafico andamento mensile
    $trendSql = "
        SELECT 
            MONTH(date) as month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM finance_transactions
        WHERE YEAR(date) = :year
        GROUP BY MONTH(date)
        ORDER BY month
    ";
    
    $trendStmt = $pdo->prepare($trendSql);
    $trendStmt->execute(['year' => $year]);
    $monthlyTrend = $trendStmt->fetchAll();
    
    return [
        'incomeByCategory' => array_values($incomeCategories),
        'expenseByCategory' => array_values($expenseCategories),
        'monthlyTrend' => $monthlyTrend
    ];
}

// Genera il contenuto della pagina
ob_start();

// Se serve il PIN, mostra solo il modal PIN
if ($needsPin) {
    renderFinancialPinModal();
} else {
?>

<div class="finance-tracker-container">
    <!-- Header -->
    <div class="finance-header">
        <div class="finance-title-section">
            <h1>Finance Tracker</h1>
            <p>Aggiornato Novembre 2025</p>
        </div>
        
        <div class="finance-controls">
            <!-- Filtri Periodo -->
            <div class="period-selector">
                <select id="yearFilter" onchange="updatePeriodFilter()">
                    <?php for($y = date('Y'); $y >= date('Y') - 3; $y--): ?>
                        <option value="<?= $y ?>" <?= $y == $year ? 'selected' : '' ?>><?= $y ?></option>
                    <?php endfor; ?>
                </select>
                
                <select id="monthFilter" onchange="updatePeriodFilter()">
                    <option value="all" <?= $month === 'all' ? 'selected' : '' ?>>Anno intero</option>
                    <?php 
                    $months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                               'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
                    foreach($months as $i => $m): 
                    ?>
                        <option value="<?= $i+1 ?>" <?= $month == $i+1 ? 'selected' : '' ?>><?= $m ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <!-- Azioni -->
            <div class="finance-actions">
                <?= getFinancialLockButton() ?>
                <button class="btn-outline" onclick="exportFinanceData()">
                    📊 Esporta
                </button>
                <button class="btn-outline" onclick="openCategoriesModal()">
                    🏷️ Categorie
                </button>
                <button class="btn-primary" onclick="openTransactionModal('income')">
                    + Nuova Entrata
                </button>
                <button class="btn-danger" onclick="openTransactionModal('expense')">
                    - Nuova Uscita
                </button>
            </div>
        </div>
    </div>
    
    <!-- Cards Statistiche -->
    <div class="finance-stats-cards">
        <div class="stat-card income-card">
            <div class="stat-icon">💵</div>
            <div class="stat-content">
                <div class="stat-label">Entrate</div>
                <div class="stat-value">€ <?= number_format($stats['total_income'] ?? 0, 2, ',', '.') ?></div>
                <?php if(isset($stats['income_change'])): ?>
                <div class="stat-change <?= $stats['income_change'] >= 0 ? 'positive' : 'negative' ?>">
                    <?= $stats['income_change'] >= 0 ? '↑' : '↓' ?> <?= abs($stats['income_change']) ?>%
                </div>
                <?php endif; ?>
            </div>
        </div>
        
        <div class="stat-card expense-card">
            <div class="stat-icon">💸</div>
            <div class="stat-content">
                <div class="stat-label">Uscite</div>
                <div class="stat-value">€ <?= number_format($stats['total_expense'] ?? 0, 2, ',', '.') ?></div>
                <?php if(isset($stats['expense_change'])): ?>
                <div class="stat-change <?= $stats['expense_change'] <= 0 ? 'positive' : 'negative' ?>">
                    <?= $stats['expense_change'] >= 0 ? '↑' : '↓' ?> <?= abs($stats['expense_change']) ?>%
                </div>
                <?php endif; ?>
            </div>
        </div>
        
        <div class="stat-card profit-card">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
                <div class="stat-label">Cashflow</div>
                <div class="stat-value <?= ($stats['net_profit'] ?? 0) >= 0 ? 'text-green' : 'text-red' ?>">
                    € <?= number_format($stats['net_profit'] ?? 0, 2, ',', '.') ?>
                </div>
                <div class="stat-subtitle">
                    <?= $stats['income_count'] ?? 0 ?> entrate | <?= $stats['expense_count'] ?? 0 ?> uscite
                </div>
            </div>
        </div>
    </div>
    
    <!-- Area Grafici -->
    <div class="finance-charts-section">
        <!-- Grafico Andamento -->
        <div class="chart-container full-width">
            <div class="chart-header">
                <h3>📊 Andamento Mensile</h3>
                <div class="chart-legend">
                    <span class="legend-item income">● Entrate</span>
                    <span class="legend-item expense">● Uscite</span>
                </div>
            </div>
            <div style="position: relative; height: 300px;">
                <canvas id="trendChart"></canvas>
            </div>
        </div>

        <!-- Grafici a Torta -->
        <div class="charts-row">

        <div class="chart-container">
                <div class="chart-header">
                    <h3>⚖️ Bilancio Totale</h3>
                    <?php
                    $totalIncome = $stats['total_income'] ?? 0;
                    $totalExpense = $stats['total_expense'] ?? 0;
                    $balance = $totalIncome - $totalExpense;
                    $balanceClass = $balance > 0 ? 'positive' : ($balance < 0 ? 'negative' : 'neutral');
                    ?>
                    <span class="balance-indicator <?= $balanceClass ?>">
                        <?php if($balance > 0): ?>
                            ✓ € <?= number_format($balance, 2, ',', '.') ?>
                        <?php elseif($balance < 0): ?>
                            ✗ € <?= number_format(abs($balance), 2, ',', '.') ?>
                        <?php else: ?>
                            = € 0,00
                        <?php endif; ?>
                    </span>
                </div>
                <div style="position: relative; height: 250px;">
                    <canvas id="balanceChart"></canvas>
                </div>
                <div id="balanceLegend" class="chart-legend-vertical"></div>
            </div>
            <div class="chart-container">
                <div class="chart-header">
                    <h3>💵 Entrate per Categoria</h3>
                </div>
                <div style="position: relative; height: 250px;">
                    <canvas id="incomeChart"></canvas>
                </div>
                <div id="incomeLegend" class="chart-legend-vertical"></div>
            </div>

            

            <div class="chart-container">
                <div class="chart-header">
                    <h3>💸 Uscite per Categoria</h3>
                </div>
                <div style="position: relative; height: 250px;">
                    <canvas id="expenseChart"></canvas>
                </div>
                <div id="expenseLegend" class="chart-legend-vertical"></div>
            </div>
        </div>
    </div>
    
    <!-- Tabella Transazioni Recenti -->
    <div class="transactions-section">
        <div class="section-header">
            <h3>📝 Transazioni Recenti</h3>
            <button class="btn-text" onclick="viewAllTransactions()">Vedi tutte →</button>
        </div>
        
        <div class="transactions-table">
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Descrizione</th>
                        <th>Categoria</th>
                        <th>Fonte/Fornitore</th>
                        <th>Metodo</th>
                        <th class="text-right">Importo</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach($recentTransactions as $t): ?>
                    <tr class="transaction-row" data-id="<?= $t['id'] ?>">
                        <td><?= date('d/m/Y', strtotime($t['date'])) ?></td>
                        <td>
                            <span class="type-badge <?= $t['type'] ?>">
                                <?= $t['type'] === 'income' ? '↓ Entrata' : '↑ Uscita' ?>
                            </span>
                        </td>
                        <td class="description-cell">
                            <?= htmlspecialchars($t['description']) ?>
                            <?php if($t['numero_fattura']): ?>
                                <span class="invoice-ref">📄 <?= $t['numero_fattura'] ?></span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <span class="category-badge" style="background: <?= $t['category_color'] ?>20; color: <?= $t['category_color'] ?>">
                                <?= $t['category_icon'] ?> <?= htmlspecialchars($t['category_name']) ?>
                            </span>
                        </td>
                        <td><?= htmlspecialchars($t['source'] ?? '-') ?></td>
                        <td>
                            <?php if($t['payment_method']): ?>
                                <span class="payment-method">
                                    <?= $t['payment_icon'] ?> <?= htmlspecialchars($t['payment_method']) ?>
                                </span>
                            <?php else: ?>
                                -
                            <?php endif; ?>
                        </td>
                        <td class="text-right amount-cell <?= $t['type'] ?>">
                            <?= $t['type'] === 'income' ? '+' : '-' ?>€ <?= number_format($t['amount'], 2, ',', '.') ?>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <?php if(!$t['invoice_id']): ?>
                                    <button class="btn-icon" onclick="editTransaction(<?= $t['id'] ?>)" title="Modifica">
                                        ✏️
                                    </button>
                                <?php endif; ?>
                                <button class="btn-icon" onclick="deleteTransaction(<?= $t['id'] ?>)" title="Elimina">
                                    🗑️
                                </button>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    
                    <?php if(empty($recentTransactions)): ?>
                    <tr>
                        <td colspan="8" class="empty-state">
                            <div class="empty-icon">📊</div>
                            <p>Nessuna transazione trovata per il periodo selezionato</p>
                            <button class="btn-primary" onclick="openTransactionModal('income')">
                                Aggiungi prima transazione
                            </button>
                        </td>
                    </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal Transazione -->
<div id="transactionModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="transactionModalTitle">Nuova Transazione</h3>
            <button class="modal-close" onclick="closeTransactionModal()">&times;</button>
        </div>
        
        <form id="transactionForm">
            <div class="modal-body">
                <input type="hidden" id="transactionId" name="id">
                <input type="hidden" id="transactionType" name="type">
                
                <!-- Tipo Transazione -->
                <div class="transaction-type-selector">
                    <button type="button" class="type-btn income" onclick="setTransactionType('income')">
                        💵 Entrata
                    </button>
                    <button type="button" class="type-btn expense" onclick="setTransactionType('expense')">
                        💸 Uscita
                    </button>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Data *</label>
                        <input type="date" name="date" required value="<?= date('Y-m-d') ?>">
                    </div>
                    
                    <div class="form-group">
                        <label>Importo (€) *</label>
                        <input type="number" name="amount" step="0.01" min="0" required placeholder="0,00">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoria *</label>
                        <select name="category_id" required id="categorySelect">
                            <option value="">Seleziona categoria...</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Metodo di Pagamento</label>
                        <select name="payment_method_id">
                            <option value="">Seleziona metodo...</option>
                            <?php foreach($paymentMethods as $pm): ?>
                                <option value="<?= $pm['id'] ?>"><?= $pm['icon'] ?> <?= htmlspecialchars($pm['name']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Descrizione *</label>
                    <input type="text" name="description" required placeholder="Es: Pagamento fattura #012025">
                </div>
                
                <div class="form-group">
                    <label><span id="sourceLabel">Cliente</span></label>
                    <input type="text" name="source" placeholder="Es: Tecnorete Villafranca">
                </div>
                
                <div class="form-group">
                    <label>Note</label>
                    <textarea name="notes" rows="3" placeholder="Note aggiuntive..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" name="is_recurring">
                        <span>Transazione ricorrente</span>
                    </label>
                    <select name="recurring_interval" style="display:none;">
                        <option value="monthly">Mensile</option>
                        <option value="quarterly">Trimestrale</option>
                        <option value="yearly">Annuale</option>
                    </select>
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeTransactionModal()">Annulla</button>
                <button type="submit" class="btn-primary">Salva Transazione</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal Categorie -->
<div id="categoriesModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>🏷️ Gestione Categorie</h3>
            <button class="modal-close" onclick="closeCategoriesModal()">&times;</button>
        </div>
        
        <div class="modal-body">
            <div class="category-form">
                <h4>Nuova Categoria</h4>
                <form id="categoryForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nome *</label>
                            <input type="text" name="name" required placeholder="Es: Consulenze">
                        </div>
                        
                        <div class="form-group">
                            <label>Tipo *</label>
                            <select name="type" required>
                                <option value="income">Entrata</option>
                                <option value="expense">Uscita</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Colore</label>
                            <input type="color" name="color" value="#37352f">
                        </div>
                        
                        <div class="form-group">
                            <label>Icona</label>
                            <input type="text" name="icon" placeholder="📁" maxlength="5">
                        </div>
                    </div>
                    
                    <button type="submit" class="btn-primary">Aggiungi Categoria</button>
                </form>
            </div>
            
            <div class="categories-list">
                <h4>Categorie Esistenti</h4>
                <div id="categoriesList"></div>
            </div>
        </div>
    </div>
</div>

<script>
// Dati per i grafici
const chartData = <?= json_encode($chartData ?? []) ?>;
const categories = <?= json_encode($categories ?? []) ?>;
const currentYear = <?= $year ?? date('Y') ?>;
const currentMonth = '<?= $month ?? 'all' ?>';
</script>

<?php
} // Fine else - chiusura contenuto normale
$pageContent = ob_get_clean();

// Definisci CSS e JS necessari
$additionalCSS = [
    '/modules/finance_tracker/assets/css/finance.css'
];

$additionalJS = [
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
    '/modules/finance_tracker/assets/js/finance.js',
    '/assets/js/toast.js',
    '/assets/js/notifications.js'
];

// Rendering della pagina
renderPage('Finance Tracker', $pageContent, $additionalCSS, $additionalJS);
?>
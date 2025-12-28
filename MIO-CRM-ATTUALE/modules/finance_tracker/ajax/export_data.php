<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/core/includes/auth_helper.php';

if (!requireAuth()) {
    header('Location: /index.php');
    exit;
}

try {
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $year = intval($_GET['year'] ?? date('Y'));
    $month = $_GET['month'] ?? 'all';
    $format = $_GET['format'] ?? 'csv';
    
    $whereDate = "YEAR(t.date) = :year";
    $params = ['year' => $year];
    
    if ($month !== 'all') {
        $whereDate .= " AND MONTH(t.date) = :month";
        $params['month'] = intval($month);
    }
    
    $sql = "
        SELECT 
            t.date as Data,
            CASE t.type 
                WHEN 'income' THEN 'Entrata'
                WHEN 'expense' THEN 'Uscita'
            END as Tipo,
            c.name as Categoria,
            t.description as Descrizione,
            t.source as 'Fonte/Fornitore',
            pm.name as 'Metodo Pagamento',
            t.amount as Importo,
            t.notes as Note,
            CONCAT(u.first_name, ' ', u.last_name) as 'Inserito da',
            t.created_at as 'Data inserimento'
        FROM finance_transactions t
        LEFT JOIN finance_categories c ON t.category_id = c.id
        LEFT JOIN finance_payment_methods pm ON t.payment_method_id = pm.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE $whereDate
        ORDER BY t.date DESC, t.created_at DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();
    
    $filename = "finance_export_{$year}";
    if ($month !== 'all') {
        $filename .= "_month_{$month}";
    }
    $filename .= ".csv";
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // BOM per Excel UTF-8
    echo "\xEF\xBB\xBF";
    
    $output = fopen('php://output', 'w');
    
    // Header
    if (!empty($data)) {
        fputcsv($output, array_keys($data[0]), ';');
    }
    
    // Dati
    foreach ($data as $row) {
        // Formatta importo per Excel italiano
        $row['Importo'] = str_replace('.', ',', $row['Importo']);
        fputcsv($output, $row, ';');
    }
    
    // Aggiungi totali
    if (!empty($data)) {
        $totals = [
            '', '', '', 'TOTALI', '', '',
            str_replace('.', ',', array_sum(array_column($data, 'Importo'))),
            '', '', ''
        ];
        fputcsv($output, $totals, ';');
    }
    
    fclose($output);
    exit;
    
} catch (Exception $e) {
    die('Errore export: ' . $e->getMessage());
}
?>
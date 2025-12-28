<?php
// File: /modules/agenda/ajax/test_ajax.php
// Test per verificare che gli AJAX funzionino

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(0);

echo json_encode([
    'success' => true,
    'message' => 'AJAX funziona correttamente!',
    'timestamp' => date('Y-m-d H:i:s'),
    'test' => 'OK'
]);
?>
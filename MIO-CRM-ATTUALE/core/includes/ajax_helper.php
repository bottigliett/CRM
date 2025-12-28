<?php
// File: /core/includes/ajax_helper.php
// Funzioni helper per richieste AJAX

/**
 * Verifica se la richiesta è AJAX
 * @return bool
 */
function isAjaxRequest() {
    return isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

/**
 * Invia risposta JSON e termina l'esecuzione
 * @param bool $success
 * @param mixed $data
 * @param string $message
 * @param int $httpCode
 */
function jsonResponse($success, $data = null, $message = '', $httpCode = 200) {
    http_response_code($httpCode);
    header('Content-Type: application/json');
    
    $response = ['success' => $success];
    
    if ($message) {
        $response['message'] = $message;
    }
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit;
}

/**
 * Valida input JSON
 * @return array|null
 */
function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(false, null, 'Invalid JSON input', 400);
    }
    
    return $data;
}

/**
 * Sanitizza input per prevenire XSS
 * @param mixed $input
 * @return mixed
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Valida ID numerico
 * @param mixed $id
 * @return int|false
 */
function validateId($id) {
    if (!is_numeric($id) || $id <= 0) {
        return false;
    }
    return (int)$id;
}

// Se auth_helper.php non ha già la funzione isAjaxRequest, puoi includerla qui
// o includere questo file in auth_helper.php
?>
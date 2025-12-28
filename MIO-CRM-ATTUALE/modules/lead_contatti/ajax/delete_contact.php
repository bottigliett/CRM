<?php
// File: /modules/lead_contatti/ajax/delete_contact.php
// Versione SEMPLIFICATA seguendo il pattern funzionante

require_once __DIR__ . '/../../../core/includes/auth_helper.php';
header('Content-Type: application/json; charset=utf-8');

try {
    // Verifica autenticazione
    $currentUser = getCurrentUser();
    if (!$currentUser) {
        throw new Exception('Utente non autenticato');
    }
    
    // Verifica metodo POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Metodo non permesso');
    }
    
    // Verifica CSRF token
    if (!validateCSRFToken($_POST['csrf_token'] ?? '')) {
        throw new Exception('Token di sicurezza non valido');
    }
    
    // Validazione parametri
    $contactId = $_POST['contact_id'] ?? null;
    if (!$contactId || !is_numeric($contactId)) {
        throw new Exception('ID contatto non valido');
    }
    
    $contactId = (int)$contactId;
    
    // Connessione database
    $dsn = "mysql:host=127.0.0.1;dbname=u706045794_crm_mismo;charset=utf8mb4";
    $pdo = new PDO($dsn, 'u706045794_mismo_crm_new', 'BLQ$>:;*9+h', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Verifica che il contatto esista
    $stmt = $pdo->prepare("SELECT name, email, contact_type FROM leads_contacts WHERE id = ?");
    $stmt->execute([$contactId]);
    $contact = $stmt->fetch();
    
    if (!$contact) {
        throw new Exception('Contatto non trovato');
    }
    
    // Inizio transazione
    $pdo->beginTransaction();
    
    $contactName = $contact['name'];
    
    // Elimina in ordine (foreign keys cascade automaticamente se configurate)
    $pdo->prepare("DELETE FROM leads_contacts_tags WHERE contact_id = ?")->execute([$contactId]);
    $pdo->prepare("DELETE FROM leads_contacts_socials WHERE contact_id = ?")->execute([$contactId]);
    $pdo->prepare("DELETE FROM leads_activity_logs WHERE contact_id = ?")->execute([$contactId]);
    
    // Elimina il contatto principale
    $stmt = $pdo->prepare("DELETE FROM leads_contacts WHERE id = ?");
    $stmt->execute([$contactId]);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception('Impossibile eliminare il contatto');
    }
    
    // Log eliminazione
    try {
        $stmt = $pdo->prepare("
            INSERT INTO leads_activity_logs (contact_id, user_id, action, details, created_at)
            VALUES (NULL, ?, 'deleted_contact', ?, NOW())
        ");
        
        $deleteDetails = "Eliminato contatto: '$contactName' (ID: $contactId)";
        $stmt->execute([$currentUser['id'], $deleteDetails]);
        
    } catch (Exception $e) {
        // Non bloccare per errori di log
    }
    
    // Commit
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => "Contatto '$contactName' eliminato con successo",
        'contact_id' => $contactId
    ]);
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log("Error in delete_contact.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
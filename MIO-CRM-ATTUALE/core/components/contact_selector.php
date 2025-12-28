<?php
// File: /core/components/contact_selector.php
// Componente riutilizzabile per selezionare contatti dall'anagrafica

/**
 * Genera il componente selettore contatti
 * 
 * @param string $fieldId ID del campo (es: 'taskClient', 'eventClient')
 * @param string $fieldName Nome del campo form (es: 'client_id') 
 * @param string $label Etichetta del campo (es: 'Cliente/Progetto')
 * @param int|null $selectedId ID del contatto preselezionato
 * @param bool $required Se il campo è obbligatorio
 * @param string $placeholder Placeholder per l'input
 * @return string HTML del componente
 */
function renderContactSelector($fieldId, $fieldName, $label, $selectedId = null, $required = false, $placeholder = "Cerca contatto...") {
    ob_start();
    ?>
    <div class="contact-selector-wrapper" data-field-id="<?= $fieldId ?>">
        <label for="<?= $fieldId ?>" class="form-label">
            <?= htmlspecialchars($label) ?>
            <?= $required ? ' *' : '' ?>
        </label>
        
        <div class="contact-selector-container">
            <!-- Campo nascosto per ID -->
            <input type="hidden" id="<?= $fieldId ?>_id" name="<?= $fieldName ?>" 
                   value="<?= $selectedId ?? '' ?>" <?= $required ? 'required' : '' ?>>
            
            <!-- Input ricerca visibile -->
            <div class="contact-search-input-group">
                <input type="text" 
                       id="<?= $fieldId ?>_search" 
                       class="contact-search-input form-input"
                       placeholder="<?= htmlspecialchars($placeholder) ?>"
                       autocomplete="off"
                       data-target-id="<?= $fieldId ?>">
                       
                <button type="button" 
                        class="contact-list-btn" 
                        onclick="ContactSelector.openContactList('<?= $fieldId ?>')"
                        title="Sfoglia tutti i contatti">
                    📋
                </button>
                
                <button type="button" 
                        class="contact-clear-btn" 
                        onclick="ContactSelector.clearSelection('<?= $fieldId ?>')"
                        title="Rimuovi selezione"
                        style="display: none;">
                    ✕
                </button>
            </div>
            
            <!-- Container suggerimenti -->
            <div id="<?= $fieldId ?>_suggestions" class="contact-suggestions" style="display: none;">
                <!-- Suggerimenti dinamici -->
            </div>
            
            <!-- Contatto selezionato -->
            <div id="<?= $fieldId ?>_selected" class="contact-selected" style="display: none;">
                <!-- Info contatto selezionato -->
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Ottiene tutti i contatti dall'anagrafica (non lead)
 * @param PDO $pdo Connessione database
 * @return array Lista contatti
 */
function getContactsForSelector($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 
                id,
                name,
                email,
                phone,
                contact_type,
                status,
                partita_iva,
                codice_fiscale,
                address
            FROM leads_contacts 
            WHERE status != 'lead'
            ORDER BY 
                CASE status 
                    WHEN 'client' THEN 1 
                    WHEN 'prospect' THEN 2 
                    WHEN 'collaborazioni' THEN 3
                    WHEN 'contatto_utile' THEN 4
                    ELSE 5 
                END,
                name ASC
        ");
        return $stmt->fetchAll();
    } catch (Exception $e) {
        error_log("Errore caricamento contatti per selector: " . $e->getMessage());
        return [];
    }
}
?>
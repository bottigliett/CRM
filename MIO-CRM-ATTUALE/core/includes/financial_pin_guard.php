<?php
// File: /core/includes/financial_pin_guard.php
// Sistema di protezione PIN per moduli finanziari

/**
 * Verifica se il PIN finanziario è sbloccato nella sessione
 * @return bool
 */
function isFinancialPinUnlocked() {
    // Assicurati che la sessione sia avviata
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $isUnlocked = isset($_SESSION['financial_pin_unlocked']) && $_SESSION['financial_pin_unlocked'] === true;

    // Log per debug
    error_log("isFinancialPinUnlocked check - Session ID: " . session_id() . ", Unlocked: " . var_export($isUnlocked, true));

    return $isUnlocked;
}

/**
 * Sblocca il PIN finanziario nella sessione
 */
function unlockFinancialPin() {
    $_SESSION['financial_pin_unlocked'] = true;
}

/**
 * Blocca il PIN finanziario nella sessione
 */
function lockFinancialPin() {
    unset($_SESSION['financial_pin_unlocked']);
}

/**
 * Verifica il PIN inserito dall'utente
 * @param string $inputPin
 * @return bool
 */
function verifyFinancialPin($inputPin) {
    $correctPin = '1258';
    return $inputPin === $correctPin;
}

/**
 * Gestisce le richieste AJAX per il PIN
 * Deve essere chiamato all'inizio del file prima di qualsiasi output
 */
function handleFinancialPinAjax() {
    // Assicurati che la sessione sia avviata
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (isset($_POST['action']) && $_POST['action'] === 'verify_financial_pin') {
        header('Content-Type: application/json');
        $inputPin = $_POST['pin'] ?? '';

        if (verifyFinancialPin($inputPin)) {
            unlockFinancialPin();

            // Log per debug
            error_log("PIN sbloccato con successo. Session ID: " . session_id());
            error_log("Session financial_pin_unlocked: " . var_export($_SESSION['financial_pin_unlocked'] ?? 'NOT SET', true));

            echo json_encode(['success' => true, 'message' => 'PIN corretto']);
        } else {
            error_log("PIN non corretto inserito");
            echo json_encode(['success' => false, 'message' => 'PIN non corretto']);
        }
        exit;
    }

    if (isset($_POST['action']) && $_POST['action'] === 'lock_financial_pin') {
        header('Content-Type: application/json');
        lockFinancialPin();

        error_log("PIN bloccato. Session ID: " . session_id());

        echo json_encode(['success' => true]);
        exit;
    }
}

/**
 * Richiede PIN per accedere alla pagina
 * Se il PIN non è sbloccato, ritorna true (il chiamante deve mostrare il PIN invece del contenuto)
 */
function requireFinancialPin() {
    return !isFinancialPinUnlocked();
}

/**
 * Renderizza il modal PIN con stile Notion - 4 caselle separate (solo titolo e caselle)
 */
function renderFinancialPinModal() {
    ?>
    <style>
        .pin-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 200px);
            padding: 48px;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }

        .pin-container.shake {
            animation: shake 0.4s ease-in-out;
        }

        .pin-header {
            text-align: center;
            margin-bottom: 40px;
        }

        .pin-title {
            font-size: 32px;
            font-weight: 600;
            color: #37352f;
            margin-bottom: 12px;
        }

        .pin-subtitle {
            font-size: 16px;
            color: #787774;
            line-height: 1.5;
        }

        .pin-boxes-wrapper {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-bottom: 24px;
        }

        .pin-box {
            width: 72px;
            height: 80px;
            border: 2px solid #e7e5e4;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: 600;
            color: #37352f;
            background: white;
            transition: all 0.2s;
            cursor: text;
            user-select: none;
        }

        .pin-box.active {
            border-color: #37352f;
            box-shadow: 0 0 0 3px rgba(55, 53, 47, 0.1);
        }

        .pin-box.filled {
            background: #f8f9fa;
        }

        .pin-error {
            display: none;
            padding: 14px 24px;
            background: #fee2e2;
            border: 1px solid #ef4444;
            border-radius: 6px;
            margin-top: 24px;
            color: #991b1b;
            font-size: 14px;
            text-align: center;
            font-weight: 500;
        }

        @media (max-width: 768px) {
            .pin-container {
                padding: 32px 20px;
            }

            .pin-title {
                font-size: 26px;
            }

            .pin-box {
                width: 60px;
                height: 68px;
                font-size: 32px;
            }

            .pin-boxes-wrapper {
                gap: 12px;
            }
        }
    </style>

    <div class="pin-container" id="pinContainer">
        <div class="pin-header">
            <h1 class="pin-title">Accesso Protetto</h1>
            <p class="pin-subtitle">
                Inserisci il PIN per accedere ai dati finanziari
            </p>
        </div>

        <div class="pin-boxes-wrapper" id="pinBoxes">
            <div class="pin-box active" data-index="0"></div>
            <div class="pin-box" data-index="1"></div>
            <div class="pin-box" data-index="2"></div>
            <div class="pin-box" data-index="3"></div>
        </div>

        <div id="pinError" class="pin-error"></div>
    </div>

    <script>
        let pinValue = [];
        const pinBoxes = document.querySelectorAll('.pin-box');
        const pinError = document.getElementById('pinError');
        const pinContainer = document.getElementById('pinContainer');

        // Focus automatico per tastiera
        document.addEventListener('DOMContentLoaded', () => {
            updateBoxes();
        });

        // Supporto tastiera fisica
        document.addEventListener('keydown', function(e) {
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                addDigit(e.key);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                deleteDigit();
            }
        });

        // Click sui box per focus
        pinBoxes.forEach((box) => {
            box.addEventListener('click', () => {
                document.body.focus();
            });
        });

        function addDigit(digit) {
            if (pinValue.length < 4) {
                pinValue.push(digit);
                updateBoxes();

                // Auto-verifica quando raggiungi 4 cifre
                if (pinValue.length === 4) {
                    setTimeout(() => verifyPin(), 300);
                }
            }
        }

        function deleteDigit() {
            if (pinValue.length > 0) {
                pinValue.pop();
                updateBoxes();
                pinError.style.display = 'none';
            }
        }

        function clearPin() {
            pinValue = [];
            updateBoxes();
            pinError.style.display = 'none';
        }

        function updateBoxes() {
            pinBoxes.forEach((box, index) => {
                // Rimuovi tutte le classi
                box.classList.remove('active', 'filled');

                // Aggiungi contenuto
                if (index < pinValue.length) {
                    box.textContent = '•';
                    box.classList.add('filled');
                } else {
                    box.textContent = '';
                }

                // Evidenzia il box attivo
                if (index === pinValue.length && pinValue.length < 4) {
                    box.classList.add('active');
                }
            });
        }

        async function verifyPin() {
            const pin = pinValue.join('');

            if (pin.length !== 4) {
                return;
            }

            try {
                const formData = new FormData();
                formData.append('action', 'verify_financial_pin');
                formData.append('pin', pin);

                const response = await fetch(window.location.href, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    // PIN corretto - ricarica la pagina
                    window.location.reload();
                } else {
                    // PIN errato - shake animation
                    pinContainer.classList.add('shake');
                    showError('PIN non corretto. Riprova.');

                    setTimeout(() => {
                        pinContainer.classList.remove('shake');
                        clearPin();
                    }, 400);
                }
            } catch (error) {
                console.error('Errore verifica PIN:', error);
                showError('Errore di connessione. Riprova.');
            }
        }

        function showError(message) {
            pinError.textContent = message;
            pinError.style.display = 'block';

            // Nascondi dopo 3 secondi
            setTimeout(() => {
                pinError.style.display = 'none';
            }, 3000);
        }
    </script>
    <?php
}

/**
 * Renderizza il bottone per nascondere le cifre (da usare nell'header del modulo)
 * @return string HTML del bottone
 */
function getFinancialLockButton() {
    if (!isFinancialPinUnlocked()) {
        return '';
    }

    return '
    <button onclick="lockFinancialData()"
            style="background: #37352f; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
        🔒 Nascondi Dati
    </button>
    <script>
    async function lockFinancialData() {
        if (!confirm("Vuoi nascondere i dati finanziari? Dovrai reinserire il PIN per vederli di nuovo.")) {
            return;
        }

        try {
            const formData = new FormData();
            formData.append("action", "lock_financial_pin");

            const response = await fetch(window.location.href, {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                window.location.reload();
            }
        } catch (error) {
            console.error("Errore lock dati:", error);
        }
    }
    </script>
    ';
}
?>

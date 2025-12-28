<!DOCTYPE html>
<!-- File: /index.php -->
<!-- Pagina di login per CRM Studio Mismo - Stile Notion -->
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - CRM Studio Mismo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
            background: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #37352f;
            font-size: 14px;
        }

        .login-container {
            background: #ffffff;
            padding: 40px;
            border-radius: 6px;
            border: 1px solid #e9e9e7;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .logo {
            text-align: center;
            margin-bottom: 32px;
        }

        .logo h1 {
            font-size: 28px;
            font-weight: 700;
            color: #37352f;
            margin-bottom: 4px;
            letter-spacing: -0.6px;
        }

        .logo p {
            color: #787774;
            font-size: 14px;
        }

        .form-group {
            margin-bottom: 16px;
        }

        .form-group label {
            display: block;
            font-weight: 500;
            color: #37352f;
            margin-bottom: 6px;
            font-size: 14px;
        }

        .form-group input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d3d3d1;
            border-radius: 4px;
            font-size: 14px;
            font-family: inherit;
            background: #ffffff;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .form-group input:focus {
            outline: none;
            border-color: #37352f;
            box-shadow: 0 0 0 1px #37352f;
        }

        /* NUOVO: Stile per il campo password con toggle */
        .password-input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .password-input-wrapper input {
            padding-right: 40px;
        }

        .password-toggle {
            position: absolute;
            right: 10px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            color: #787774;
            font-size: 18px;
            transition: color 0.15s ease;
            align-items: center;
            display: flex
            ;
        }

        .password-toggle:hover {
            color: #37352f;
        }

        .two-fa-group {
            display: none;
            background: #f7f7f5;
            padding: 16px;
            border-radius: 4px;
            margin-bottom: 16px;
            border: 1px solid #e9e9e7;
        }

        .two-fa-group.show {
            display: block;
        }

        .two-fa-group p {
            font-size: 14px;
            color: #37352f;
            margin-bottom: 12px;
        }

        .btn-login {
            width: 100%;
            background: #37352f;
            color: #ffffff;
            border: none;
            padding: 10px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn-login:hover {
            background: #2f2e29;
        }

        .btn-login:disabled {
            background: #787774;
            cursor: not-allowed;
        }

        .btn-login .spinner {
            display: none;
            width: 14px;
            height: 14px;
            border: 1.5px solid transparent;
            border-top: 1.5px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        .btn-login.loading .spinner {
            display: block;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .alert {
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 16px;
            font-size: 14px;
            display: none;
            border: 1px solid;
        }

        .alert.show {
            display: block;
        }

        .alert-error {
            background: #fdf2f2;
            color: #d73502;
            border-color: #fed7d7;
        }

        .alert-success {
            background: #f7f7f5;
            color: #37352f;
            border-color: #e9e9e7;
        }

        /* Cache info */
        .cache-info {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
        }

        /* NUOVO: Stili per i link di supporto */
        .login-links {
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid #e9e9e7;
        }

        .login-links-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
        }

        .login-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: #f7f7f5;
            border: 1px solid #e9e9e7;
            border-radius: 4px;
            text-decoration: none;
            color: #37352f;
            transition: all 0.15s ease;
            cursor: pointer;
            font-size: 13px;
        }

        .login-link:hover {
            background: #f1f1ef;
            border-color: #d3d3d1;
            transform: translateY(-1px);
        }

        .login-link.new-user {
            background: #f0f9f0;
            border-color: #c6e9c6;
            color: #2d5a2d;
        }

        .login-link.new-user:hover {
            background: #e8f5e8;
            border-color: #a8d8a8;
        }

        .link-icon {
            font-size: 16px;
            flex-shrink: 0;
        }

        .link-content {
            flex: 1;
            min-width: 0;
        }

        .link-title {
            font-weight: 600;
            font-size: 11px;
            margin-bottom: 2px;
            line-height: 1.2;
            text-align: center;
        }

        .link-desc {
            font-size: 11px;
            color: #787774;
            line-height: 1.2;
            text-align: center;
        }

        .login-link.new-user .link-desc {
            color: #5a7a5a;
        }

        /* NUOVO: Modal per nuovo utente */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.4);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
        }

        .modal.show {
            display: flex;
        }

        .modal-content {
            background: #ffffff;
            border-radius: 6px;
            border: 1px solid #e9e9e7;
            width: 100%;
            max-width: 450px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
            padding: 24px 24px 16px 24px;
            border-bottom: 1px solid #e9e9e7;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #37352f;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 20px;
            color: #787774;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.15s ease;
        }

        .modal-close:hover {
            background: #f7f7f5;
            color: #37352f;
        }

        .modal-body {
            padding: 24px;
        }

        .welcome-message {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 4px;
            padding: 16px;
            margin-bottom: 20px;
        }

        .welcome-message h4 {
            margin: 0 0 8px 0;
            color: #0c4a6e;
            font-size: 15px;
            font-weight: 600;
        }

        .welcome-message p {
            margin: 0;
            color: #0369a1;
            font-size: 13px;
            line-height: 1.4;
        }

        .help-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e9e9e7;
            text-align: center;
        }

        .help-section h5 {
            margin: 0 0 8px 0;
            color: #37352f;
            font-size: 14px;
            font-weight: 500;
        }

        .help-section p {
            margin: 0 0 12px 0;
            color: #787774;
            font-size: 12px;
        }

        .btn-secondary {
            background: #f7f7f5;
            color: #37352f;
            border: 1px solid #e9e9e7;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn-secondary:hover {
            background: #f1f1ef;
            border-color: #d3d3d1;
        }

        .forgot-password {
            text-align: center;
            margin-top: 16px;
        }

        .forgot-password a {
            color: #787774;
            text-decoration: none;
            font-size: 12px;
            transition: color 0.15s ease;
        }

        .forgot-password a:hover {
            color: #37352f;
            text-decoration: underline;
        }

        .footer {
            text-align: center;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid #e9e9e7;
            font-size: 12px;
            color: #787774;
        }

        @media (max-width: 480px) {
            .login-container {
                margin: 16px;
                padding: 24px;
            }

            .login-links-grid {
                grid-template-columns: 1fr;
            }

            .modal-content {
                margin: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <img src="assets/images/logo_mismo_black.svg" alt="Logo Mismo" style="width: 10em;">
            <p>CRM Mismo Studio</p>
        </div>

        <div id="alert" class="alert">
            <span id="alert-message"></span>
        </div>

        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required autocomplete="username">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <div class="password-input-wrapper">
                    <input type="password" id="password" name="password" required autocomplete="current-password">
                    <button type="button" class="password-toggle" id="passwordToggle" onclick="togglePassword()">
                        <img id="toggleIcon" src="assets/images/icone/chiuso.svg" alt="Mostra password" style="width:20px; height:20px;">
                    </button>
                </div>
            </div>

            <div id="twoFaGroup" class="two-fa-group">
                <p>Inserisci il codice dal tuo Google Authenticator</p>
                <div class="form-group">
                    <label for="two_fa_code">Codice 2FA</label>
                    <input type="text" id="two_fa_code" name="two_fa_code" placeholder="000000" maxlength="6" pattern="[0-9]{6}">
                </div>
            </div>

            <button type="submit" class="btn-login" id="loginBtn">
                <span class="spinner"></span>
                <span id="loginBtnText">Accedi</span>
            </button>
        </form>

        <!-- NUOVO: Link di supporto con anti-cache -->
        <div class="login-links">
            <div class="login-links-grid">
                <!-- Link Password Dimenticata con timestamp per evitare cache -->
                <?php $version = time(); ?>
                <a href="/client-password-reset.php?v=<?= $version ?>" class="login-link">
                  
                    <div class="link-content">
                        <div class="link-title">Password dimenticata?</div>
                        <div class="link-desc">Recupera l'accesso</div>
                    </div>
                </a>
                
                <!-- NUOVO: Bottone Nuovo Utente -->
                <button type="button" class="login-link new-user" onclick="showNewUserForm()">
                  
                    <div class="link-content">
                        <div class="link-title">Nuovo utente?</div>
                        <div class="link-desc">Attiva il tuo account</div>
                    </div>
                </button>
            </div>
            
            <div class="forgot-password">
                <a href="mailto:info@studiomismo.it">Hai bisogno di aiuto? Contattaci</a>
            </div>
        </div>

        <div class="footer">
            <p>&copy; 2025 Studio Mismo. Tutti i diritti riservati.</p>
        </div>
    </div>

    <!-- NUOVO: Modal per attivazione nuovo utente -->
    <div id="newUserModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>🆕 Attivazione Account Cliente</h3>
                <button type="button" class="modal-close" onclick="hideNewUserForm()">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="welcome-message">
                    <h4>👋 Benvenuto!</h4>
                    <p>Se hai ricevuto le credenziali di accesso dal nostro team, inserisci il tuo <strong>username</strong> qui sotto per impostare la tua password.</p>
                </div>
                
                <form id="newUserForm">
                    <div class="form-group">
                        <label for="newUserUsername">Il tuo Username</label>
                        <input type="text" id="newUserUsername" name="username" required 
                               placeholder="Username fornito dal nostro team">
                        <small style="display: block; margin-top: 4px; font-size: 11px; color: #787774;">
                            Inserisci l'username che ti è stato comunicato via email o telefono.
                        </small>
                    </div>
                    
                    <button type="submit" class="btn-login" style="margin-bottom: 0;">
                        🔍 Verifica Username
                    </button>
                </form>
                
                <div class="help-section">
                    <h5>❓ Non hai ricevuto le credenziali?</h5>
                    <p>Contatta il nostro team per richiedere l'accesso al portale clienti.</p>
                    <a href="mailto:info@studiomismo.it" class="btn-secondary">
                        📧 Contattaci
                    </a>
                </div>
            </div>
        </div>
    </div>

    <!-- Cache version info -->
    <div class="cache-info">
        v: <?= date('Y-m-d H:i:s') ?>
    </div>

    <script>
        // NUOVO: Toggle password visibility
        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const toggleIcon = document.getElementById('toggleIcon');
        
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.src = 'assets/images/icone/aperto.svg';
                toggleIcon.alt = 'Nascondi password';
            } else {
                passwordInput.type = 'password';
                toggleIcon.src = 'assets/images/icone/chiuso.svg';
                toggleIcon.alt = 'Mostra password';
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            const loginForm = document.getElementById('loginForm');
            const loginBtn = document.getElementById('loginBtn');
            const loginBtnText = document.getElementById('loginBtnText');
            const alert = document.getElementById('alert');
            const alertMessage = document.getElementById('alert-message');
            const twoFaGroup = document.getElementById('twoFaGroup');
            
            let requireTwoFa = false;

            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = new FormData(loginForm);
                
                // Set loading state
                loginBtn.disabled = true;
                loginBtn.classList.add('loading');
                loginBtnText.textContent = 'Accesso in corso...';
                hideAlert();
                
                try {
                    const response = await fetch('/core/auth/login_handler.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showAlert('Accesso effettuato con successo', 'success');
                        setTimeout(() => {
                            // ⚠️ CRITICO: Usa il redirect dalla risposta, NON hardcoded!
                            const redirectUrl = data.redirect || '/dashboard.php';
                            console.log('Redirecting to:', redirectUrl, 'User type:', data.user_type);
                            window.location.href = redirectUrl;
                        }, 1000);
                    } else if (data.require_2fa) {
                        requireTwoFa = true;
                        twoFaGroup.classList.add('show');
                        document.getElementById('two_fa_code').focus();
                        showAlert('Inserisci il codice 2FA per completare l\'accesso', 'success');
                    } else {
                        showAlert(data.message, 'error');
                    }
                    
                } catch (error) {
                    console.error('Login error:', error);
                    showAlert('Errore di connessione. Riprova più tardi.', 'error');
                } finally {
                    // Reset loading state
                    loginBtn.disabled = false;
                    loginBtn.classList.remove('loading');
                    loginBtnText.textContent = 'Accedi';
                }
            });
            
            function showAlert(message, type) {
                alertMessage.textContent = message;
                alert.className = `alert alert-${type} show`;
            }
            
            function hideAlert() {
                alert.classList.remove('show');
            }
            
            // Auto-format 2FA code input
            document.getElementById('two_fa_code').addEventListener('input', function(e) {
                e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
            });
        });

        // NUOVO: Funzioni per il modal nuovo utente
        function showNewUserForm() {
            document.getElementById('newUserModal').classList.add('show');
        }

        function hideNewUserForm() {
            document.getElementById('newUserModal').classList.remove('show');
            document.getElementById('newUserForm').reset();
        }

        // NUOVO: Gestione form nuovo utente con anti-cache
        document.getElementById('newUserForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('newUserUsername').value.trim();
            
            if (!username) {
                alert('Inserisci il tuo username');
                return;
            }
            
            try {
                // Aggiungi timestamp per evitare cache
                const timestamp = Date.now();
                window.location.href = `/client-activation.php?username=${encodeURIComponent(username)}&v=${timestamp}`;
            } catch (error) {
                console.error('Errore:', error);
                alert('❌ Errore di connessione. Riprova più tardi.');
            }
        });

        // NUOVO: Chiudi modal con ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideNewUserForm();
            }
        });

        // NUOVO: Chiudi modal cliccando fuori
        document.getElementById('newUserModal').addEventListener('click', function(e) {
            if (e.target === this) {
                hideNewUserForm();
            }
        });

        // Force reload CSS and JS
        window.addEventListener('load', function() {
            // Clear any cached form data
            if (window.performance && window.performance.navigation.type === window.performance.navigation.TYPE_RELOAD) {
                console.log('Page reloaded - cache cleared');
            }
        });
    </script>
</body>
</html>
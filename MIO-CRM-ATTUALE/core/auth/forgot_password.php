<!DOCTYPE html>
<!-- File: /core/auth/forgot_password.php -->
<!-- Pagina recupero password per CRM Studio Mismo -->
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recupero Password - CRM Studio Mismo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter Tight', sans-serif;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1f2937;
        }

        .forgot-container {
            background: white;
            padding: 2.5rem;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            width: 100%;
            max-width: 420px;
            position: relative;
            overflow: hidden;
        }

        .forgot-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
        }

        .header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #22c55e;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 1.5rem;
            transition: color 0.2s ease;
        }

        .back-link:hover {
            color: #16a34a;
        }

        .logo h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #1f2937;
            letter-spacing: -0.025em;
            margin-bottom: 0.5rem;
        }

        .header p {
            color: #6b7280;
            font-size: 0.875rem;
            line-height: 1.6;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            font-weight: 500;
            color: #374151;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
        }

        .form-group input {
            width: 100%;
            padding: 0.875rem 1rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            background: #fafafa;
        }

        .form-group input:focus {
            outline: none;
            border-color: #22c55e;
            background: white;
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
        }

        .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            border: none;
            padding: 0.875rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }

        .btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.3);
        }

        .btn-submit:active {
            transform: translateY(0);
        }

        .btn-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .btn-submit .spinner {
            display: none;
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 0.5rem;
        }

        .btn-submit.loading .spinner {
            display: inline-block;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .alert {
            padding: 0.875rem 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            font-size: 0.875rem;
            display: none;
        }

        .alert.show {
            display: block;
        }

        .alert-error {
            background: #fef2f2;
            color: #991b1b;
            border-left: 4px solid #ef4444;
        }

        .alert-success {
            background: #f0fdf4;
            color: #166534;
            border-left: 4px solid #22c55e;
        }

        .alert-info {
            background: #f0f9ff;
            color: #0369a1;
            border-left: 4px solid #0ea5e9;
        }

        .success-state {
            display: none;
            text-align: center;
        }

        .success-state.show {
            display: block;
        }

        .success-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            color: white;
            font-size: 1.5rem;
        }

        .footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e5e7eb;
            font-size: 0.75rem;
            color: #6b7280;
        }

        @media (max-width: 480px) {
            .forgot-container {
                margin: 1rem;
                padding: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="forgot-container">
        <a href="/index.php" class="back-link">
            ← Torna al login
        </a>

        <div class="header">
            <div class="logo">
                <h1>Recupero Password</h1>
            </div>
            <p id="headerText">Inserisci la tua email per ricevere le istruzioni per reimpostare la password</p>
        </div>

        <div id="alert" class="alert">
            <span id="alert-message"></span>
        </div>

        <div id="formState">
            <form id="forgotForm">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required 
                           placeholder="inserisci@tuaemail.it" autocomplete="email">
                </div>

                <button type="submit" class="btn-submit" id="submitBtn">
                    <span class="spinner"></span>
                    <span id="submitBtnText">Invia Istruzioni</span>
                </button>
            </form>
        </div>

        <div id="successState" class="success-state">
            <div class="success-icon">
                ✓
            </div>
            <h3>Email inviata!</h3>
            <p>Controlla la tua casella di posta elettronica per le istruzioni su come reimpostare la password.</p>
            <br>
            <p><small>Non hai ricevuto l'email? Controlla nella cartella spam o <button type="button" onclick="resetForm()" style="background:none;border:none;color:#22c55e;text-decoration:underline;cursor:pointer;">riprova</button></small></p>
        </div>

        <div class="footer">
            <p>&copy; 2025 Studio Mismo. Tutti i diritti riservati.</p>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const forgotForm = document.getElementById('forgotForm');
            const submitBtn = document.getElementById('submitBtn');
            const submitBtnText = document.getElementById('submitBtnText');
            const alert = document.getElementById('alert');
            const alertMessage = document.getElementById('alert-message');
            const formState = document.getElementById('formState');
            const successState = document.getElementById('successState');
            
            forgotForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = new FormData(forgotForm);
                
                // Set loading state
                submitBtn.disabled = true;
                submitBtn.classList.add('loading');
                submitBtnText.textContent = 'Invio in corso...';
                hideAlert();
                
                try {
                    const response = await fetch('/core/auth/forgot_password_handler.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Show success state
                        formState.style.display = 'none';
                        successState.classList.add('show');
                    } else {
                        showAlert(data.message, 'error');
                    }
                    
                } catch (error) {
                    console.error('Forgot password error:', error);
                    showAlert('Errore di connessione. Riprova più tardi.', 'error');
                } finally {
                    // Reset loading state
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('loading');
                    submitBtnText.textContent = 'Invia Istruzioni';
                }
            });
            
            function showAlert(message, type) {
                alertMessage.textContent = message;
                alert.className = `alert alert-${type} show`;
            }
            
            function hideAlert() {
                alert.classList.remove('show');
            }
            
            // Make functions global for onclick handlers
            window.showAlert = showAlert;
            window.hideAlert = hideAlert;
        });
        
        function resetForm() {
            document.getElementById('formState').style.display = 'block';
            document.getElementById('successState').classList.remove('show');
            document.getElementById('email').value = '';
            hideAlert();
        }
    </script>
</body>
</html>
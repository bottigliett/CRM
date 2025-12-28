<!DOCTYPE html>
<!-- File: /core/errors/404.php -->
<!-- Pagina errore 404 per CRM Studio Mismo -->
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagina non trovata - CRM Studio Mismo</title>
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

        .error-container {
            background: white;
            padding: 3rem;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            width: 100%;
            max-width: 500px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .error-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
        }

        .error-code {
            font-size: 6rem;
            font-weight: 700;
            color: #ef4444;
            line-height: 1;
            margin-bottom: 1rem;
            text-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }

        .error-title {
            font-size: 1.75rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 1rem;
        }

        .error-message {
            font-size: 1rem;
            color: #6b7280;
            line-height: 1.6;
            margin-bottom: 2rem;
        }

        .error-actions {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            align-items: center;
        }

        .btn {
            padding: 0.875rem 2rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn-primary {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.3);
        }

        .btn-secondary {
            border: 2px solid #e5e7eb;
            color: #6b7280;
            background: white;
        }

        .btn-secondary:hover {
            border-color: #d1d5db;
            color: #1f2937;
            transform: translateY(-1px);
        }

        .logo {
            margin-bottom: 2rem;
        }

        .logo h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
        }

        .logo p {
            font-size: 0.875rem;
            color: #6b7280;
            margin-top: 0.25rem;
        }

        .suggestions {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #e5e7eb;
        }

        .suggestions h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 1rem;
        }

        .suggestions ul {
            list-style: none;
            text-align: left;
        }

        .suggestions li {
            padding: 0.5rem 0;
            font-size: 0.875rem;
            color: #6b7280;
        }

        .suggestions li::before {
            content: '•';
            color: #22c55e;
            font-weight: bold;
            margin-right: 0.5rem;
        }

        @media (max-width: 640px) {
            .error-container {
                margin: 1rem;
                padding: 2rem;
            }

            .error-code {
                font-size: 4rem;
            }

            .error-title {
                font-size: 1.5rem;
            }

            .error-actions {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="logo">
            <h1>MISMO</h1>
            <p>CRM Studio</p>
        </div>

        <div class="error-code">404</div>
        <h1 class="error-title">Pagina non trovata</h1>
        <p class="error-message">
            La pagina che stai cercando non esiste o è stata spostata.
            Controlla l'URL o utilizza i link qui sotto per navigare.
        </p>

        <div class="error-actions">
            <a href="/dashboard.php" class="btn btn-primary">
                🏠 Torna alla Dashboard
            </a>
            <a href="javascript:history.back()" class="btn btn-secondary">
                ← Pagina precedente
            </a>
        </div>

        <div class="suggestions">
            <h3>Cosa puoi fare:</h3>
            <ul>
                <li>Verifica di aver digitato correttamente l'URL</li>
                <li>Utilizza il menu di navigazione per trovare quello che cerchi</li>
                <li>Contatta l'amministratore se pensi ci sia un errore</li>
                <li>Torna alla pagina principale del CRM</li>
            </ul>
        </div>
    </div>

    <script>
        // Log dell'errore 404 per analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                'description': '404 Error: ' + window.location.pathname,
                'fatal': false
            });
        }

        // Auto redirect dopo 30 secondi se non c'è interazione
        let redirectTimer = setTimeout(function() {
            window.location.href = '/dashboard.php';
        }, 30000);

        // Cancella il timer se l'utente interagisce con la pagina
        document.addEventListener('click', function() {
            clearTimeout(redirectTimer);
        });

        document.addEventListener('keydown', function() {
            clearTimeout(redirectTimer);
        });
    </script>
</body>
</html>
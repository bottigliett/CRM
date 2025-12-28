<?php
// Debug script per vedere come vengono organizzati gli eventi all-day
require_once __DIR__ . '/../../core/includes/config.php';
require_once __DIR__ . '/../../core/includes/auth_helper.php';

$currentUser = getCurrentUser();
if (!$currentUser) {
    die('Non autenticato');
}

$monday = new DateTime('monday this week');
$sunday = new DateTime('sunday this week');

echo "<h2>Debug Eventi All-Day Settimana</h2>";
echo "<p>Settimana: " . $monday->format('Y-m-d') . " - " . $sunday->format('Y-m-d') . "</p>";

try {
    // Prendi tutti gli eventi all-day della settimana
    $stmt = $pdo->prepare("
        SELECT e.*
        FROM agenda_events e
        JOIN agenda_event_responsables r ON e.id = r.event_id
        WHERE r.user_id = ?
        AND e.is_all_day = 1
        AND e.status != 'cancelled'
        AND (
            (DATE(e.start_datetime) BETWEEN ? AND ?) OR
            (DATE(e.end_datetime) BETWEEN ? AND ?) OR
            (DATE(e.start_datetime) <= ? AND DATE(e.end_datetime) >= ?)
        )
        ORDER BY e.start_datetime
    ");
    $stmt->execute([
        $currentUser['id'],
        $monday->format('Y-m-d'),
        $sunday->format('Y-m-d'),
        $monday->format('Y-m-d'),
        $sunday->format('Y-m-d'),
        $monday->format('Y-m-d'),
        $sunday->format('Y-m-d')
    ]);
    $allDayEvents = $stmt->fetchAll();

    echo "<h3>Eventi All-Day trovati: " . count($allDayEvents) . "</h3>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>ID</th><th>Title</th><th>Start</th><th>End</th></tr>";
    foreach ($allDayEvents as $event) {
        echo "<tr>";
        echo "<td>{$event['id']}</td>";
        echo "<td>{$event['title']}</td>";
        echo "<td>{$event['start_datetime']}</td>";
        echo "<td>{$event['end_datetime']}</td>";
        echo "</tr>";
    }
    echo "</table>";

    // Simula l'algoritmo di raggruppamento
    $eventRows = [];
    foreach ($allDayEvents as $event) {
        $startDate = new DateTime(date('Y-m-d', strtotime($event['start_datetime'])));
        $endDate = new DateTime(date('Y-m-d', strtotime($event['end_datetime'])));

        $placed = false;
        foreach ($eventRows as $rowIndex => &$row) {
            $canPlace = true;
            foreach ($row as $placedEvent) {
                $placedStart = new DateTime(date('Y-m-d', strtotime($placedEvent['start_datetime'])));
                $placedEnd = new DateTime(date('Y-m-d', strtotime($placedEvent['end_datetime'])));

                if ($startDate <= $placedEnd && $endDate >= $placedStart) {
                    $canPlace = false;
                    break;
                }
            }
            if ($canPlace) {
                $row[] = $event;
                $placed = true;
                break;
            }
        }
        if (!$placed) {
            $eventRows[] = [$event];
        }
    }

    echo "<h3>Righe create: " . count($eventRows) . "</h3>";
    foreach ($eventRows as $rowIndex => $row) {
        echo "<h4>Riga " . ($rowIndex + 1) . " (" . count($row) . " eventi):</h4>";
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>ID</th><th>Title</th><th>Start</th><th>End</th></tr>";
        foreach ($row as $event) {
            echo "<tr>";
            echo "<td>{$event['id']}</td>";
            echo "<td>{$event['title']}</td>";
            echo "<td>{$event['start_datetime']}</td>";
            echo "<td>{$event['end_datetime']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

} catch (Exception $e) {
    echo "<p style='color:red'>Errore: " . $e->getMessage() . "</p>";
}
?>

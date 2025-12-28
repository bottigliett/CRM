<?php
// Debug script per vedere tutti gli eventi di oggi
require_once __DIR__ . '/../../core/includes/config.php';
require_once __DIR__ . '/../../core/includes/auth_helper.php';

$currentUser = getCurrentUser();
if (!$currentUser) {
    die('Non autenticato');
}

$today = date('Y-m-d');
echo "<h2>Debug Eventi del $today</h2>";
echo "<p>User ID: {$currentUser['id']}</p>";

try {
    // Prendi TUTTI gli eventi con start_datetime oggi
    $stmt = $pdo->prepare("
        SELECT
            e.id,
            e.title,
            e.start_datetime,
            e.end_datetime,
            e.is_all_day,
            e.status,
            DATE(e.start_datetime) as start_date,
            DATE(e.end_datetime) as end_date,
            r.user_id
        FROM agenda_events e
        LEFT JOIN agenda_event_responsables r ON e.id = r.event_id
        WHERE DATE(e.start_datetime) = ?
        ORDER BY e.start_datetime
    ");
    $stmt->execute([$today]);
    $events = $stmt->fetchAll();

    echo "<h3>Eventi con start_datetime = $today:</h3>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>ID</th><th>Title</th><th>Start</th><th>End</th><th>All Day</th><th>Status</th><th>User ID</th></tr>";

    foreach ($events as $event) {
        echo "<tr>";
        echo "<td>{$event['id']}</td>";
        echo "<td>{$event['title']}</td>";
        echo "<td>{$event['start_datetime']}</td>";
        echo "<td>{$event['end_datetime']}</td>";
        echo "<td>{$event['is_all_day']}</td>";
        echo "<td>{$event['status']}</td>";
        echo "<td>{$event['user_id']}</td>";
        echo "</tr>";
    }
    echo "</table>";

    // Prendi eventi multi-giorno che passano per oggi
    $stmt = $pdo->prepare("
        SELECT
            e.id,
            e.title,
            e.start_datetime,
            e.end_datetime,
            e.is_all_day,
            e.status,
            r.user_id
        FROM agenda_events e
        LEFT JOIN agenda_event_responsables r ON e.id = r.event_id
        WHERE DATE(e.start_datetime) < ?
        AND DATE(e.end_datetime) >= ?
    ");
    $stmt->execute([$today, $today]);
    $multiEvents = $stmt->fetchAll();

    echo "<h3>Eventi multi-giorno che passano per oggi:</h3>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>ID</th><th>Title</th><th>Start</th><th>End</th><th>All Day</th><th>Status</th><th>User ID</th></tr>";

    foreach ($multiEvents as $event) {
        echo "<tr>";
        echo "<td>{$event['id']}</td>";
        echo "<td>{$event['title']}</td>";
        echo "<td>{$event['start_datetime']}</td>";
        echo "<td>{$event['end_datetime']}</td>";
        echo "<td>{$event['is_all_day']}</td>";
        echo "<td>{$event['status']}</td>";
        echo "<td>{$event['user_id']}</td>";
        echo "</tr>";
    }
    echo "</table>";

    // Test della query attuale
    $todayEnd = date('Y-m-d 23:59:59');
    $stmt = $pdo->prepare("
        SELECT COUNT(DISTINCT e.id) as count
        FROM agenda_events e
        JOIN agenda_event_responsables r ON e.id = r.event_id
        WHERE r.user_id = ?
        AND e.status != 'cancelled'
        AND (
            (DATE(e.start_datetime) = ?)
            OR (e.start_datetime <= ? AND e.end_datetime >= ? AND e.end_datetime > '0000-00-00')
        )
    ");
    $stmt->execute([$currentUser['id'], $today, $todayEnd, $today]);
    $count = $stmt->fetch()['count'];

    echo "<h3>Count dalla query attuale: $count</h3>";

} catch (Exception $e) {
    echo "<p style='color:red'>Errore: " . $e->getMessage() . "</p>";
}
?>

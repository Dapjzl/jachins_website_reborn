<?php

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

function clean($str) {
    return htmlspecialchars(trim((string) $str), ENT_QUOTES, 'UTF-8');
}


$input = $_POST;


if (empty($input)) {
    $json = file_get_contents('php://input');
    $decoded = json_decode($json, true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
}

$firstName = isset($input['firstName']) ? clean($input['firstName']) : '';
$lastName  = isset($input['lastName'])  ? clean($input['lastName'])  : '';
$phone     = isset($input['phone'])     ? clean($input['phone'])     : '';
$email     = isset($input['email'])     ? trim((string) $input['email']) : '';
$message   = isset($input['message'])   ? clean($input['message'])   : '';

$errors = [];

if ($firstName === '') {
    $errors[] = 'First name is required.';
}
if ($lastName === '') {
    $errors[] = 'Last name is required.';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'A valid email address is required.';
}
if ($message === '') {
    $errors[] = 'Message is required.';
}
if ($email !== '' && preg_match('/[\r\n]/', $email)) {
    $errors[] = 'Invalid email address.';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => implode(' ', $errors)]);
    exit;
}


$to       = 'info@jachinsgroup.com';
$fullName = trim($firstName . ' ' . $lastName);
$subject  = 'New Contact Message from ' . $fullName;

$body  = "You have received a new enquiry from your website contact form.\n\n";
$body .= "Name: $fullName\n";
$body .= "Email: $email\n";
$body .= "Phone: " . ($phone !== '' ? $phone : 'Not provided') . "\n\n";
$body .= "Message:\n$message\n";

$fromEmail = 'info@jachinsgroup.com'; 

$headers   = [];
$headers[] = "From: {$fullName} <{$fromEmail}>";
$headers[] = "Reply-To: {$fullName} <{$email}>";
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'X-Mailer: PHP/' . phpversion();

$headerString = implode("\r\n", $headers);

$sent = @mail($to, $subject, $body, $headerString);

if ($sent) {
    http_response_code(200);
    echo json_encode([
        'status'  => 'success',
        'message' => 'Thank you! Your message has been sent successfully.',
    ]);
    exit;
}

// Fallback: log locally (useful when mail() isn't configured, e.g. local dev)
$logEntry  = '--- Enquiry logged at ' . date('Y-m-d H:i:s') . " ---\n";
$logEntry .= "To: $to\nSubject: $subject\n$headerString\n\n$body\n\n";

$logFile = __DIR__ . '/email_log.txt';
if (@file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX) !== false) {
    http_response_code(200);
    echo json_encode([
        'status'  => 'success',
        'message' => 'Thank you! Your message has been received.',
    ]);
    exit;
}

http_response_code(500);
echo json_encode([
    'status'  => 'error',
    'message' => 'Sorry, something went wrong. Please try again later or contact us directly by phone or email.',
]);

<?php

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // 1. Try to get data from $_POST (Form Data)
    $name = isset($_POST["name"]) ? htmlspecialchars($_POST["name"]) : '';
    $email = isset($_POST["email"]) ? htmlspecialchars($_POST["email"]) : '';
    $message = isset($_POST["message"]) ? htmlspecialchars($_POST["message"]) : '';

    // 2. If valid data not found in $_POST, try JSON input (Raw Body)
    if (empty($name) || empty($email) || empty($message)) {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if ($data) {
            $name = isset($data["name"]) ? htmlspecialchars($data["name"]) : $name;
            $email = isset($data["email"]) ? htmlspecialchars($data["email"]) : $email;
            $message = isset($data["message"]) ? htmlspecialchars($data["message"]) : $message;
        }
    }

    if (empty($name) || empty($email) || empty($message)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'All fields are required!']);
        exit;
    }

    $to = "info@jachinsgroup.com";
    $subject = "New Contact Us Message from $name";
    
    $body = "Name: $name\n";
    $body .= "Email: $email\n\n";
    $body .= "Message:\n$message\n";

    $headers = "From: $email" . "\r\n" .
               "Reply-To: $email" . "\r\n" .
               "X-Mailer: PHP/" . phpversion();

    // 3. Attempt to send email
    if (mail($to, $subject, $body, $headers)) {
        http_response_code(200);
        echo json_encode(['status' => 'success', 'message' => 'Email sent successfully!']);
    } else {
        // 4. Fallback: Log to file for local testing if mail() fails
        $logEntry = "--- Email Logged at " . date('Y-m-d H:i:s') . " ---\n";
        $logEntry .= "To: $to\nSubject: $subject\nHeaders: $headers\n\n$body\n\n";
        
        if (file_put_contents('email_log.txt', $logEntry, FILE_APPEND)) {
            http_response_code(200);
            echo json_encode([
                'status' => 'success', 
                'message' => 'Email not sent (Local Environment), but logged to email_log.txt'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Email sending failed and could not log to file.']);
        }
    }

} else {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Access denied']);
}

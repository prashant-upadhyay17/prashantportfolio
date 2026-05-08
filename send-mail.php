<?php
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
ob_start();

header('Content-Type: application/json');

function respond($ok, $message, $status = 200, $extra = []) {
    if (ob_get_length()) {
        ob_clean();
    }
    http_response_code($status);
    echo json_encode(array_merge(['ok' => $ok, 'message' => $message], $extra));
    exit;
}

function smtp_read($socket) {
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    return $response;
}

function smtp_command($socket, $command, $expected) {
    if ($command !== null) {
        fwrite($socket, $command . "\r\n");
    }

    $response = smtp_read($socket);
    $code = (int) substr($response, 0, 3);
    if (!in_array($code, (array) $expected, true)) {
        throw new Exception('SMTP error: ' . trim($response));
    }

    return $response;
}

function dot_stuff($text) {
    return preg_replace('/^\./m', '..', $text);
}

function send_smtp_mail($config, $to, $subject, $body, $replyToEmail, $replyToName) {
    $host = $config['host'] ?? '';
    $port = (int) ($config['port'] ?? 465);
    $username = $config['username'] ?? '';
    $password = $config['password'] ?? '';
    $secure = $config['secure'] ?? 'ssl';
    $fromEmail = $config['from_email'] ?? $username;
    $fromName = $config['from_name'] ?? 'Portfolio Contact';

    if ($host === '' || $username === '' || $password === '' || $fromEmail === '') {
        return false;
    }

    $target = ($secure === 'ssl' ? 'ssl://' : '') . $host;
    $socket = @fsockopen($target, $port, $errno, $errstr, 15);
    if (!$socket) {
        throw new Exception('SMTP connection failed: ' . $errstr);
    }

    stream_set_timeout($socket, 15);
    smtp_command($socket, null, 220);
    smtp_command($socket, 'EHLO localhost', 250);

    if ($secure === 'tls') {
        smtp_command($socket, 'STARTTLS', 220);
        if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new Exception('Could not start SMTP TLS encryption.');
        }
        smtp_command($socket, 'EHLO localhost', 250);
    }

    smtp_command($socket, 'AUTH LOGIN', 334);
    smtp_command($socket, base64_encode($username), 334);
    smtp_command($socket, base64_encode($password), 235);
    smtp_command($socket, 'MAIL FROM:<' . $fromEmail . '>', 250);
    smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
    smtp_command($socket, 'DATA', 354);

    $headers = [
        'From: ' . $fromName . ' <' . $fromEmail . '>',
        'Reply-To: ' . $replyToName . ' <' . $replyToEmail . '>',
        'To: ' . $to,
        'Subject: ' . $subject,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
    ];
    fwrite($socket, implode("\r\n", $headers) . "\r\n\r\n" . dot_stuff($body) . "\r\n.\r\n");
    smtp_command($socket, null, 250);
    smtp_command($socket, 'QUIT', 221);
    fclose($socket);

    return true;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Invalid request method.', 405);
}

$to = 'prashant.upadhyay7080@gmail.com';
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');

if (!preg_match("/^[A-Za-z .'-]{2,70}$/", $name)) {
    respond(false, 'Please enter a valid name.', 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 120) {
    respond(false, 'Please enter a valid email address.', 422);
}

if (strlen($message) < 20 || strlen($message) > 1200) {
    respond(false, 'Message must be between 20 and 1200 characters.', 422);
}

$safeName = str_replace(["\r", "\n"], '', $name);
$safeEmail = str_replace(["\r", "\n"], '', $email);
$subject = 'New portfolio message from ' . $safeName;
$body = "Name: {$safeName}\nEmail: {$safeEmail}\n\nMessage:\n{$message}\n";

$smtpConfig = [];
$smtpConfigFile = __DIR__ . '/mail-config.php';
if (is_file($smtpConfigFile)) {
    $loadedConfig = require $smtpConfigFile;
    if (is_array($loadedConfig)) {
        $smtpConfig = $loadedConfig;
    }
}

try {
    $sent = send_smtp_mail($smtpConfig, $to, $subject, $body, $safeEmail, $safeName);
} catch (Exception $exception) {
    respond(false, 'SMTP Error: ' . $exception->getMessage(), 500);
}

if (!$sent) {
    respond(false, 'Failed to send mail. Please check your credentials.', 500);
}

respond(true, 'Message sent successfully.');

<?php
declare(strict_types=1);

// Replace this placeholder with the SHA-256 digest of the relay token.
const TOKEN_HASH = '__VIBER_RELAY_TOKEN_HASH__';
const SENDER = 'fd@usmalbilder.ch';
const LIMIT = 850000;

function respond(int $status): never {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => $status === 200]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405);
}
$token = $_SERVER['HTTP_X_VIBER_RELAY_TOKEN'] ?? '';
if (!preg_match('/^[a-f0-9]{64}$/D', $token)
    || !hash_equals(TOKEN_HASH, hash('sha256', $token))) {
    respond(401);
}

$raw = file_get_contents('php://input', false, null, 0, LIMIT + 1);
if ($raw === false || strlen($raw) > LIMIT) {
    respond(413);
}
$data = json_decode($raw, true);
$to = $data['to'] ?? null;
$password = $data['password'] ?? null;
$message = $data['message'] ?? null;
$verify = ($data['verify'] ?? false) === true;
if (!is_string($password) || $password === '' || strlen($password) > 1024
    || (!$verify && (!is_string($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)
        || !is_string($message) || $message === ''))) {
    respond(400);
}

$smtp = curl_init('smtps://usmalbilder.ch:465');
curl_setopt_array($smtp, [
    CURLOPT_USERNAME => SENDER,
    CURLOPT_PASSWORD => $password,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 18,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);
if ($verify) {
    curl_setopt($smtp, CURLOPT_CUSTOMREQUEST, 'NOOP');
} else {
    $offset = 0;
    curl_setopt_array($smtp, [
        CURLOPT_MAIL_FROM => '<' . SENDER . '>',
        CURLOPT_MAIL_RCPT => ['<' . $to . '>'],
        CURLOPT_UPLOAD => true,
        CURLOPT_INFILESIZE => strlen($message),
        CURLOPT_READFUNCTION => static function ($handle, $stream, int $length) use ($message, &$offset): string {
            $chunk = substr($message, $offset, $length);
            $offset += strlen($chunk);
            return $chunk;
        },
    ]);
}
$result = curl_exec($smtp);
if ($result === false) {
    error_log('Viber SMTP relay failed with curl code ' . curl_errno($smtp));
    respond(502);
}
respond(200);

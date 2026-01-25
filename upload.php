<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Настройки
$uploadDir = 'uploads/';
$maxFileSize = 100 * 1024 * 1024; // 100MB
$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/jpg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'video/mp4' => 'mp4',
    'video/webm' => 'webm',
    'video/quicktime' => 'mov'
];

// Создаем папку uploads если её нет
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Проверяем метод запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Метод не поддерживается']);
    exit;
}

// Проверяем наличие файла
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Файл не загружен или произошла ошибка']);
    exit;
}

$file = $_FILES['file'];

// Проверяем размер файла
if ($file['size'] > $maxFileSize) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Файл слишком большой. Максимальный размер: 100MB']);
    exit;
}

// Проверяем тип файла
$fileType = mime_content_type($file['tmp_name']);
if (!isset($allowedTypes[$fileType])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Недопустимый тип файла']);
    exit;
}

// Генерируем уникальное имя файла
$extension = $allowedTypes[$fileType];
$filename = uniqid('processed_', true) . '_' . time() . '.' . $extension;
$filepath = $uploadDir . $filename;

// Перемещаем файл
if (move_uploaded_file($file['tmp_name'], $filepath)) {
    // Генерируем URL для скачивания
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST'];
    $downloadUrl = $protocol . $host . '/download.php?file=' . urlencode($filename);
    
    // Записываем информацию о файле в базу или файл
    $fileInfo = [
        'filename' => $filename,
        'original_name' => isset($_POST['filename']) ? $_POST['filename'] : $file['name'],
        'type' => $fileType,
        'size' => $file['size'],
        'upload_time' => time(),
        'expire_time' => time() + (24 * 60 * 60), // 24 часа
        'download_url' => $downloadUrl
    ];
    
    // Сохраняем информацию о файле
    $filesJson = file_exists($uploadDir . 'files.json') ? 
                 json_decode(file_get_contents($uploadDir . 'files.json'), true) : [];
    $filesJson[$filename] = $fileInfo;
    file_put_contents($uploadDir . 'files.json', json_encode($filesJson, JSON_PRETTY_PRINT));
    
    // Запускаем очистку старых файлов
    cleanupOldFiles($uploadDir);
    
    echo json_encode([
        'success' => true,
        'message' => 'Файл успешно загружен',
        'filename' => $filename,
        'downloadUrl' => $downloadUrl,
        'expireTime' => date('Y-m-d H:i:s', $fileInfo['expire_time'])
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Ошибка при сохранении файла']);
}

// Функция для очистки старых файлов
function cleanupOldFiles($uploadDir) {
    $filesJsonPath = $uploadDir . 'files.json';
    
    if (!file_exists($filesJsonPath)) {
        return;
    }
    
    $filesJson = json_decode(file_get_contents($filesJsonPath), true);
    $currentTime = time();
    $updated = false;
    
    foreach ($filesJson as $filename => $fileInfo) {
        if ($fileInfo['expire_time'] < $currentTime) {
            // Удаляем файл
            $filepath = $uploadDir . $filename;
            if (file_exists($filepath)) {
                unlink($filepath);
            }
            
            // Удаляем запись из JSON
            unset($filesJson[$filename]);
            $updated = true;
        }
    }
    
    if ($updated) {
        file_put_contents($filesJsonPath, json_encode($filesJson, JSON_PRETTY_PRINT));
    }
}
?>

<?php
// Настройки
$uploadDir = 'uploads/';

// Проверяем наличие параметра файла
if (!isset($_GET['file'])) {
    http_response_code(400);
    echo 'Не указан файл для скачивания';
    exit;
}

$filename = basename($_GET['file']);
$filepath = $uploadDir . $filename;

// Проверяем существование файла
if (!file_exists($filepath)) {
    http_response_code(404);
    echo 'Файл не найден или был удален';
    exit;
}

// Проверяем JSON с информацией о файлах
$filesJsonPath = $uploadDir . 'files.json';
if (file_exists($filesJsonPath)) {
    $filesJson = json_decode(file_get_contents($filesJsonPath), true);
    
    // Проверяем срок действия файла
    if (isset($filesJson[$filename])) {
        $fileInfo = $filesJson[$filename];
        
        if (time() > $fileInfo['expire_time']) {
            // Удаляем просроченный файл
            unlink($filepath);
            unset($filesJson[$filename]);
            file_put_contents($filesJsonPath, json_encode($filesJson, JSON_PRETTY_PRINT));
            
            http_response_code(410);
            echo 'Файл просрочен и был удален';
            exit;
        }
    }
}

// Определяем MIME-тип файла
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $filepath);
finfo_close($finfo);

// Определяем оригинальное имя файла
$originalName = isset($fileInfo['original_name']) ? $fileInfo['original_name'] : $filename;

// Устанавливаем заголовки для скачивания
header('Content-Type: ' . $mimeType);
header('Content-Disposition: attachment; filename="' . $originalName . '"');
header('Content-Length: ' . filesize($filepath));
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Отправляем файл
readfile($filepath);

// Увеличиваем счетчик скачиваний (опционально)
if (isset($filesJson[$filename])) {
    if (!isset($filesJson[$filename]['downloads'])) {
        $filesJson[$filename]['downloads'] = 0;
    }
    $filesJson[$filename]['downloads']++;
    $filesJson[$filename]['last_download'] = time();
    file_put_contents($filesJsonPath, json_encode($filesJson, JSON_PRETTY_PRINT));
}
?>

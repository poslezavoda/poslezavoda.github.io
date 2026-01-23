// Обработка водяных знаков с поддержкой видео через FFmpeg

// ========== ОБРАБОТКА ИЗОБРАЖЕНИЙ ==========

async function applyWatermarkToImage(imageData, watermark) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { alpha: true });
                
                if (!ctx) {
                    reject(new Error('Canvas context не поддерживается'));
                    return;
                }
                
                // Установить размеры canvas
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Нарисовать исходное изображение
                ctx.drawImage(img, 0, 0);
                
                // Применить водяной знак
                applyWatermarkToContext(ctx, canvas.width, canvas.height, watermark);
                
                // Получить результат
                const quality = parseFloat(document.getElementById('quality')?.value || 0.9);
                const format = getImageFormat(watermark, img);
                
                resolve(canvas.toDataURL(format, quality));
                
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = function() {
            reject(new Error('Не удалось загрузить изображение'));
        };
        
        img.src = imageData;
    });
}

function getImageFormat(watermark, image) {
    // Если водяной знак содержит прозрачность, используем PNG
    if (watermark.type === 'image' && watermark.content.includes('png')) {
        return 'image/png';
    }
    
    // Для текстовых водяных знаков с прозрачностью тоже PNG
    if (watermark.opacity < 100) {
        return 'image/png';
    }
    
    // По умолчанию JPEG для лучшего сжатия
    return 'image/jpeg';
}

function applyWatermarkToContext(ctx, width, height, watermark) {
    // Вычисляем размер водяного знака
    const sizeMultiplier = {
        'small': 0.15,
        'medium': 0.25,
        'large': 0.35
    };
    
    const multiplier = sizeMultiplier[watermark.size] || 0.25;
    const watermarkSize = Math.min(width, height) * multiplier;
    
    // Вычисляем позицию
    const position = calculatePosition(width, height, watermarkSize, watermark.position);
    
    // Устанавливаем непрозрачность
    const opacity = watermark.opacity / 100;
    ctx.globalAlpha = opacity;
    
    if (watermark.type === 'text') {
        // Текстовый водяной знак
        drawTextWatermark(ctx, position.x, position.y, watermarkSize, watermark);
    } else {
        // Графический водяной знак
        drawImageWatermark(ctx, position.x, position.y, watermarkSize, watermark);
    }
    
    // Восстанавливаем непрозрачность
    ctx.globalAlpha = 1;
}

function calculatePosition(width, height, watermarkSize, positionKey) {
    const padding = Math.min(width, height) * 0.02;
    
    const positions = {
        'top-left': { x: padding, y: padding },
        'top-right': { x: width - watermarkSize - padding, y: padding },
        'bottom-left': { x: padding, y: height - watermarkSize - padding },
        'bottom-right': { x: width - watermarkSize - padding, y: height - watermarkSize - padding },
        'center': { 
            x: (width - watermarkSize) / 2, 
            y: (height - watermarkSize) / 2 
        }
    };
    
    return positions[positionKey] || positions['bottom-right'];
}

function drawTextWatermark(ctx, x, y, size, watermark) {
    const text = watermark.content;
    const fontSize = size * 0.4;
    
    // Создаем градиент для лучшей видимости
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(200, 200, 200, 0.7)');
    
    // Устанавливаем стиль текста
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = gradient;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Добавляем тень для лучшей читаемости
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Рисуем текст
    ctx.fillText(text, x + size / 2, y + size / 2);
    
    // Сбрасываем тень
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Добавляем обводку для контраста
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeText(text, x + size / 2, y + size / 2);
}

function drawImageWatermark(ctx, x, y, size, watermark) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            // Рисуем изображение водяного знака
            ctx.drawImage(img, x, y, size, size);
            resolve();
        };
        
        img.onerror = function() {
            console.error('Не удалось загрузить изображение водяного знака');
            // Если не удалось, рисуем текстовый fallback
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(x, y, size, size);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('WM', x + size/2 - 10, y + size/2 + 5);
            resolve();
        };
        
        img.src = watermark.content;
    });
}

// ========== ОБРАБОТКА ВИДЕО С FFMPEG ==========

async function applyWatermarkToVideoWithFFmpeg(videoFile, watermark) {
    console.log('Начинаем обработку видео:', videoFile.name);
    
    if (!window.ffmpeg || !window.ffmpeg.isLoaded()) {
        throw new Error('FFmpeg не инициализирован');
    }
    
    const ffmpeg = window.ffmpeg;
    
    try {
        // 1. Подготовить водяной знак (создать PNG файл)
        const watermarkImage = await createWatermarkImageForVideo(watermark, 200, 100);
        ffmpeg.FS('writeFile', 'watermark.png', watermarkImage);
        
        // 2. Записать видеофайл в память FFmpeg
        const videoData = await readFileAsArrayBuffer(videoFile);
        ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoData));
        
        // 3. Определить параметры видео
        const videoInfo = await getVideoInfo(videoFile);
        console.log('Информация о видео:', videoInfo);
        
        // 4. Подготовить команду FFmpeg
        const position = getFFmpegPosition(watermark.position);
        const scale = getFFmpegScale(watermark.size);
        const opacity = (watermark.opacity / 100).toFixed(2);
        
        // Команда для наложения водяного знака
        const filter = `[0:v][1:v]overlay=${position}:format=auto:enable='between(t,0,${videoInfo.duration})':alpha=${opacity}[v]`;
        
        console.log('Запускаем FFmpeg с фильтром:', filter);
        
        // 5. Выполнить команду
        await ffmpeg.run(
            '-i', 'input.mp4',
            '-i', 'watermark.png',
            '-filter_complex', filter,
            '-map', '[v]',
            '-map', '0:a?', // Если есть аудио
            '-c:v', 'libx264',
            '-crf', '23',
            '-preset', 'fast',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y', // Перезаписать файл
            'output.mp4'
        );
        
        // 6. Прочитать результат
        const data = ffmpeg.FS('readFile', 'output.mp4');
        
        // 7. Очистить файлы из памяти
        cleanupFFmpegFiles(['input.mp4', 'watermark.png', 'output.mp4']);
        
        // 8. Создать DataURL для скачивания
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        return URL.createObjectURL(blob);
        
    } catch (error) {
        console.error('Ошибка FFmpeg:', error);
        
        // Очистка в случае ошибки
        cleanupFFmpegFiles(['input.mp4', 'watermark.png', 'output.mp4']);
        
        // Упрощенная обработка (только первый кадр)
        console.log('Пробуем упрощенную обработку...');
        return await applySimpleVideoWatermark(videoFile, watermark);
    }
}

async function createWatermarkImageForVideo(watermark, width, height) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        // Прозрачный фон
        ctx.clearRect(0, 0, width, height);
        
        if (watermark.type === 'text') {
            // Текстовый водяной знак
            ctx.font = `bold ${height * 0.6}px Arial`;
            ctx.fillStyle = `rgba(255, 255, 255, ${watermark.opacity / 100})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(watermark.content, width / 2, height / 2);
        } else {
            // Изображение водяного знака
            const img = new Image();
            img.onload = function() {
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                    blob.arrayBuffer().then(resolve);
                }, 'image/png');
            };
            img.src = watermark.content;
            return;
        }
        
        // Конвертируем в PNG
        canvas.toBlob(blob => {
            blob.arrayBuffer().then(resolve);
        }, 'image/png');
    });
}

async function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function getVideoInfo(videoFile) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = function() {
            resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                aspectRatio: video.videoWidth / video.videoHeight
            });
        };
        
        video.onerror = function() {
            resolve({
                duration: 10,
                width: 1280,
                height: 720,
                aspectRatio: 16/9
            });
        };
        
        video.src = URL.createObjectURL(videoFile);
    });
}

function getFFmpegPosition(positionKey) {
    const positions = {
        'top-left': '10:10',
        'top-right': 'main_w-overlay_w-10:10',
        'bottom-left': '10:main_h-overlay_h-10',
        'bottom-right': 'main_w-overlay_w-10:main_h-overlay_h-10',
        'center': '(main_w-overlay_w)/2:(main_h-overlay_h)/2'
    };
    
    return positions[positionKey] || positions['bottom-right'];
}

function getFFmpegScale(sizeKey) {
    const scales = {
        'small': 'iw*0.1:-1',
        'medium': 'iw*0.2:-1',
        'large': 'iw*0.3:-1'
    };
    
    return scales[sizeKey] || scales['medium'];
}

function cleanupFFmpegFiles(filenames) {
    const ffmpeg = window.ffmpeg;
    if (ffmpeg) {
        filenames.forEach(filename => {
            try {
                ffmpeg.FS('unlink', filename);
            } catch (e) {
                // Игнорируем ошибки удаления
            }
        });
    }
}

// ========== УПРОЩЕННАЯ ОБРАБОТКА ВИДЕО (запасной вариант) ==========

async function applySimpleVideoWatermark(videoFile, watermark) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.controls = false;
        video.muted = true;
        video.playsInline = true;
        
        video.onloadeddata = async function() {
            try {
                // Создаем canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Устанавливаем размеры
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Рисуем первый кадр с водяным знаком
                ctx.drawImage(video, 0, 0);
                applyWatermarkToContext(ctx, canvas.width, canvas.height, watermark);
                
                // Конвертируем в видео (статичное изображение)
                const imageData = canvas.toDataURL('image/jpeg', 0.9);
                
                // Создаем короткое видео из изображения
                const result = await createVideoFromImage(imageData, 3); // 3 секунды
                resolve(result);
                
            } catch (error) {
                reject(error);
            } finally {
                URL.revokeObjectURL(video.src);
            }
        };
        
        video.onerror = function() {
            reject(new Error('Не удалось загрузить видео'));
            URL.revokeObjectURL(video.src);
        };
        
        video.src = URL.createObjectURL(videoFile);
        video.load();
    });
}

async function createVideoFromImage(imageData, duration = 3) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Создаем MediaRecorder для записи видео
            const stream = canvas.captureStream(25); // 25 FPS
            
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            const chunks = [];
            
            mediaRecorder.ondataavailable = function(e) {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };
            
            mediaRecorder.onstop = function() {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                resolve(url);
            };
            
            mediaRecorder.onerror = function(e) {
                reject(new Error('Ошибка записи видео: ' + e.error));
            };
            
            // Начинаем запись
            mediaRecorder.start();
            
            // Рисуем изображение на canvas
            ctx.drawImage(img, 0, 0);
            
            // Записываем указанное количество времени
            setTimeout(() => {
                mediaRecorder.stop();
                stream.getTracks().forEach(track => track.stop());
            }, duration * 1000);
        };
        
        img.onerror = function() {
            reject(new Error('Не удалось загрузить изображение'));
        };
        
        img.src = imageData;
    });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function createDataURLFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Экспорт функций
window.watermarkProcessor = {
    applyWatermarkToImage,
    applyWatermarkToVideoWithFFmpeg,
    applySimpleVideoWatermark
};
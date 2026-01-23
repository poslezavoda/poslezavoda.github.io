// Обработка водяных знаков на стороне клиента

async function applyWatermarkToFile(file, fileData, watermark) {
    if (file.type.startsWith('image/')) {
        return await applyWatermarkToImage(fileData, watermark);
    } else if (file.type.startsWith('video/')) {
        return await applyWatermarkToVideo(file, fileData, watermark);
    } else {
        throw new Error('Неподдерживаемый формат файла');
    }
}

async function applyWatermarkToImage(imageData, watermark) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Установить размеры canvas
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Нарисовать исходное изображение
            ctx.drawImage(img, 0, 0);
            
            // Применить водяной знак
            applyWatermarkToCanvas(ctx, canvas.width, canvas.height, watermark);
            
            // Получить результат
            const quality = parseFloat(document.getElementById('quality').value);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = imageData;
    });
}

function applyWatermarkToCanvas(ctx, width, height, watermark) {
    // Вычисляем размер водяного знака
    let watermarkSize;
    switch (watermark.size) {
        case 'small':
            watermarkSize = Math.min(width, height) * 0.1;
            break;
        case 'medium':
            watermarkSize = Math.min(width, height) * 0.2;
            break;
        case 'large':
            watermarkSize = Math.min(width, height) * 0.3;
            break;
        default:
            watermarkSize = Math.min(width, height) * 0.2;
    }
    
    // Вычисляем позицию
    let x, y;
    const padding = 20;
    
    switch (watermark.position) {
        case 'top-left':
            x = padding;
            y = padding;
            break;
        case 'top-right':
            x = width - watermarkSize - padding;
            y = padding;
            break;
        case 'center':
            x = (width - watermarkSize) / 2;
            y = (height - watermarkSize) / 2;
            break;
        case 'bottom-left':
            x = padding;
            y = height - watermarkSize - padding;
            break;
        case 'bottom-right':
            x = width - watermarkSize - padding;
            y = height - watermarkSize - padding;
            break;
        default:
            x = width - watermarkSize - padding;
            y = height - watermarkSize - padding;
    }
    
    // Устанавливаем непрозрачность
    ctx.globalAlpha = watermark.opacity / 100;
    
    if (watermark.type === 'text') {
        // Текстовый водяной знак
        ctx.font = `bold ${watermarkSize / 2}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(watermark.content, x + watermarkSize / 2, y + watermarkSize / 2);
    } else {
        // Графический водяной знак
        const watermarkImg = new Image();
        watermarkImg.onload = function() {
            ctx.drawImage(watermarkImg, x, y, watermarkSize, watermarkSize);
        };
        watermarkImg.src = watermark.content;
    }
    
    // Восстанавливаем непрозрачность
    ctx.globalAlpha = 1;
}

async function applyWatermarkToVideo(file, videoData, watermark) {
    // Для видео обработка сложнее, можно использовать библиотеку или упрощенный подход
    // В данном примере - упрощенный подход через canvas (только первый кадр)
    
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.onloadeddata = function() {
            // Создаем canvas для захвата кадра
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Рисуем первый кадр
            ctx.drawImage(video, 0, 0);
            
            // Применяем водяной знак
            applyWatermarkToCanvas(ctx, canvas.width, canvas.height, watermark);
            
            // Возвращаем изображение (для демо)
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        video.onerror = reject;
        video.src = URL.createObjectURL(file);
    });
}
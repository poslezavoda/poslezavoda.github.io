// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние приложения
let appState = {
    watermarks: JSON.parse(localStorage.getItem('watermarks') || '[]'),
    currentWatermark: null,
    mediaFiles: []
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadWatermarks();
});

function initializeApp() {
    // Настройка кнопки закрытия
    document.getElementById('closeApp').addEventListener('click', () => {
        tg.close();
    });

    // Переключение типа водяного знака
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const type = this.dataset.type;
            document.getElementById('textSection').style.display = type === 'text' ? 'block' : 'none';
            document.getElementById('imageSection').style.display = type === 'image' ? 'block' : 'none';
        });
    });

    // Выбор позиции
    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Загрузка изображения водяного знака
    document.getElementById('watermarkImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.getElementById('imagePreview');
                preview.innerHTML = `<img src="${event.target.result}" style="max-width: 200px; margin-top: 10px; border-radius: 8px;">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Загрузка медиа файлов
    document.getElementById('mediaInput').addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        appState.mediaFiles = files;
        updateMediaPreview();
    });

    // Слайдер непрозрачности
    document.getElementById('opacity').addEventListener('input', function() {
        document.getElementById('opacityValue').textContent = `${this.value}%`;
    });
}

function showSection(sectionId) {
    // Скрыть все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показать нужную секцию
    document.getElementById(sectionId).classList.add('active');
}

function saveWatermark() {
    const type = document.querySelector('.toggle-btn.active').dataset.type;
    const size = document.getElementById('watermarkSize').value;
    const position = document.querySelector('.position-btn.active').dataset.position;
    const opacity = parseInt(document.getElementById('opacity').value);
    
    let content, name;
    
    if (type === 'text') {
        const text = document.getElementById('watermarkText').value.trim();
        if (!text) {
            showAlert('Введите текст водяного знака', 'error');
            return;
        }
        content = text;
        name = `Текст: ${text.substring(0, 20)}`;
    } else {
        const fileInput = document.getElementById('watermarkImage');
        if (!fileInput.files[0]) {
            showAlert('Выберите изображение', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(event) {
            content = event.target.result;
            name = `Изображение`;
            saveWatermarkToStorage(type, content, name, size, position, opacity);
        };
        reader.readAsDataURL(fileInput.files[0]);
        return;
    }
    
    saveWatermarkToStorage(type, content, name, size, position, opacity);
}

function saveWatermarkToStorage(type, content, name, size, position, opacity) {
    const watermark = {
        id: Date.now(),
        type,
        content,
        name,
        size,
        position,
        opacity,
        created: new Date().toISOString()
    };
    
    appState.watermarks.unshift(watermark);
    localStorage.setItem('watermarks', JSON.stringify(appState.watermarks));
    
    showAlert('Водяной знак сохранен!', 'success');
    showSection('mainMenu');
    loadWatermarks();
}

function loadWatermarks() {
    const select = document.getElementById('selectWatermark');
    const list = document.getElementById('watermarksList');
    
    // Очистка списков
    select.innerHTML = '<option value="">-- Выберите --</option>';
    list.innerHTML = '';
    
    if (appState.watermarks.length === 0) {
        list.innerHTML = '<div class="alert alert-info">Нет сохраненных водяных знаков</div>';
        return;
    }
    
    appState.watermarks.forEach(watermark => {
        // Добавить в выпадающий список
        const option = document.createElement('option');
        option.value = watermark.id;
        option.textContent = watermark.name;
        select.appendChild(option);
        
        // Добавить в список водяных знаков
        const item = document.createElement('div');
        item.className = 'watermark-item';
        item.innerHTML = `
            <div class="watermark-info">
                <strong>${watermark.name}</strong>
                <div style="font-size: 12px; color: #666;">
                    ${watermark.type === 'text' ? '✏️ Текст' : '🖼️ Изображение'} | 
                    ${watermark.size} | ${watermark.position}
                </div>
            </div>
            <div class="watermark-actions">
                <button class="action-btn" onclick="editWatermark(${watermark.id})">✏️</button>
                <button class="action-btn" onclick="deleteWatermark(${watermark.id})">🗑️</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function previewWatermark() {
    const watermarkId = parseInt(document.getElementById('selectWatermark').value);
    if (!watermarkId) return;
    
    const watermark = appState.watermarks.find(w => w.id === watermarkId);
    if (!watermark) return;
    
    appState.currentWatermark = watermark;
    // Здесь можно добавить превью водяного знака на canvas
}

function updateMediaPreview() {
    const preview = document.getElementById('mediaPreview');
    preview.innerHTML = '';
    
    appState.mediaFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const item = document.createElement('div');
            item.className = 'media-preview-item';
            item.innerHTML = `
                <img src="${event.target.result}" alt="${file.name}">
                <div class="media-info">
                    <div class="media-name">${file.name}</div>
                    <div class="media-size">${formatFileSize(file.size)}</div>
                </div>
                <button class="action-btn" onclick="removeMediaFile(${index})">🗑️</button>
            `;
            preview.appendChild(item);
        };
        
        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            // Для видео можно показать иконку
            const item = document.createElement('div');
            item.className = 'media-preview-item';
            item.innerHTML = `
                <div style="width: 60px; height: 60px; background: #007aff; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">
                    📹
                </div>
                <div class="media-info">
                    <div class="media-name">${file.name}</div>
                    <div class="media-size">${formatFileSize(file.size)}</div>
                </div>
                <button class="action-btn" onclick="removeMediaFile(${index})">🗑️</button>
            `;
            preview.appendChild(item);
        }
    });
}

function removeMediaFile(index) {
    appState.mediaFiles.splice(index, 1);
    updateMediaPreview();
}

function processMedia() {
    if (!appState.currentWatermark) {
        showAlert('Выберите водяной знак', 'error');
        return;
    }
    
    if (appState.mediaFiles.length === 0) {
        showAlert('Выберите медиафайлы', 'error');
        return;
    }
    
    // Показать индикатор прогресса
    const progressContainer = document.querySelector('.progress-container');
    const progressFill = document.querySelector('.progress-fill');
    const progressPercent = document.querySelector('.progress-percent');
    const processBtn = document.getElementById('processBtn');
    
    progressContainer.style.display = 'block';
    processBtn.disabled = true;
    
    // Обработка файлов
    let processedCount = 0;
    
    appState.mediaFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const result = await applyWatermarkToFile(file, event.target.result, appState.currentWatermark);
                
                // Скачать файл пользователю
                downloadFile(result, file.name);
                
                processedCount++;
                const progress = (processedCount / appState.mediaFiles.length) * 100;
                progressFill.style.width = `${progress}%`;
                progressPercent.textContent = `${Math.round(progress)}%`;
                
                if (processedCount === appState.mediaFiles.length) {
                    showAlert('Обработка завершена!', 'success');
                    setTimeout(() => {
                        progressContainer.style.display = 'none';
                        processBtn.disabled = false;
                    }, 2000);
                }
            } catch (error) {
                console.error('Ошибка обработки:', error);
                showAlert(`Ошибка обработки ${file.name}`, 'error');
            }
        };
        
        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            // Для видео используется другой подход
            reader.readAsArrayBuffer(file);
        }
    });
}

function downloadFile(dataUrl, originalName) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `watermarked_${originalName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showAlert(message, type) {
    // Удалить старые алерты
    document.querySelectorAll('.alert').forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <div style="font-size: 20px;">
            ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
        </div>
        <div>${message}</div>
    `;
    
    document.getElementById('appContent').prepend(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

function editWatermark(id) {
    const watermark = appState.watermarks.find(w => w.id === id);
    if (!watermark) return;
    
    showSection('createWatermark');
    
    // Заполнить форму данными водяного знака
    document.querySelector(`.toggle-btn[data-type="${watermark.type}"]`).click();
    
    if (watermark.type === 'text') {
        document.getElementById('watermarkText').value = watermark.content;
    } else {
        // Для изображения нужно загрузить его в preview
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${watermark.content}" style="max-width: 200px; margin-top: 10px; border-radius: 8px;">`;
    }
    
    document.getElementById('watermarkSize').value = watermark.size;
    document.querySelector(`.position-btn[data-position="${watermark.position}"]`).click();
    document.getElementById('opacity').value = watermark.opacity;
    document.getElementById('opacityValue').textContent = `${watermark.opacity}%`;
    
    // Обновить функцию сохранения для редактирования
    const saveBtn = document.querySelector('#createWatermark .btn-primary');
    saveBtn.onclick = function() {
        updateWatermark(id);
    };
}

function updateWatermark(id) {
    // Аналогично saveWatermark, но обновляет существующий
    // Реализация похожа на saveWatermark, но с поиском и обновлением
}

function deleteWatermark(id) {
    if (confirm('Удалить этот водяной знак?')) {
        appState.watermarks = appState.watermarks.filter(w => w.id !== id);
        localStorage.setItem('watermarks', JSON.stringify(appState.watermarks));
        loadWatermarks();
        showAlert('Водяной знак удален', 'success');
    }
}
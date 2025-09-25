// material_practice.js

class MaterialPractice {
    constructor() {
        this.uploadedFile = null;
        this.isFileUploaded = false;
        this.chatHistory = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupDragAndDrop();
        this.loadSuggestions();
    }

    bindEvents() {
        // 檔案選擇
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // 移除檔案
        document.getElementById('removeFileBtn').addEventListener('click', () => {
            this.removeFile();
        });

        // 發送訊息
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter 鍵發送
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 建議問題點擊
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-btn')) {
                const question = e.target.textContent;
                document.getElementById('messageInput').value = question;
                this.sendMessage();
            }
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });

        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async handleFileSelect(file) {
        if (!file) return;

        // 檢查檔案類型
        const allowedTypes = ['application/pdf', 'text/plain', 'text/csv'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|csv)$/i)) {
            this.showError('請選擇 PDF、TXT 或 CSV 格式的檔案');
            return;
        }

        // 檢查檔案大小 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('檔案大小不能超過 10MB');
            return;
        }

        this.showLoading(true);

        try {
            // 上傳檔案
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/material_practice/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.uploadedFile = file;
                this.isFileUploaded = true;
                this.showUploadSuccess(file.name);
                this.enableChat();
                this.addBotMessage(`檔案「${file.name}」上傳成功！現在您可以針對教材內容提出問題了。`);
                this.showSuggestions();
            } else {
                this.showError(result.message || '檔案上傳失敗');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('檔案上傳過程中發生錯誤');
        } finally {
            this.showLoading(false);
        }
    }

    showUploadSuccess(fileName) {
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('uploadStatus').style.display = 'block';
        document.getElementById('uploadedFileName').textContent = fileName;
    }

    removeFile() {
        this.uploadedFile = null;
        this.isFileUploaded = false;
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('uploadStatus').style.display = 'none';
        document.getElementById('fileInput').value = '';
        this.disableChat();
        this.hideSuggestions();
        this.addBotMessage('檔案已移除，請重新上傳教材檔案。');
    }

    enableChat() {
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('messageInput').placeholder = '請輸入您的問題...';
        this.updateChatStatus('準備就緒', 'success');
    }

    disableChat() {
        document.getElementById('messageInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('messageInput').placeholder = '請先上傳教材檔案...';
        this.updateChatStatus('等待檔案上傳', 'warning');
    }

    updateChatStatus(text, type) {
        const statusElement = document.getElementById('chatStatus');
        const iconClass = type === 'success' ? 'text-success' : 
                         type === 'warning' ? 'text-warning' : 'text-danger';
        statusElement.innerHTML = `<i class="fas fa-circle ${iconClass}"></i> ${text}`;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();

        if (!message || !this.isFileUploaded) return;

        // 添加用戶訊息
        this.addUserMessage(message);
        input.value = '';

        // 顯示載入狀態
        this.updateChatStatus('AI 思考中...', 'warning');
        this.showLoading(true);

        try {
            const response = await fetch('/api/material_practice/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: message
                })
            });

            const result = await response.json();

            if (result.success) {
                this.addBotMessage(result.answer);
            } else {
                this.addBotMessage('抱歉，處理您的問題時發生錯誤，請稍後再試。');
            }
        } catch (error) {
            console.error('Ask error:', error);
            this.addBotMessage('網路連線錯誤，請檢查網路連線後重試。');
        } finally {
            this.showLoading(false);
            this.updateChatStatus('準備就緒', 'success');
        }
    }

    addUserMessage(message) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = this.createMessageElement(message, 'user');
        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    addBotMessage(message) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = this.createMessageElement(message, 'bot');
        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    createMessageElement(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const content = document.createElement('div');
        content.className = 'message-content';
        
        const messageText = document.createElement('p');
        messageText.textContent = message;
        content.appendChild(messageText);

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        content.appendChild(time);

        return messageDiv;
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    loadSuggestions() {
        const suggestions = [
            "這份教材的主要內容是什麼？",
            "請幫我總結重點概念",
            "有哪些重要的單字或詞彙？",
            "請解釋這個概念的含義",
            "這個主題有什麼實際應用？",
            "請給我一些練習題目",
            "如何更好地理解這個內容？",
            "相關的延伸學習資源有哪些？"
        ];

        const container = document.getElementById('suggestionsContainer');
        container.innerHTML = '';

        suggestions.forEach(suggestion => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.textContent = suggestion;
            container.appendChild(btn);
        });
    }

    showSuggestions() {
        document.getElementById('suggestionsSection').style.display = 'block';
    }

    hideSuggestions() {
        document.getElementById('suggestionsSection').style.display = 'none';
    }

    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        // 可以使用 toast 或 alert 顯示錯誤
        alert(message);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new MaterialPractice();
});
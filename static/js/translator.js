const americanAccent = document.getElementById('americanAccent');
const britishAccent = document.getElementById('britishAccent');

americanAccent.addEventListener('click', () => {
    americanAccent.classList.add('active');
    britishAccent.classList.remove('active');
    fetch('/update-accent?accent=us')
        .then(response => response.json())
        .then(data => {
            console.log('口音美式');
        });
});

britishAccent.addEventListener('click', () => {
    britishAccent.classList.add('active');
    americanAccent.classList.remove('active');
    fetch('/update-accent?accent=co.uk')
        .then(response => response.json())
        .then(data => {
            console.log('口音英式');
        });
});

const form = document.getElementById('translate-form');
const loading = document.getElementById('loading');
const loadingMessage = document.getElementById('loading-message');
const resultContainer = document.getElementById('result-container');
const wordInput = document.getElementById('word-input');
const translateBtn = document.getElementById('translate-btn');

let currentSessionId = null;
let pollInterval = null;

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const word = wordInput.value.trim();
    if (!word) return;
    
    // 開始翻譯
    await startTranslation(word);
});

async function startTranslation(word) {
    try {
        // 顯示載入動畫
        loading.style.display = 'block';
        loadingMessage.textContent = '正在處理翻譯請求...';
        resultContainer.style.display = 'none';
        translateBtn.disabled = true;
        
        // 發送翻譯請求
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ word: word })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentSessionId = data.session_id;
            loadingMessage.textContent = '翻譯處理中，請稍候...';
            
            // 開始輪詢翻譯狀態
            startPolling();
        } else {
            throw new Error(data.error || '翻譯請求失敗');
        }
        
    } catch (error) {
        console.error('翻譯錯誤:', error);
        showError('翻譯請求失敗，請稍後再試');
    }
}

function startPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    
    pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/translation_status/${currentSessionId}`);
            const data = await response.json();
            
            if (response.ok) {
                if (data.status === 'completed') {
                    clearInterval(pollInterval);
                    showTranslationResult(data);
                } else if (data.status === 'failed') {
                    clearInterval(pollInterval);
                    showError('翻譯失敗，請稍後再試');
                } else if (data.status === 'processing') {
                    loadingMessage.textContent = 'AI正在分析單字，請稍候...';
                }
            } else {
                clearInterval(pollInterval);
                showError('獲取翻譯狀態失敗');
            }
        } catch (error) {
            console.error('輪詢錯誤:', error);
            clearInterval(pollInterval);
            showError('網路連接錯誤');
        }
    }, 2000); // 每2秒檢查一次
}

function showTranslationResult(data) {
    loading.style.display = 'none';
    translateBtn.disabled = false;
    
    // 生成翻譯結果HTML
    const resultHTML = generateResultHTML(data);
    resultContainer.innerHTML = resultHTML;
    resultContainer.style.display = 'block';
    
    // 重新初始化音訊控制
    initializeAudioControls();
}

function generateResultHTML(data) {
    const { word, translation, explanation, examples } = data;
    
    // 處理翻譯內容
    const translationLines = translation.split('\n').filter(line => line.trim());
    const translationHTML = translationLines.map(line => {
        if (/^\d+\./.test(line.trim())) {
            const [number, ...textParts] = line.split('.');
            return `
                <div class="translation-item">
                    <div class="translation-number">${number}</div>
                    <div class="translation-text">${textParts.join('.').trim()}</div>
                </div>
            `;
        } else {
            return `
                <div class="translation-item">
                    <div class="translation-text">${line}</div>
                </div>
            `;
        }
    }).join('');
    
    // 處理相關詞語
    const explanationLines = explanation.split('\n').filter(line => line.trim());
    const explanationHTML = explanationLines.map(line => {
        if (line.startsWith('- ')) {
            return `
                <div class="explanation-item">
                    <div class="explanation-bullet"><i class="fas fa-circle"></i></div>
                    <div class="explanation-text">${line.substring(2)}</div>
                </div>
            `;
        } else if (/^\d+\./.test(line.trim())) {
            const [number, ...textParts] = line.split('.');
            return `
                <div class="explanation-item">
                    <div class="explanation-number">${number}</div>
                    <div class="explanation-text">${textParts.join('.').trim()}</div>
                </div>
            `;
        } else {
            return `
                <div class="explanation-item">
                    <div class="explanation-text full-width">${line}</div>
                </div>
            `;
        }
    }).join('');
    
    // 處理例句
    const exampleLines = examples.split('\n').filter(line => line.trim());
    
    // 更智能的例句解析
    function parseExamples(lines) {
        const examples = [];
        let currentExample = { sentence: '', translation: '' };
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 跳過空行
            if (!line) continue;
            
            // 檢查是否為翻譯行（以"翻譯:"開頭）
            if (line.startsWith('翻譯:') || line.startsWith('翻译:')) {
                currentExample.translation = line.replace(/^翻譯:|^翻译:/, '').trim();
                if (currentExample.sentence) {
                    examples.push({ ...currentExample });
                    currentExample = { sentence: '', translation: '' };
                }
            }
            // 檢查是否為中文翻譯（不包含英文字母或包含中文字符）
            else if (/[\u4e00-\u9fff]/.test(line) && !/[a-zA-Z]/.test(line)) {
                currentExample.translation = line;
                if (currentExample.sentence) {
                    examples.push({ ...currentExample });
                    currentExample = { sentence: '', translation: '' };
                }
            }
            // 否則視為英文例句
            else if (/[a-zA-Z]/.test(line)) {
                // 如果當前例句已有內容，先保存
                if (currentExample.sentence && currentExample.translation) {
                    examples.push({ ...currentExample });
                    currentExample = { sentence: '', translation: '' };
                }
                currentExample.sentence = line;
            }
        }
        
        // 處理最後一個例句
        if (currentExample.sentence && currentExample.translation) {
            examples.push(currentExample);
        }
        
        return examples;
    }
    
    const parsedExamples = parseExamples(exampleLines);
    
    // 驗證和後備機制
    function validateExample(example) {
        if (!example.sentence || !example.translation) {
            return false;
        }
        // 檢查是否有重複內容
        if (example.sentence === example.translation) {
            return false;
        }
        // 檢查英文例句是否包含英文字母
        if (!/[a-zA-Z]/.test(example.sentence)) {
            return false;
        }
        return true;
    }
    
    let example1 = parsedExamples[0];
    let example2 = parsedExamples[1];
    
    // 如果第一個例句無效，使用預設例句
    if (!validateExample(example1)) {
        example1 = {
            sentence: `This is an example sentence with the word "${word}".`,
            translation: `這是一個包含單字「${word}」的範例句子。`
        };
    }
    
    // 如果第二個例句無效，使用預設例句
    if (!validateExample(example2)) {
        example2 = {
            sentence: `Please use "${word}" in your daily conversation.`,
            translation: `請在日常對話中使用「${word}」這個單字。`
        };
    }
    
    return `
        <div class="result-card">
            <h3><i class="fas fa-language"></i> 中文翻譯</h3>
            <div class="translation-content">
                ${translationHTML}
            </div>
            <div class="audio-container">
                <audio controls>
                    <source src="/play-word-audio?word=${encodeURIComponent(word)}" type="audio/mpeg">
                    您的瀏覽器不支援音訊播放。
                </audio>
            </div>
        </div>

        <div class="result-card">
            <h3><i class="fas fa-book"></i> 相關詞語</h3>
            <div class="explanation-content">
                ${explanationHTML}
            </div>
        </div>

        <div class="result-card">
            <h3><i class="fas fa-quote-right"></i> 單字例句</h3>
            <div class="examples-grid">
                <div class="example">
                    <div class="example-header">
                        <i class="fas fa-quote-left"></i>
                        <span class="example-number">例句 1</span>
                    </div>
                    <p class="sentence">${example1.sentence}</p>
                    <p class="translation">${example1.translation}</p>
                    <div class="audio-container">
                        <audio controls>
                            <source src="/play-word-audio?word=${encodeURIComponent(example1.sentence)}" type="audio/mpeg">
                            您的瀏覽器不支援音訊播放。
                        </audio>
                    </div>
                </div>
                <div class="example">
                    <div class="example-header">
                        <i class="fas fa-quote-left"></i>
                        <span class="example-number">例句 2</span>
                    </div>
                    <p class="sentence">${example2.sentence}</p>
                    <p class="translation">${example2.translation}</p>
                    <div class="audio-container">
                        <audio controls>
                            <source src="/play-word-audio?word=${encodeURIComponent(example2.sentence)}" type="audio/mpeg">
                            您的瀏覽器不支援音訊播放。
                        </audio>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showError(message) {
    loading.style.display = 'none';
    translateBtn.disabled = false;
    
    resultContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-triangle"></i> ${message}
        </div>
    `;
    resultContainer.style.display = 'block';
}

function initializeAudioControls() {
    const audioElements = document.querySelectorAll('#result-container audio');
    audioElements.forEach(audio => {
        audio.addEventListener('play', function() {
            // 暫停其他正在播放的音訊
            audioElements.forEach(otherAudio => {
                if (otherAudio !== audio && !otherAudio.paused) {
                    otherAudio.pause();
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // 導航欄滾動效果
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    });

    // 主題切換功能
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    // 檢查本地存儲中的主題設置
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        body.classList.toggle('dark-mode', currentTheme === 'dark');
        if (themeToggle) {
            themeToggle.checked = currentTheme === 'dark';
        }
    }

    // 主題切換事件監聽
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            body.classList.toggle('dark-mode');
            localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
    }

    // 載入動畫
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1000);
    }

    // 口音切換功能
    const accentOptions = document.querySelectorAll('.accent-option');
    accentOptions.forEach(option => {
        option.addEventListener('click', function() {
            accentOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 翻譯表單提交處理
    const translationForm = document.getElementById('translation-form');
    if (translationForm) {
        translationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const loadingSpinner = document.querySelector('.loading-spinner');
            const resultContainer = document.querySelector('.result-container');

            // 顯示載入動畫
            if (loadingSpinner) {
                loadingSpinner.style.display = 'block';
            }
            if (resultContainer) {
                resultContainer.style.opacity = '0.5';
            }

            // 在這裡添加您的翻譯邏輯
            // ...

            // 模擬載入完成（實際應用中移除此延遲）
            setTimeout(() => {
                if (loadingSpinner) {
                    loadingSpinner.style.display = 'none';
                }
                if (resultContainer) {
                    resultContainer.style.opacity = '1';
                }
            }, 1500);
        });
    }

    // 音訊播放器自定義控制
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.addEventListener('play', function() {
            // 暫停其他正在播放的音訊
            audioElements.forEach(otherAudio => {
                if (otherAudio !== audio && !otherAudio.paused) {
                    otherAudio.pause();
                }
            });
        });
    });
});
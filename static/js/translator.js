// translator.js - Independent accent switching logic

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('translate-form');
    const loading = document.getElementById('loading');
    const loadingMessage = document.getElementById('loading-message');
    const resultContainer = document.getElementById('result-container');
    const wordInput = document.getElementById('word-input');
    const translateBtn = document.getElementById('translate-btn');

    // --- Local State for Translator Accent ---
    let translatorAccent = 'us'; // 'us' or 'co.uk'
    // -----------------------------------------

    let currentSessionId = null;
    let pollInterval = null;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const word = wordInput.value.trim();
        if (!word) return;
        await startTranslation(word);
    });

    // --- Accent Switcher Logic ---
    const americanAccentBtn = document.getElementById('americanAccent');
    const britishAccentBtn = document.getElementById('britishAccent');

    if (americanAccentBtn && britishAccentBtn) {
        americanAccentBtn.addEventListener('click', () => {
            if (translatorAccent === 'us') return; // Do nothing if already active
            translatorAccent = 'us';
            americanAccentBtn.classList.add('active');
            britishAccentBtn.classList.remove('active');
            reloadAllAudioSources();
        });

        britishAccentBtn.addEventListener('click', () => {
            if (translatorAccent === 'co.uk') return; // Do nothing if already active
            translatorAccent = 'co.uk';
            britishAccentBtn.classList.add('active');
            americanAccentBtn.classList.remove('active');
            reloadAllAudioSources();
        });
    }
    // ----------------------------

    async function startTranslation(word) {
        try {
            loading.style.display = 'block';
            loadingMessage.textContent = '正在處理翻譯請求...';
            resultContainer.style.display = 'none';
            translateBtn.disabled = true;
            
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: word })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                currentSessionId = data.session_id;
                loadingMessage.textContent = '翻譯處理中，請稍候...';
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
        if (pollInterval) clearInterval(pollInterval);
        
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
        }, 2000);
    }

    function showTranslationResult(data) {
        loading.style.display = 'none';
        translateBtn.disabled = false;
        
        const resultHTML = generateResultHTML(data);
        resultContainer.innerHTML = resultHTML;
        resultContainer.style.display = 'block';
        
        initializeAudioControls();
    }

    function generateResultHTML(data) {
        const { word, translation, explanation, examples } = data;
        const currentAccent = translatorAccent; // Use local state
        
        const translationLines = (translation || '').split('\n').filter(line => line.trim());
        const translationHTML = translationLines.map(line => {
            return `<div class="translation-item"><div class="translation-text">${line}</div></div>`;
        }).join('');
        
        const explanationLines = (explanation || '').split('\n').filter(line => line.trim());
        const explanationHTML = explanationLines.map(line => {
             return `<div class="explanation-item"><div class="explanation-text full-width">${line}</div></div>`;
        }).join('');

        const exampleLines = (examples || '').split('\n').filter(line => line.trim());
        
        function parseExamples(lines) {
            const examples = [];
            let currentExample = { sentence: '', translation: '' };
            for (let line of lines) {
                if (!line) continue;
                if (line.startsWith('翻譯:') || line.startsWith('翻译:')) {
                    currentExample.translation = line.replace(/^翻譯:|^翻译:/, '').trim();
                    if (currentExample.sentence) {
                        examples.push({ ...currentExample });
                        currentExample = { sentence: '', translation: '' };
                    }
                } else if (/[a-zA-Z]/.test(line)) {
                    if (currentExample.sentence) { // Push previous if it had no translation
                         examples.push({ ...currentExample, translation: '' }); 
                    }
                    currentExample.sentence = line;
                } else if (/[一-鿿]/.test(line)) {
                     currentExample.translation = line;
                     if (currentExample.sentence) {
                        examples.push({ ...currentExample });
                        currentExample = { sentence: '', translation: '' };
                    }
                }
            }
            if (currentExample.sentence) examples.push(currentExample);
            return examples;
        }
        
        const parsedExamples = parseExamples(exampleLines);
        let example1 = parsedExamples[0] || { sentence: `This is an example for "${word}".`, translation: `這是「${word}」的一個例句。` };
        let example2 = parsedExamples[1] || { sentence: `Let's learn how to use "${word}".`, translation: `我們來學習如何使用「${word}」。` };

        return `
            <div class="result-card">
                <h3><i class="fas fa-language"></i> 中文翻譯</h3>
                <div class="translation-content">${translationHTML}</div>
                <div class="audio-container">
                    <audio controls>
                        <source src="/play-word-audio?word=${encodeURIComponent(word)}&accent=${currentAccent}" type="audio/mpeg">
                        您的瀏覽器不支援音訊播放。
                    </audio>
                </div>
            </div>
            <div class="result-card">
                <h3><i class="fas fa-book"></i> 相關詞語</h3>
                <div class="explanation-content">${explanationHTML}</div>
            </div>
            <div class="result-card">
                <h3><i class="fas fa-quote-right"></i> 單字例句</h3>
                <div class="examples-grid">
                    <div class="example">
                        <p class="sentence">${example1.sentence}</p>
                        <p class="translation">${example1.translation}</p>
                        <div class="audio-container">
                            <audio controls>
                                <source src="/play-word-audio?word=${encodeURIComponent(example1.sentence)}&accent=${currentAccent}" type="audio/mpeg">
                            </audio>
                        </div>
                    </div>
                    <div class="example">
                        <p class="sentence">${example2.sentence}</p>
                        <p class="translation">${example2.translation}</p>
                        <div class="audio-container">
                            <audio controls>
                                <source src="/play-word-audio?word=${encodeURIComponent(example2.sentence)}&accent=${currentAccent}" type="audio/mpeg">
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
        resultContainer.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`;
        resultContainer.style.display = 'block';
    }

    function initializeAudioControls() {
        const audioElements = document.querySelectorAll('#result-container audio');
        audioElements.forEach(audio => {
            audio.addEventListener('play', function() {
                audioElements.forEach(otherAudio => {
                    if (otherAudio !== audio && !otherAudio.paused) otherAudio.pause();
                });
            });
        });
    }

    function reloadAllAudioSources() {
        const newAccent = translatorAccent;
        const audioSources = document.querySelectorAll('#result-container audio source');
        audioSources.forEach(source => {
            const currentSrc = source.src;
            if (currentSrc && currentSrc.includes('/play-word-audio')) {
                const url = new URL(currentSrc);
                url.searchParams.set('accent', newAccent);
                source.src = url.toString();
                const audioElement = source.parentElement;
                if (audioElement) audioElement.load();
            }
        });
        console.log(`Translator accent changed to ${newAccent} and audio reloaded.`);
    }

    // Auto-fill from URL param
    const params = new URLSearchParams(window.location.search);
    const word = params.get('word');
    if (word) {
        wordInput.value = word;
        startTranslation(word);
    }

    // Loading animation handling
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
        }, 1000);
    }
});

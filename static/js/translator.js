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

form.addEventListener('submit', (event) => {
    loading.style.display = 'block'; 
});

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
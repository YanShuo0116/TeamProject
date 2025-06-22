document.addEventListener('DOMContentLoaded', function() {
    // 導航欄滾動效果
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    });

    // 主題切換功能
    const themeToggle = document.querySelector('#theme-toggle');
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');

    // 檢查本地存儲中的主題設置
    if (currentTheme) {
        body.classList[currentTheme === 'dark' ? 'add' : 'remove']('dark-mode');
        themeToggle.checked = currentTheme === 'dark';
    }

    // 主題切換事件監聽器
    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });

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

    // 表單提交處理
    const form = document.querySelector('#teacherForm');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const resultContainer = document.querySelector('.result-container');

    if (form) {
        form.addEventListener('submit', function(e) {
            // 顯示載入動畫
            loadingSpinner.style.display = 'block';
            
            // 如果已有結果，先隱藏
            if (resultContainer) {
                resultContainer.style.opacity = '0';
            }
        });
    }

    // 如果頁面載入時有結果，顯示結果
    if (resultContainer) {
        resultContainer.style.opacity = '1';
    }

    // 自動調整文本區域高度
    const textarea = document.querySelector('textarea');
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }
});
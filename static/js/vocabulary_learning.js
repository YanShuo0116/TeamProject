// vocabulary_learning.js

document.addEventListener('DOMContentLoaded', () => {
    const themeSelectionSection = document.getElementById('themeSelectionSection');
    const themeCardsContainer = document.getElementById('themeCardsContainer');
    const lessonSelectionSection = document.getElementById('lessonSelectionSection');
    const lessonCardsContainer = document.getElementById('lessonCardsContainer');
    const currentThemeTitle = document.getElementById('currentThemeTitle');
    const wordCardSection = document.getElementById('wordCardSection');
    const currentLessonTitle = document.getElementById('currentLessonTitle');
    const loadingSpinner = document.getElementById('loadingSpinner'); // Get reference to loading spinner

    const wordCard = document.getElementById('wordCard');
    const englishWordElem = document.getElementById('englishWord');
    const chineseWordElem = document.getElementById('chineseWord');
    const wordImageElem = document.getElementById('wordImage');
    const playAudioBtn = document.getElementById('playAudio');
    const prevWordBtn = document.getElementById('prevWord');
    const flipCardBtn = document.getElementById('flipCard');
    const nextWordBtn = document.getElementById('nextWord');
    const progressBar = document.getElementById('progressBar');

    const backToThemesBtn = document.getElementById('backToThemesBtn');
    const backToLessonsBtn = document.getElementById('backToLessonsBtn');

    let words = [];
    let currentWordIndex = 0;
    let currentAudio = null; // 用於儲存當前播放的音訊
    let allThemesData = []; // 儲存所有主題和課次資料
    let selectedTheme = null; // 儲存當前選擇的主題

    // 載入主題和課次資料
    async function loadThemesAndLessons() {
        loadingSpinner.style.display = 'block'; // 顯示載入動畫
        themeSelectionSection.style.display = 'none'; // 隱藏主題選擇區
        lessonSelectionSection.style.display = 'none'; // 隱藏課次選擇區
        wordCardSection.style.display = 'none'; // 隱藏單字卡片區

        try {
            const response = await fetch('/api/themes_and_lessons');
            allThemesData = await response.json();
            displayThemes();
        } catch (error) {
            console.error('載入主題和課次失敗:', error);
            themeCardsContainer.innerHTML = '<p class="text-danger">載入主題失敗。</p>';
            loadingSpinner.style.display = 'none'; // 錯誤時隱藏載入動畫
            themeSelectionSection.style.display = 'block'; // 錯誤時顯示主題選擇區
        }
    }

    // 顯示主題卡片
    function displayThemes() {
        // 確保主題選擇區塊在顯示前是隱藏的，並在載入完成後顯示
        themeSelectionSection.style.display = 'none';
        lessonSelectionSection.style.display = 'none';
        wordCardSection.style.display = 'none';

        themeCardsContainer.innerHTML = '';
        allThemesData.forEach(theme => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-md-4 mb-4';
            colDiv.innerHTML = `
                <div class="selection-card" data-theme="${theme.theme_name}">
                    <h3>${theme.theme_name}</h3>
                    <p>共 ${theme.lessons.length} 課</p>
                </div>
            `;
            themeCardsContainer.appendChild(colDiv);
        });

        // 延遲隱藏載入動畫並顯示主題選擇區塊，確保動畫可見
        setTimeout(() => {
            loadingSpinner.style.display = 'none';
            themeSelectionSection.style.display = 'block';
        }, 300); // 300毫秒的延遲

        // 為主題卡片添加點擊事件
        document.querySelectorAll('.selection-card[data-theme]').forEach(card => {
            card.addEventListener('click', (event) => {
                const themeName = event.currentTarget.dataset.theme;
                selectedTheme = allThemesData.find(theme => theme.theme_name === themeName);
                displayLessons(selectedTheme);
            });
        });
    }

    // 顯示課次卡片
    function displayLessons(theme) {
        themeSelectionSection.style.display = 'none';
        lessonSelectionSection.style.display = 'block';
        wordCardSection.style.display = 'none';
        loadingSpinner.style.display = 'none'; // Ensure spinner is hidden when showing lessons

        currentThemeTitle.textContent = theme.theme_name;
        lessonCardsContainer.innerHTML = '';
        theme.lessons.forEach(lesson => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-md-4 mb-4';
            colDiv.innerHTML = `
                <div class="selection-card" data-lesson="${lesson}">
                    <h3>${lesson}</h3>
                </div>
            `;
            lessonCardsContainer.appendChild(colDiv);
        });

        // 為課次卡片添加點擊事件
        document.querySelectorAll('.selection-card[data-lesson]').forEach(card => {
            card.addEventListener('click', (event) => {
                const lessonName = event.currentTarget.dataset.lesson;
                loadWords(selectedTheme.theme_name, lessonName);
            });
        });
    }

    // 載入單字資料
    async function loadWords(theme, lesson) {
        if (!theme || !lesson) {
            console.error('主題或課次未選擇。');
            return;
        }

        themeSelectionSection.style.display = 'none';
        lessonSelectionSection.style.display = 'none';
        wordCardSection.style.display = 'none';
        loadingSpinner.style.display = 'block';

        currentLessonTitle.textContent = `${theme} - ${lesson}`;

        try {
            const response = await fetch(`/api/words/1200?theme=${encodeURIComponent(theme)}&lesson=${encodeURIComponent(lesson)}`);
            words = await response.json();
            if (words.length > 0) {
                currentWordIndex = 0;
                displayWord();
                wordCardSection.style.display = 'block';
            } else {
                englishWordElem.textContent = '沒有單字可供學習';
                chineseWordElem.textContent = '';
                wordImageElem.src = '';
                updateProgressBar();
                wordCardSection.style.display = 'block'; // Show the section to display the message
            }
        } catch (error) {
            console.error('載入單字失敗:', error);
            englishWordElem.textContent = '載入單字失敗';
            chineseWordElem.textContent = '';
            wordImageElem.src = '';
            updateProgressBar();
            wordCardSection.style.display = 'block'; // Show the section to display the error
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    // 顯示當前單字
    function displayWord() {
        if (words.length === 0) return;

        const word = words[currentWordIndex];
        englishWordElem.textContent = word.english;
        chineseWordElem.textContent = word.chinese;
        wordImageElem.src = word.image;
        wordCard.classList.remove('flipped'); // 確保卡片正面朝上

        updateProgressBar();
    }

    // 更新進度條
    function updateProgressBar() {
        const totalWords = words.length;
        const learnedWords = currentWordIndex + 1;
        progressBar.style.width = `${(learnedWords / totalWords) * 100}%`;
        progressBar.textContent = `${learnedWords}/${totalWords}`;
    }

    // 播放音訊
    async function playAudio(word) {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        try {
            const audioResponse = await fetch(`/play-word-audio?word=${encodeURIComponent(word)}`);
            if (audioResponse.ok) {
                const audioBlob = await audioResponse.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                currentAudio = new Audio(audioUrl);
                currentAudio.play();
            } else {
                console.error('音訊載入失敗:', audioResponse.statusText);
            }
        } catch (error) {
            console.error('播放音訊失敗:', error);
        }
    }

    // 事件監聽器
    wordCard.addEventListener('click', () => {
        wordCard.classList.toggle('flipped');
    });

    playAudioBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // 防止點擊音訊按鈕時翻轉卡片
        if (words.length > 0) {
            playAudio(words[currentWordIndex].english);
        }
    });

    prevWordBtn.addEventListener('click', () => {
        if (currentWordIndex > 0) {
            currentWordIndex--;
            displayWord();
        }
    });

    flipCardBtn.addEventListener('click', () => {
        wordCard.classList.toggle('flipped');
    });

    nextWordBtn.addEventListener('click', () => {
        if (currentWordIndex < words.length - 1) {
            currentWordIndex++;
            displayWord();
        } else {
            alert('恭喜您，已完成所有單字學習！');
        }
    });

    backToThemesBtn.addEventListener('click', () => {
        displayThemes();
    });

    backToLessonsBtn.addEventListener('click', () => {
        displayLessons(selectedTheme);
    });

    // 初始化載入主題和課次
    loadThemesAndLessons();
});

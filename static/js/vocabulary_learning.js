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
    let currentThemeName = null; // 當前主題名稱
    let currentLessonName = null; // 當前課程名稱
    let lessonProgressData = {}; // 儲存課程進度資料

    // 載入主題和課次資料
    async function loadThemesAndLessons() {
        loadingSpinner.style.display = 'block'; // 顯示載入動畫
        themeSelectionSection.style.display = 'none'; // 隱藏主題選擇區
        lessonSelectionSection.style.display = 'none'; // 隱藏課次選擇區
        wordCardSection.style.display = 'none'; // 隱藏單字卡片區

        try {
            const response = await fetch('/api/themes_and_lessons');
            allThemesData = await response.json();
            
            // 載入學習進度資料
            await loadLessonProgress();
            
            displayThemes();
        } catch (error) {
            console.error('載入主題和課次失敗:', error);
            themeCardsContainer.innerHTML = '<p class="text-danger">載入主題失敗。</p>';
            loadingSpinner.style.display = 'none'; // 錯誤時隱藏載入動畫
            themeSelectionSection.style.display = 'block'; // 錯誤時顯示主題選擇區
        }
    }

    // 載入學習進度資料
    async function loadLessonProgress() {
        try {
            const response = await fetch('/api/lesson_progress');
            if (response.ok) {
                lessonProgressData = await response.json();
            } else {
                const data = await response.json();
                if (response.status === 401) {
                    // 未登入狀態，使用空的進度數據
                    lessonProgressData = {};
                    console.log('用戶未登入，使用空的進度數據');
                } else {
                    console.error('載入學習進度失敗:', data.message || data.error);
                }
            }
        } catch (error) {
            console.error('載入學習進度失敗:', error);
            // 出錯時使用空的進度數據
            lessonProgressData = {};
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
            // 計算主題完成度
            let completedLessons = 0;
            theme.lessons.forEach(lesson => {
                const progressKey = `${theme.theme_name}_${lesson}`;
                if (lessonProgressData[progressKey] && lessonProgressData[progressKey].is_completed) {
                    completedLessons++;
                }
            });
            
            const completionPercentage = theme.lessons.length > 0 ? 
                Math.round((completedLessons / theme.lessons.length) * 100) : 0;
            
            const colDiv = document.createElement('div');
            colDiv.className = 'col-md-4 mb-4';
            
            const completionClass = completionPercentage === 100 ? 'completed' : 
                                  completionPercentage > 0 ? 'in-progress' : '';
            
            colDiv.innerHTML = `
                <div class="selection-card ${completionClass}" data-theme="${theme.theme_name}">
                    <h3>${theme.theme_name}</h3>
                    <p>共 ${theme.lessons.length} 課</p>
                    <div class="progress-info">
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${completionPercentage}%"></div>
                        </div>
                        <span class="progress-text">${completionPercentage}% 完成</span>
                    </div>
                    ${completionPercentage === 100 ? '<div class="completion-badge">✓ 已完成</div>' : ''}
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
            card.addEventListener('click', async (event) => {
                const themeName = event.currentTarget.dataset.theme;
                selectedTheme = allThemesData.find(theme => theme.theme_name === themeName);
                await displayLessons(selectedTheme);
            });
        });
    }

    // 顯示課次卡片
    async function displayLessons(theme) {
        themeSelectionSection.style.display = 'none';
        lessonSelectionSection.style.display = 'block';
        wordCardSection.style.display = 'none';
        loadingSpinner.style.display = 'none'; // Ensure spinner is hidden when showing lessons

        currentThemeTitle.textContent = theme.theme_name;
        lessonCardsContainer.innerHTML = '';
        
        // 為每個課程檢查測驗狀態
        for (const lesson of theme.lessons) {
            const progressKey = `${theme.theme_name}_${lesson}`;
            const lessonProgress = lessonProgressData[progressKey];
            
            // 檢查測驗狀態
            let quizStatus = null;
            try {
                const response = await fetch(`/api/quiz_status?theme=${encodeURIComponent(theme.theme_name)}&lesson=${encodeURIComponent(lesson)}`);
                if (response.ok) {
                    quizStatus = await response.json();
                } else if (response.status === 401) {
                    // 未登入狀態，使用預設的測驗狀態
                    quizStatus = {
                        has_passed: false
                    };
                }
            } catch (error) {
                console.error('獲取測驗狀態失敗:', error);
            }
            
            // 根據測驗狀態和學習進度決定顯示狀態
            let completionClass = '';
            let statusBadge = '';
            
            if (quizStatus && quizStatus.has_passed) {
                // 已通過測驗 - 綠色
                completionClass = 'completed';
                statusBadge = '<div class="completion-badge">✓ 已完成</div>';
            } else if (lessonProgress && lessonProgress.progress_percentage > 0) {
                // 有學習進度但未通過測驗 - 黃色
                completionClass = 'in-progress';
                // 移除了測驗中的徽章顯示，因為不再支持繼續測驗
            }
            // 否則保持預設樣式（灰色）
            
            const progressPercentage = lessonProgress ? lessonProgress.progress_percentage : 0;
            
            const colDiv = document.createElement('div');
            colDiv.className = 'col-md-4 mb-4';
            
            colDiv.innerHTML = `
                <div class="selection-card ${completionClass}" data-lesson="${lesson}">
                    <h3>${lesson}</h3>
                    <div class="progress-info">
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                        <span class="progress-text">${Math.round(progressPercentage)}% 完成</span>
                        ${lessonProgress ? `<span class="word-count">${lessonProgress.learned_words}/${lessonProgress.total_words} 單字</span>` : ''}
                    </div>
                    ${statusBadge}
                </div>
            `;
            lessonCardsContainer.appendChild(colDiv);
        }

        // 為課次卡片添加點擊事件
        document.querySelectorAll('.selection-card[data-lesson]').forEach(card => {
            card.addEventListener('click', (event) => {
                const lessonName = event.currentTarget.dataset.lesson;
                currentThemeName = selectedTheme.theme_name;
                currentLessonName = lessonName;
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

        // 清除之前的測驗按鈕和測驗容器
        const existingQuizButton = document.getElementById('quizButtonContainer');
        if (existingQuizButton) {
            existingQuizButton.remove();
        }
        const existingQuizContainer = document.getElementById('quizContainer');
        if (existingQuizContainer) {
            existingQuizContainer.remove();
        }
        const existingQuizOption = document.querySelector('.quiz-option-container');
        if (existingQuizOption) {
            existingQuizOption.remove();
        }

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
            // 獲取當前口音設定
            const currentAccent = window.globalAccentSwitch ? window.globalAccentSwitch.getCurrentAccent() : 'us';
            const audioResponse = await fetch(`/play-word-audio?word=${encodeURIComponent(word)}&accent=${currentAccent}`);
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

    // 發音練習按鈕事件監聽器
    const pronunciationBtn = document.getElementById('pronunciationPracticeBtn');
    if (pronunciationBtn) {
        pronunciationBtn.addEventListener('click', () => {
            if (words.length > 0 && currentWordIndex >= 0) {
                const currentWord = words[currentWordIndex].english;
                showVoicePracticeOverlay(currentWord);
            }
        });
    }

    // 深入了解按鈕事件監聽器
    const deepLearningBtn = document.getElementById('deepLearningBtn');
    if (deepLearningBtn) {
        deepLearningBtn.addEventListener('click', () => {
            if (words.length > 0 && currentWordIndex >= 0) {
                const currentWord = words[currentWordIndex].english;
                showTranslatorOverlay(currentWord);
            }
        });
    }

    nextWordBtn.addEventListener('click', async () => {
        // 標記當前單字為已學習
        if (words.length > 0) {
            await markWordAsLearned(words[currentWordIndex].english);
        }
        
        if (currentWordIndex < words.length - 1) {
            currentWordIndex++;
            displayWord();
        } else {
            // 完成所有單字學習，顯示完成訊息和測驗按鈕
            showCompletionWithQuizOption();
        }
    });

    // 顯示完成訊息和測驗選項
    function showCompletionWithQuizOption() {
        // 在控制按鈕旁邊添加測驗按鈕
        const controlsDiv = document.querySelector('.controls');
        const progressContainer = document.querySelector('.progress-container');
        
        // 檢查是否已經有測驗按鈕
        if (document.getElementById('quizButtonContainer')) {
            return;
        }
        
        // 創建簡單的測驗按鈕容器
        const quizButtonContainer = document.createElement('div');
        quizButtonContainer.id = 'quizButtonContainer';
        quizButtonContainer.className = 'quiz-button-container';
        quizButtonContainer.innerHTML = `
            <div class="completion-message">
                <p>🎉 恭喜完成所有單字！現在可以進行測驗</p>
            </div>
            <button class="btn btn-success quiz-btn" id="startQuizFromLesson">
                <i class="fas fa-clipboard-check"></i> 開始測驗
            </button>
        `;
        
        // 插入到進度條後面
        progressContainer.parentNode.insertBefore(quizButtonContainer, progressContainer.nextSibling);
        
        // 自動滾動到測驗按鈕
        setTimeout(() => {
            quizButtonContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 300);
        
        // 添加事件監聽器
        document.getElementById('startQuizFromLesson').addEventListener('click', showQuizOption);
    }

    // 顯示測驗選項
    function showQuizOption() {
        const quizContainer = document.createElement('div');
        quizContainer.className = 'quiz-option-container';
        quizContainer.innerHTML = `
            <div class="quiz-completion-message">
                <h2>🎉 恭喜完成所有單字學習！</h2>
                <p>現在需要通過測驗才能完成這個課程</p>
                <div class="quiz-info">
                    <p><i class="fas fa-info-circle"></i> 測驗包含3種題型(隨機題型)：</p>
                    <ul>
                        <li>看中文選英文（有圖片提示）</li>
                        <li>看英文選中文（有圖片提示）</li>
                        <li>看中文拼出英文單字</li>
                    </ul>
                    <p><strong>通過標準：80% 正確率</strong></p>
                </div>
                <div class="quiz-buttons">
                    <button class="btn btn-primary quiz-start-btn" id="startQuizBtn">
                        <i class="fas fa-play"></i> 開始測驗
                    </button>
                    <button class="btn btn-secondary" id="backToLessonsFromQuiz">
                        <i class="fas fa-arrow-left"></i> 返回課程
                    </button>
                </div>
            </div>
        `;
        
        // 隱藏單字卡片區域，顯示測驗選項
        wordCardSection.style.display = 'none';
        wordCardSection.parentNode.appendChild(quizContainer);
        
        // 添加事件監聽器
        document.getElementById('startQuizBtn').addEventListener('click', startQuiz);
        document.getElementById('backToLessonsFromQuiz').addEventListener('click', async () => {
            quizContainer.remove();
            await displayLessons(selectedTheme);
        });
    }

    // 開始測驗
    async function startQuiz() {
        try {
            // 先檢查測驗狀態
            const statusResponse = await fetch(`/api/quiz_status?theme=${encodeURIComponent(currentThemeName)}&lesson=${encodeURIComponent(currentLessonName)}`);
            if (statusResponse.ok) {
                const quizStatus = await statusResponse.json();
                
                if (quizStatus.has_passed) {
                    alert('您已經通過了這個課程的測驗！');
                    return;
                }
                
                // 如果有進行中的測驗，直接開始新測驗（舊測驗會被自動標記為放棄）
                // 移除了詢問用戶是否繼續的邏輯，避免潛在的bug
            }
            
            const response = await fetch('/api/start_quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    theme: currentThemeName,
                    lesson: currentLessonName
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // 移除測驗選項容器
                const quizContainer = document.querySelector('.quiz-option-container');
                if (quizContainer) {
                    quizContainer.remove();
                }
                
                // 開始測驗
                showQuizInterface(data.quiz_id, data.total_questions);
            } else {
                // 處理未登入狀態
                if (response.status === 401 && data.redirect) {
                    showLoginPrompt(data.message, data.redirect);
                } else {
                    alert('開始測驗失敗：' + (data.message || data.error));
                }
            }
        } catch (error) {
            console.error('開始測驗失敗:', error);
            alert('開始測驗失敗，請稍後再試');
        }
    }

    // 標記單字為已學習
    async function markWordAsLearned(word) {
        try {
            const response = await fetch('/api/update_word_progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    word: word,
                    status: 'learned',
                    theme: currentThemeName,
                    lesson: currentLessonName
                })
            });
            
            if (response.ok) {
                console.log(`單字 ${word} 已標記為學習完成`);
            } else {
                const data = await response.json();
                if (!handleApiError(response, data)) {
                    console.error('更新學習進度失敗:', data.message || data.error);
                }
            }
        } catch (error) {
            console.error('更新學習進度失敗:', error);
        }
    }

    backToThemesBtn.addEventListener('click', () => {
        displayThemes();
    });

    backToLessonsBtn.addEventListener('click', async () => {
        await displayLessons(selectedTheme);
    });

    // 測驗相關變數
    let currentQuizId = null;
    let currentQuestionIndex = 0;
    let quizTotalQuestions = 0;
    let quizStartTime = null;

    // 顯示測驗介面
    async function showQuizInterface(quizId, totalQuestions) {
        currentQuizId = quizId;
        currentQuestionIndex = 0;
        quizTotalQuestions = totalQuestions;
        quizStartTime = Date.now();
        
        // 創建測驗容器
        const quizContainer = document.createElement('div');
        quizContainer.id = 'quizContainer';
        quizContainer.className = 'quiz-container';
        quizContainer.innerHTML = `
            <div class="quiz-header">
                <h2>課程測驗</h2>
                <div class="quiz-progress">
                    <span id="quizProgress">1 / ${totalQuestions}</span>
                    <div class="quiz-progress-bar">
                        <div class="quiz-progress-fill" id="quizProgressFill"></div>
                    </div>
                </div>
            </div>
            <div class="quiz-content" id="quizContent">
                <!-- 問題內容將在這裡動態載入 -->
            </div>
        `;
        
        // 添加到頁面
        const container = document.querySelector('.container');
        container.appendChild(quizContainer);
        
        // 載入第一個問題
        await loadQuizQuestion();
    }

    // 載入測驗問題
    async function loadQuizQuestion() {
        try {
            const response = await fetch(`/api/get_quiz_question/${currentQuizId}/${currentQuestionIndex}`);
            const questionData = await response.json();
            
            if (response.ok) {
                displayQuizQuestion(questionData);
                updateQuizProgress();
            } else {
                if (!handleApiError(response, questionData)) {
                    alert('載入問題失敗：' + (questionData.message || questionData.error));
                }
            }
        } catch (error) {
            console.error('載入問題失敗:', error);
            alert('載入問題失敗，請稍後再試');
        }
    }

    // 儲存當前問題ID
    let currentQuestionId = null;

    // 顯示測驗問題
    function displayQuizQuestion(questionData) {
        currentQuestionId = questionData.question_id; // 儲存問題ID
        const quizContent = document.getElementById('quizContent');
        let questionHTML = '';
        
        if (questionData.question_type === 'chinese_to_english') {
            // 中文選英文
            questionHTML = `
                <div class="quiz-question">
                    <div class="question-image">
                        <img src="${questionData.image_url}" alt="圖片" onerror="this.style.display='none'">
                    </div>
                    <h3>請選擇「${questionData.question_text}」的英文：</h3>
                    <div class="quiz-options">
                        ${questionData.options.map((option, index) => `
                            <button class="quiz-option-btn" data-answer="${option}">
                                ${String.fromCharCode(65 + index)}. ${option}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (questionData.question_type === 'english_to_chinese') {
            // 英文選中文
            questionHTML = `
                <div class="quiz-question">
                    <div class="question-image">
                        <img src="${questionData.image_url}" alt="圖片" onerror="this.style.display='none'">
                    </div>
                    <h3>請選擇「${questionData.question_text}」的中文：</h3>
                    <div class="quiz-options">
                        ${questionData.options.map((option, index) => `
                            <button class="quiz-option-btn" data-answer="${option}">
                                ${String.fromCharCode(65 + index)}. ${option}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (questionData.question_type === 'spelling') {
            // 拼字題
            questionHTML = `
                <div class="quiz-question">
                    <h3>請拼出「${questionData.question_text}」的英文：</h3>
                    <div class="spelling-area">
                        <div class="answer-area" id="answerArea"></div>
                        <div class="letter-bank">
                            ${questionData.scrambled_letters.map(letter => `
                                <button class="letter-btn" data-letter="${letter}">${letter}</button>
                            `).join('')}
                        </div>
                        <div class="spelling-controls">
                            <button class="btn btn-warning" id="clearSpelling">清除</button>
                            <button class="btn btn-primary" id="submitSpelling">提交答案</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        quizContent.innerHTML = questionHTML;
        
        // 添加事件監聽器
        if (questionData.question_type === 'spelling') {
            setupSpellingQuestion();
        } else {
            setupMultipleChoiceQuestion();
        }
    }

    // 設置選擇題事件
    function setupMultipleChoiceQuestion() {
        const optionBtns = document.querySelectorAll('.quiz-option-btn');
        optionBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const answer = btn.dataset.answer;
                await submitQuizAnswer(answer);
            });
        });
    }

    // 設置拼字題事件
    function setupSpellingQuestion() {
        const answerArea = document.getElementById('answerArea');
        const letterBtns = document.querySelectorAll('.letter-btn');
        const clearBtn = document.getElementById('clearSpelling');
        const submitBtn = document.getElementById('submitSpelling');
        
        let currentAnswer = [];
        
        letterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (!btn.disabled) {
                    currentAnswer.push(btn.dataset.letter);
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    updateAnswerArea();
                }
            });
        });
        
        clearBtn.addEventListener('click', () => {
            currentAnswer = [];
            letterBtns.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
            updateAnswerArea();
        });
        
        submitBtn.addEventListener('click', async () => {
            if (currentAnswer.length > 0) {
                await submitQuizAnswer(currentAnswer.join(''));
            }
        });
        
        function updateAnswerArea() {
            answerArea.innerHTML = currentAnswer.map(letter => 
                `<span class="answer-letter">${letter}</span>`
            ).join('');
        }
    }

    // 提交測驗答案
    async function submitQuizAnswer(answer) {
        try {
            const response = await fetch('/api/submit_quiz_answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question_id: currentQuestionId, // 使用實際的問題ID
                    answer: answer
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // 顯示答案結果
                showAnswerResult(result.is_correct, result.correct_answer);
                
                // 延遲後載入下一題或完成測驗
                setTimeout(() => {
                    currentQuestionIndex++;
                    if (currentQuestionIndex < quizTotalQuestions) {
                        loadQuizQuestion();
                    } else {
                        completeQuiz();
                    }
                }, 2000);
            } else {
                if (!handleApiError(response, result)) {
                    alert('提交答案失敗：' + (result.message || result.error));
                }
            }
        } catch (error) {
            console.error('提交答案失敗:', error);
            alert('提交答案失敗，請稍後再試');
        }
    }

    // 顯示答案結果
    function showAnswerResult(isCorrect, correctAnswer) {
        const resultDiv = document.createElement('div');
        resultDiv.className = `answer-result ${isCorrect ? 'correct' : 'incorrect'}`;
        resultDiv.innerHTML = `
            <div class="result-icon">
                ${isCorrect ? '✓' : '✗'}
            </div>
            <div class="result-text">
                ${isCorrect ? '正確！' : `錯誤！正確答案是：${correctAnswer}`}
            </div>
        `;
        
        const quizContent = document.getElementById('quizContent');
        quizContent.appendChild(resultDiv);
        
        // 禁用所有按鈕
        const buttons = quizContent.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);
    }

    // 更新測驗進度
    function updateQuizProgress() {
        const progressText = document.getElementById('quizProgress');
        const progressFill = document.getElementById('quizProgressFill');
        
        progressText.textContent = `${currentQuestionIndex + 1} / ${quizTotalQuestions}`;
        const percentage = ((currentQuestionIndex + 1) / quizTotalQuestions) * 100;
        progressFill.style.width = `${percentage}%`;
    }

    // 完成測驗
    async function completeQuiz() {
        try {
            const response = await fetch(`/api/complete_quiz/${currentQuizId}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showQuizResults(result);
            } else {
                if (!handleApiError(response, result)) {
                    alert('完成測驗失敗：' + (result.message || result.error));
                }
            }
        } catch (error) {
            console.error('完成測驗失敗:', error);
            alert('完成測驗失敗，請稍後再試');
        }
    }

    // 顯示測驗結果
    function showQuizResults(result) {
        console.log("Final quiz result received from server:", result);
        const quizContainer = document.getElementById('quizContainer');
        const completionTime = Math.floor(result.completion_time / 60);
        
        quizContainer.innerHTML = `
            <div class="quiz-results">
                <div class="results-header">
                    <h2>${result.is_passed ? '🎉 測驗通過！' : '😔 測驗未通過'}</h2>
                </div>
                <div class="results-content">
                    <div class="score-display">
                        <div class="score-circle ${result.is_passed ? 'passed' : 'failed'}">
                            <span class="score-percentage">${result.score_percentage}%</span>
                        </div>
                    </div>
                    <div class="results-details">
                        <p><strong>正確答題：</strong>${result.correct_answers} / ${result.total_questions}</p>
                        <p><strong>通過標準：</strong>${result.pass_threshold}%</p>
                    </div>
                    ${result.is_passed ? 
                        '<div class="success-message"><p>恭喜！您已成功完成此課程！</p></div>' :
                        '<div class="retry-message"><p>請繼續努力，您可以重新學習後再次測驗。</p></div>'
                    }
                    <div class="results-buttons">
                        <button class="btn btn-primary" id="backToLessonsFromResults">
                            <i class="fas fa-arrow-left"></i> 返回課程
                        </button>
                        ${!result.is_passed ? 
                            '<button class="btn btn-warning" id="retryQuiz"><i class="fas fa-redo"></i> 重新測驗</button>' : 
                            ''
                        }
                    </div>
                </div>
            </div>
        `;
        
        // 添加事件監聽器
        document.getElementById('backToLessonsFromResults').addEventListener('click', async () => {
            quizContainer.remove();
            await loadLessonProgress(); // 重新載入進度
            await displayLessons(selectedTheme);
        });
        
        if (!result.is_passed) {
            document.getElementById('retryQuiz').addEventListener('click', () => {
                quizContainer.remove();
                startQuiz();
            });
        }
    }

    // 顯示登入提示
    function showLoginPrompt(message, redirectUrl) {
        // 創建登入提示模態框
        const loginPrompt = document.createElement('div');
        loginPrompt.className = 'login-prompt-overlay';
        loginPrompt.innerHTML = `
            <div class="login-prompt-modal">
                <div class="login-prompt-header">
                    <h3><i class="fas fa-sign-in-alt"></i> 需要登入</h3>
                </div>
                <div class="login-prompt-body">
                    <p>${message}</p>
                    <div class="login-prompt-buttons">
                        <button class="btn btn-primary" id="goToLogin">
                            <i class="fas fa-sign-in-alt"></i> 前往登入
                        </button>
                        <button class="btn btn-secondary" id="cancelLogin">
                            <i class="fas fa-times"></i> 取消
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(loginPrompt);
        
        // 添加事件監聽器
        document.getElementById('goToLogin').addEventListener('click', () => {
            // 保存當前頁面信息到 sessionStorage，登入後可以返回
            sessionStorage.setItem('returnToPage', window.location.pathname);
            sessionStorage.setItem('returnToTheme', currentThemeName);
            sessionStorage.setItem('returnToLesson', currentLessonName);
            
            // 跳轉到登入頁面
            window.location.href = redirectUrl;
        });
        
        document.getElementById('cancelLogin').addEventListener('click', () => {
            loginPrompt.remove();
        });
        
        // 點擊背景關閉
        loginPrompt.addEventListener('click', (e) => {
            if (e.target === loginPrompt) {
                loginPrompt.remove();
            }
        });
    }

    // 通用的API錯誤處理函數
    function handleApiError(response, data) {
        if (response.status === 401 && data.redirect) {
            showLoginPrompt(data.message, data.redirect);
            return true; // 表示已處理
        }
        return false; // 表示未處理，需要其他錯誤處理
    }

    // 監聽全域口音變更事件
    window.addEventListener('accentChanged', function(event) {
        console.log('單字學習頁面：口音已變更為', event.detail.accent);
        // 重新載入當前播放的音頻（如果有的話）
        if (currentAudio) {
            const currentWord = words[currentWordIndex];
            if (currentWord) {
                // 停止當前音頻
                currentAudio.pause();
                currentAudio = null;
                // 使用新口音重新播放
                setTimeout(() => {
                    playAudio(currentWord.english);
                }, 100);
            }
        }
    });

    // 初始化載入主題和課次
    loadThemesAndLessons();
});

// 顯示語音練習覆蓋層
function showVoicePracticeOverlay(word) {
    // 創建覆蓋層
    const overlay = document.createElement('div');
    overlay.className = 'practice-overlay';
    overlay.innerHTML = `
        <div class="practice-content">
            <div class="practice-header">
                <h3><i class="fas fa-microphone"></i> 發音練習</h3>
                <button class="close-btn" onclick="closePracticeOverlay()">
                    <i class="fas fa-times"></i> 返回單字卡
                </button>
            </div>
            <div class="practice-body">
                <div class="voice-eval-card">
                    <input type="text" id="overlayReference" class="form-control mb-3" value="${word}" readonly/>
                    <div class="controls">
                        <button class="control-btn" onclick="startRecording()">
                            <i class="fas fa-microphone"></i> 開始錄音
                        </button>
                        <button class="control-btn" onclick="stopRecording()">
                            <i class="fas fa-stop"></i> 停止錄音
                        </button>
                    </div>
                    <p id="overlayStatus" class="mt-3"></p>
                    <p id="overlayResult" class="mt-2"></p>
                    <audio id="overlayAudioPlayer" controls style="display:none; margin-top: 1rem;"></audio>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // 載入語音評測腳本功能
    loadVoiceScript();
}

// 顯示翻譯機覆蓋層
function showTranslatorOverlay(word) {
    const overlay = document.createElement('div');
    overlay.className = 'practice-overlay';
    overlay.innerHTML = `
        <div class="practice-content">
            <div class="practice-header">
                <h3><i class="fas fa-language"></i> 深入了解</h3>
                <button class="close-btn" onclick="closePracticeOverlay()">
                    <i class="fas fa-times"></i> 返回單字卡
                </button>
            </div>
            <div class="practice-body">
                <div class="translator-card">
                    <div class="word-display">
                        <h4 class="current-word">${word}</h4>
                    </div>
                    <div id="overlayTranslationResult" class="translation-result mt-4">
                        <div class="loading-spinner" id="overlayLoadingSpinner">
                            <div class="spinner"></div>
                            <p>載入詳細資訊中...</p>
                        </div>
                        <div id="overlayTranslationContent"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // 自動開始翻譯
    setTimeout(() => {
        translateOverlayWord(word);
    }, 100);
}

// 關閉練習覆蓋層
function closePracticeOverlay() {
    const overlay = document.querySelector('.practice-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// 載入語音評測功能
function loadVoiceScript() {
    // 語音錄音相關變數
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    const statusEl = document.getElementById("overlayStatus");
    const resultEl = document.getElementById("overlayResult");
    const audioPlayer = document.getElementById("overlayAudioPlayer");

    // 開始錄音函數
    window.startRecording = function () {
        if (isRecording) return;

        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            statusEl.textContent = "🎙️ 錄音中...";

            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            isRecording = true;

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.start();
        }).catch(err => {
            statusEl.textContent = "❌ 無法存取麥克風：" + err.message;
        });
    }

    // 停止錄音函數
    window.stopRecording = function () {
        if (!isRecording || !mediaRecorder) return;

        mediaRecorder.onstop = async () => {
            statusEl.textContent = "⏳ 上傳並辨識中...";

            const audioBlob = new Blob(audioChunks, { type: "audio/wav" });

            // === 這裡就能先在前端播放 ===
            const audioURL = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioURL;
            audioPlayer.style.display = "block";
            audioPlayer.load();

            // 如果還要送去後端
            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.wav");
            formData.append("reference", document.getElementById("overlayReference").value);

            try {
                const response = await fetch('/voice/upload', {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error("伺服器錯誤：" + errorText);
                }

                const result = await response.json();

                if (result.error) {
                    throw new Error(result.error);
                }

                resultEl.textContent =
                    `你說的是：${result.transcribed}\n應該是：${result.reference}\n相似度：${(result.similarity * 100).toFixed(1)}%\n結果：${result.match ? "✅ 正確" : "❌ 有誤"}`;

                statusEl.textContent = "✅ 分析完成";
            } catch (error) {
                statusEl.textContent = "❌ 發生錯誤：" + error.message;
            }

            isRecording = false;
        };

        mediaRecorder.stop();
        statusEl.textContent = "⏹️ 錄音結束，處理中...";
    }
}

// 翻譯覆蓋層中的單字
function translateOverlayWord(wordParam) {
    const word = wordParam || document.getElementById('overlayWordInput')?.value.trim();
    if (!word) return;
    
    const loadingSpinner = document.getElementById('overlayLoadingSpinner');
    const resultDiv = document.getElementById('overlayTranslationResult');
    const contentDiv = document.getElementById('overlayTranslationContent');
    
    loadingSpinner.style.display = 'block';
    resultDiv.style.display = 'block';
    contentDiv.innerHTML = '';
    
    // 調用翻譯API
    fetch('/api/translate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ word: word })
    })
    .then(response => response.json())
    .then(data => {
        if (data.session_id) {
            checkTranslationStatus(data.session_id);
        } else {
            throw new Error('翻譯請求失敗');
        }
    })
    .catch(error => {
        loadingSpinner.style.display = 'none';
        contentDiv.innerHTML = `<div class="error">翻譯失敗: ${error.message}</div>`;
    });
}

// 檢查翻譯狀態
function checkTranslationStatus(sessionId) {
    const loadingSpinner = document.getElementById('overlayLoadingSpinner');
    const contentDiv = document.getElementById('overlayTranslationContent');
    
    fetch(`/api/translation_status/${sessionId}`)
    .then(response => response.json())
    .then(data => {
        if (data.status === 'completed') {
            loadingSpinner.style.display = 'none';
            
            // 解析例句並添加語音按鈕
            const examplesWithAudio = parseExamplesAndAddAudio(data.examples);
            
            contentDiv.innerHTML = `
                <div class="translation-section">
                    <h4>翻譯結果</h4>
                    <div class="translation-text">${data.translation}</div>
                </div>
                <div class="explanation-section">
                    <h4>相關詞語</h4>
                    <div class="explanation-text">${data.explanation}</div>
                </div>
                <div class="examples-section">
                    <h4>例句</h4>
                    <div class="examples-text">${examplesWithAudio}</div>
                </div>
            `;
        } else if (data.status === 'failed') {
            loadingSpinner.style.display = 'none';
            contentDiv.innerHTML = '<div class="error">翻譯失敗，請稍後再試</div>';
        } else {
            // 繼續檢查狀態
            setTimeout(() => checkTranslationStatus(sessionId), 1000);
        }
    })
    .catch(error => {
        loadingSpinner.style.display = 'none';
        contentDiv.innerHTML = `<div class="error">檢查翻譯狀態失敗: ${error.message}</div>`;
    });
}

// 解析例句並添加語音播放按鈕
function parseExamplesAndAddAudio(examples) {
    if (!examples) return '';
    
    // 將例句按行分割
    const lines = examples.split('\n');
    let result = '';
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // 檢查是否為英文例句（不包含"翻譯:"）
        if (line && !line.includes('翻譯:') && !line.includes('翻译:')) {
            // 判斷是否為英文句子（包含英文字母且以句號、問號或驚嘆號結尾）
            if (/[a-zA-Z]/.test(line) && /[.!?]$/.test(line.trim())) {
                const cleanSentence = line.trim();
                const audioId = 'audio_' + Math.random().toString(36).substr(2, 9);
                result += `
                    <div class="example-sentence">
                        <span class="sentence-text">${line}</span>
                        <button class="audio-btn" onclick="playExampleAudio('${cleanSentence}', '${audioId}')" id="${audioId}">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </div>
                `;
            } else {
                result += `<div class="example-line">${line}</div>`;
            }
        } else {
            result += `<div class="translation-line">${line}</div>`;
        }
    });
    
    return result;
}

// 播放例句語音
function playExampleAudio(sentence, buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    // 更新按鈕狀態
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;
    
    // 獲取用戶口音偏好
    const accent = getUserAccentPreference();
    
    // 播放音頻
    const audioUrl = `/play-word-audio?word=${encodeURIComponent(sentence)}&accent=${accent}`;
    
    const audio = new Audio(audioUrl);
    
    audio.onloadstart = () => {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    };
    
    audio.oncanplay = () => {
        button.innerHTML = '<i class="fas fa-volume-up"></i>';
        button.disabled = false;
    };
    
    audio.onended = () => {
        button.innerHTML = '<i class="fas fa-volume-up"></i>';
        button.disabled = false;
    };
    
    audio.onerror = () => {
        button.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        button.disabled = false;
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-volume-up"></i>';
        }, 2000);
    };
    
    audio.play().catch(error => {
        console.error('Audio play failed:', error);
        button.innerHTML = '<i class="fas fa-volume-up"></i>';
        button.disabled = false;
    });
}

// 獲取用戶口音偏好（簡化版）
function getUserAccentPreference() {
    // 可以從全域變數或 localStorage 獲取
    return localStorage.getItem('preferred_accent') || 'us';
}

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
            }
        } catch (error) {
            console.error('載入學習進度失敗:', error);
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
            const progressKey = `${theme.theme_name}_${lesson}`;
            const lessonProgress = lessonProgressData[progressKey];
            
            const isCompleted = lessonProgress && lessonProgress.is_completed;
            const progressPercentage = lessonProgress ? lessonProgress.progress_percentage : 0;
            
            const colDiv = document.createElement('div');
            colDiv.className = 'col-md-4 mb-4';
            
            const completionClass = isCompleted ? 'completed' : 
                                  progressPercentage > 0 ? 'in-progress' : '';
            
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
                    ${isCompleted ? '<div class="completion-badge">✓ 已完成</div>' : ''}
                </div>
            `;
            lessonCardsContainer.appendChild(colDiv);
        });

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
                    <p><i class="fas fa-info-circle"></i> 測驗包含3種題型：</p>
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
        document.getElementById('backToLessonsFromQuiz').addEventListener('click', () => {
            quizContainer.remove();
            displayLessons(selectedTheme);
        });
    }

    // 開始測驗
    async function startQuiz() {
        try {
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
                alert('開始測驗失敗：' + data.error);
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
            }
        } catch (error) {
            console.error('更新學習進度失敗:', error);
        }
    }

    backToThemesBtn.addEventListener('click', () => {
        displayThemes();
    });

    backToLessonsBtn.addEventListener('click', () => {
        displayLessons(selectedTheme);
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
                alert('載入問題失敗：' + questionData.error);
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
                alert('提交答案失敗：' + result.error);
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
                alert('完成測驗失敗：' + result.error);
            }
        } catch (error) {
            console.error('完成測驗失敗:', error);
            alert('完成測驗失敗，請稍後再試');
        }
    }

    // 顯示測驗結果
    function showQuizResults(result) {
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
                        <p><strong>完成時間：</strong>${completionTime} 分鐘</p>
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
            displayLessons(selectedTheme);
        });
        
        if (!result.is_passed) {
            document.getElementById('retryQuiz').addEventListener('click', () => {
                quizContainer.remove();
                startQuiz();
            });
        }
    }

    // 初始化載入主題和課次
    loadThemesAndLessons();
});

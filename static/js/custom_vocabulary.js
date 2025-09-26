document.addEventListener('DOMContentLoaded', () => {
    // Sections
    const loadingSpinner = document.getElementById('loadingSpinner');
    const bookSelectionSection = document.getElementById('bookSelectionSection');
    const wordCardSection = document.getElementById('wordCardSection');

    // Book Selection View
    const createBookBtn = document.getElementById('createBookBtn');
    const newBookNameInput = document.getElementById('newBookName');
    const bookCardsContainer = document.getElementById('bookCardsContainer');

    // Word Card View
    const backToBooksBtn = document.getElementById('backToBooksBtn');
    const currentBookTitle = document.getElementById('currentBookTitle');
    const addWordBtn = document.getElementById('addWordBtn');
    const wordCard = document.getElementById('wordCard');
    const englishWordElem = document.getElementById('englishWord');
    const chineseWordElem = document.getElementById('chineseWord');
    const wordImageElem = document.getElementById('wordImage');
    const playAudioBtn = document.getElementById('playAudio');
    const deleteWordBtn = document.getElementById('deleteWordBtn');
    const prevWordBtn = document.getElementById('prevWord');
    const flipCardBtn = document.getElementById('flipCard');
    const nextWordBtn = document.getElementById('nextWord');
    const progressBar = document.getElementById('progressBar');

    // Add Word Modal
    const addWordModal = new bootstrap.Modal(document.getElementById('addWordModal'));
    const saveWordBtn = document.getElementById('saveWordBtn');
    const englishWordInput = document.getElementById('englishWordInput');
    const chineseWordInput = document.getElementById('chineseWordInput');

    // State
    let state = {
        books: [],
        currentBook: null,
        currentWords: [],
        currentWordIndex: 0,
    };

    // --- API Functions ---
    const api = {
        getBooks: () => fetch('/api/custom_vocabulary/books').then(res => res.json()),
        createBook: (name) => fetch('/api/custom_vocabulary/create_book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        }).then(res => res.json()),
        deleteBook: (bookId) => fetch(`/api/custom_vocabulary/delete_book/${bookId}`, { method: 'DELETE' }).then(res => res.json()),
        getBookDetails: (bookId) => fetch(`/api/custom_vocabulary/book/${bookId}`).then(res => res.json()),
        addWord: (bookId, english, chinese) => fetch('/api/custom_vocabulary/add_word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id: bookId, english, chinese })
        }).then(res => res.json()),
        deleteWord: (wordId) => fetch(`/api/custom_vocabulary/delete_word/${wordId}`, { method: 'DELETE' }).then(res => res.json()),
        // Updated Quiz API endpoints
        startQuiz: (bookId) => fetch(`/api/custom_quiz/start/${bookId}`, { method: 'POST' }).then(res => res.json()),
        getQuizQuestion: (quizId, index) => fetch(`/api/custom_quiz/get_question/${quizId}/${index}`).then(res => res.json()),
        submitQuizAnswer: (questionId, answer) => fetch('/api/custom_quiz/submit_answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_id: questionId, answer: answer })
        }).then(res => res.json()),
        completeQuiz: (quizId) => fetch(`/api/custom_quiz/complete/${quizId}`, { method: 'POST' }).then(res => res.json()),
    };

    // --- View Management ---
    function showLoading(show) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }

    function switchView(view) {
        bookSelectionSection.style.display = view === 'books' ? 'block' : 'none';
        wordCardSection.style.display = view === 'words' ? 'block' : 'none';
    }

    // --- Book Management ---
    async function loadBooks() {
        showLoading(true);
        try {
            state.books = await api.getBooks();
            renderBooks();
        } catch (e) {
            console.error("Failed to load books", e);
            alert("無法載入單字本");
        }
        showLoading(false);
    }

    function renderBooks() {
        bookCardsContainer.innerHTML = '';
        if (state.books.length === 0) {
            bookCardsContainer.innerHTML = '<p class="text-center text-muted">尚未建立任何單字本。</p>';
            return;
        }
        state.books.forEach(book => {
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-4';
            col.innerHTML = `
                <div class="selection-card custom-book-card">
                    <h3>${book.name}</h3>
                    <p>共 ${book.word_count} 個單字</p>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-outline-danger delete-book-btn" data-book-id="${book.id}"><i class="fas fa-trash"></i></button>
                        <button class="btn btn-sm btn-primary view-book-btn" data-book-id="${book.id}">查看</button>
                    </div>
                </div>
            `;
            bookCardsContainer.appendChild(col);
        });
    }

    async function handleCreateBook() {
        const name = newBookNameInput.value.trim();
        if (!name) {
            alert('請輸入單字本名稱');
            return;
        }
        showLoading(true);
        const result = await api.createBook(name);
        showLoading(false);
        if (result.success) {
            newBookNameInput.value = '';
            await loadBooks();
        } else {
            alert(result.message || '建立失敗');
        }
    }

    async function handleDeleteBook(bookId) {
        if (!confirm('確定要刪除這個單字本嗎？所有相關單字將一併刪除。')) return;

        showLoading(true);
        const result = await api.deleteBook(bookId);
        showLoading(false);

        if (result.success) {
            await loadBooks();
        } else {
            alert(result.message || '刪除失敗');
        }
    }

    async function handleViewBook(bookId) {
        showLoading(true);
        try {
            const bookDetails = await api.getBookDetails(bookId);
            state.currentBook = { id: bookDetails.id, name: bookDetails.name };
            state.currentWords = bookDetails.words;
            state.currentWordIndex = 0;
            currentBookTitle.textContent = bookDetails.name;
            renderWordView();
            switchView('words');
        } catch (e) {
            console.error("Failed to load book details", e);
            alert("無法載入單字本內容");
        }
        showLoading(false);
    }

    // --- Word Management ---
    function renderWordView() {
        // Clear any existing quiz UI
        const existingQuizUI = document.querySelector('.quiz-button-container, .quiz-option-container, .quiz-container');
        if(existingQuizUI) existingQuizUI.remove();

        if (state.currentWords.length === 0) {
            wordCard.style.display = 'none';
            // Optionally, show a message
            if (!document.getElementById('emptyBookMsg')) {
                const msg = document.createElement('p');
                msg.id = 'emptyBookMsg';
                msg.className = 'text-center text-muted mt-5';
                msg.textContent = '這個單字本沒有單字。點擊上方「新增單字」來加入第一個單字！';
                wordCard.parentNode.insertBefore(msg, wordCard);
            }
            progressBar.style.width = '0%';
            progressBar.textContent = '0/0';
        } else {
            const emptyMsg = document.getElementById('emptyBookMsg');
            if (emptyMsg) emptyMsg.remove();
            wordCard.style.display = 'block';
            displayWord();
        }
    }

    function displayWord() {
        if (state.currentWords.length === 0 || state.currentWordIndex < 0 || state.currentWordIndex >= state.currentWords.length) {
            renderWordView();
            return;
        }

        const word = state.currentWords[state.currentWordIndex];
        englishWordElem.textContent = word.english;
        chineseWordElem.textContent = word.chinese;
        wordImageElem.src = word.image || '';
        wordImageElem.onerror = () => { wordImageElem.style.display = 'none'; };
        wordImageElem.onload = () => { wordImageElem.style.display = 'block'; };
        wordCard.classList.remove('flipped');
        deleteWordBtn.dataset.wordId = word.id;

        updateProgressBar();
    }

    function updateProgressBar() {
        const total = state.currentWords.length;
        const current = total > 0 ? state.currentWordIndex + 1 : 0;
        const percentage = total > 0 ? (current / total) * 100 : 0;
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${current}/${total}`;
    }

    async function handleSaveWord() {
        const english = englishWordInput.value.trim();
        const chinese = chineseWordInput.value.trim();
        if (!english) {
            alert('請輸入英文單字');
            return;
        }

        saveWordBtn.disabled = true;
        const result = await api.addWord(state.currentBook.id, english, chinese);
        saveWordBtn.disabled = false;

        if (result.success) {
            state.currentWords.push(result.word);
            state.currentWordIndex = state.currentWords.length - 1;
            renderWordView();
            addWordModal.hide();
        } else {
            alert(result.message || '新增失敗');
        }
    }

    async function handleDeleteWord(wordId) {
        if (!confirm('確定要刪除這個單字嗎？')) return;

        const result = await api.deleteWord(wordId);
        if (result.success) {
            state.currentWords = state.currentWords.filter(w => w.id !== parseInt(wordId));
            if (state.currentWordIndex >= state.currentWords.length) {
                state.currentWordIndex = Math.max(0, state.currentWords.length - 1);
            }
            renderWordView();
        } else {
            alert(result.message || '刪除失敗');
        }
    }

    function showCompletionWithQuizOption() {
        const controlsDiv = document.querySelector('#wordCardSection .controls');
        if (document.getElementById('quizButtonContainer')) return;

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
        controlsDiv.insertAdjacentElement('afterend', quizButtonContainer);
        document.getElementById('startQuizFromLesson').addEventListener('click', startQuiz);
    }

    // --- Quiz Management (full implementation) ---

    function showQuizOption() {
        const quizContainer = document.createElement('div');
        quizContainer.className = 'quiz-option-container';
        quizContainer.innerHTML = `
            <div class="quiz-completion-message">
                <h2>🎉 恭喜完成所有單字學習！</h2>
                <p>現在需要通過測驗才能完成這個單字本的學習</p>
                <div class="quiz-info">
                    <p><i class="fas fa-info-circle"></i> 測驗包含3種隨機題型：</p>
                    <ul>
                        <li>看中文選英文</li>
                        <li>看英文選中文</li>
                        <li>看中文拼出英文單字</li>
                    </ul>
                    <p><strong>通過標準：80% 正確率</strong></p>
                </div>
                <div class="quiz-buttons">
                    <button class="btn btn-primary quiz-start-btn" id="startQuizBtn">
                        <i class="fas fa-play"></i> 開始測驗
                    </button>
                    <button class="btn btn-secondary" id="backToBookFromQuiz">
                        <i class="fas fa-arrow-left"></i> 返回單字卡
                    </button>
                </div>
            </div>
        `;
        
        wordCardSection.style.display = 'none';
        wordCardSection.parentNode.appendChild(quizContainer);
        
        document.getElementById('startQuizBtn').addEventListener('click', startQuiz);
        document.getElementById('backToBookFromQuiz').addEventListener('click', () => {
            quizContainer.remove();
            wordCardSection.style.display = 'block';
        });
    }

    async function startQuiz() {
        showLoading(true);
        const result = await api.startQuiz(state.currentBook.id);
        showLoading(false);

        if (result.quiz_id) {
            const quizOptionContainer = document.querySelector('.quiz-option-container');
            if(quizOptionContainer) quizOptionContainer.remove();
            wordCardSection.style.display = 'none'; // Hide the word card section
            showQuizInterface(result.quiz_id, result.total_questions);
        } else {
            if (result.redirect) {
                showLoginPrompt(result.message, result.redirect);
            } else {
                alert(result.error || '開始測驗失敗');
            }
        }
    }

    let currentQuizId = null;
    let currentQuestionIndex = 0;
    let quizTotalQuestions = 0;
    let currentQuestionId = null;

    async function showQuizInterface(quizId, totalQuestions) {
        currentQuizId = quizId;
        currentQuestionIndex = 0;
        quizTotalQuestions = totalQuestions;

        const existingQuiz = document.getElementById('quizContainer');
        if(existingQuiz) existingQuiz.remove();

        const quizContainer = document.createElement('div');
        quizContainer.id = 'quizContainer';
        quizContainer.className = 'quiz-container';
        quizContainer.innerHTML = `
            <div class="quiz-header">
                <h2>${state.currentBook.name} - 測驗</h2>
                <div class="quiz-progress">
                    <span id="quizProgress">1 / ${totalQuestions}</span>
                    <div class="quiz-progress-bar">
                        <div class="quiz-progress-fill" id="quizProgressFill"></div>
                    </div>
                </div>
            </div>
            <div class="quiz-content" id="quizContent"></div>
        `;
        
        wordCardSection.parentNode.appendChild(quizContainer);
        await loadQuizQuestion();
    }

    async function loadQuizQuestion() {
        showLoading(true);
        const questionData = await api.getQuizQuestion(currentQuizId, currentQuestionIndex);
        showLoading(false);

        if (questionData && !questionData.error) {
            displayQuizQuestion(questionData);
            updateQuizProgress();
        } else {
            alert('載入問題失敗：' + (questionData.message || questionData.error));
        }
    }

    function displayQuizQuestion(questionData) {
        currentQuestionId = questionData.question_id;
        const quizContent = document.getElementById('quizContent');
        let questionHTML = '';
        
        if (questionData.question_type === 'chinese_to_english') {
            questionHTML = `
                <div class="quiz-question">
                    <div class="question-image"><img src="${questionData.image_url}" alt="" onerror="this.style.display='none'"></div>
                    <h3>請選擇「${questionData.question_text}」的英文：</h3>
                    <div class="quiz-options">
                        ${questionData.options.map((option, index) => `<button class="quiz-option-btn" data-answer="${option}">${String.fromCharCode(65 + index)}. ${option}</button>`).join('')}
                    </div>
                </div>
            `;
        } else if (questionData.question_type === 'english_to_chinese') {
            questionHTML = `
                <div class="quiz-question">
                    <div class="question-image"><img src="${questionData.image_url}" alt="" onerror="this.style.display='none'"></div>
                    <h3>請選擇「${questionData.question_text}」的中文：</h3>
                    <div class="quiz-options">
                        ${questionData.options.map((option, index) => `<button class="quiz-option-btn" data-answer="${option}">${String.fromCharCode(65 + index)}. ${option}</button>`).join('')}
                    </div>
                </div>
            `;
        } else if (questionData.question_type === 'spelling') {
            questionHTML = `
                <div class="quiz-question">
                    <h3>請拼出「${questionData.question_text}」的英文：</h3>
                    <div class="spelling-area">
                        <div class="answer-area" id="answerArea"></div>
                        <div class="letter-bank">
                            ${questionData.scrambled_letters.map(letter => `<button class="letter-btn" data-letter="${letter}">${letter}</button>`).join('')}
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
        
        if (questionData.question_type === 'spelling') {
            setupSpellingQuestion();
        } else {
            setupMultipleChoiceQuestion();
        }
    }

    function setupMultipleChoiceQuestion() {
        document.querySelectorAll('.quiz-option-btn').forEach(btn => {
            btn.addEventListener('click', () => submitQuizAnswer(btn.dataset.answer));
        });
    }

    function setupSpellingQuestion() {
        const answerArea = document.getElementById('answerArea');
        const letterBtns = document.querySelectorAll('.letter-btn');
        let currentAnswer = [];
        
        const updateAnswerArea = () => {
            answerArea.innerHTML = currentAnswer.map(letter => `<span class="answer-letter">${letter}</span>`).join('');
        };

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
        
        document.getElementById('clearSpelling').addEventListener('click', () => {
            currentAnswer = [];
            letterBtns.forEach(btn => { btn.disabled = false; btn.style.opacity = '1'; });
            updateAnswerArea();
        });
        
        document.getElementById('submitSpelling').addEventListener('click', () => {
            if (currentAnswer.length > 0) submitQuizAnswer(currentAnswer.join(''));
        });
    }

    async function submitQuizAnswer(answer) {
        const result = await api.submitQuizAnswer(currentQuestionId, answer);

        if (result && result.hasOwnProperty('is_correct')) {
            showAnswerResult(result.is_correct, result.correct_answer);
            setTimeout(() => {
                currentQuestionIndex++;
                if (currentQuestionIndex < quizTotalQuestions) {
                    loadQuizQuestion();
                } else {
                    completeQuiz();
                }
            }, 2000);
        } else {
            alert('提交答案失敗：' + (result.message || result.error));
        }
    }

    function showAnswerResult(isCorrect, correctAnswer) {
        const resultDiv = document.createElement('div');
        resultDiv.className = `answer-result ${isCorrect ? 'correct' : 'incorrect'}`;
        resultDiv.innerHTML = `
            <div class="result-icon">${isCorrect ? '✓' : '✗'}</div>
            <div class="result-text">${isCorrect ? '正確！' : `錯誤！正確答案是：${correctAnswer}`}</div>
        `;
        const quizContent = document.getElementById('quizContent');
        quizContent.appendChild(resultDiv);
        quizContent.querySelectorAll('button').forEach(btn => btn.disabled = true);
    }

    function updateQuizProgress() {
        const progressText = document.getElementById('quizProgress');
        const progressFill = document.getElementById('quizProgressFill');
        progressText.textContent = `${currentQuestionIndex + 1} / ${quizTotalQuestions}`;
        progressFill.style.width = `${((currentQuestionIndex + 1) / quizTotalQuestions) * 100}%`;
    }

    async function completeQuiz() {
        const result = await api.completeQuiz(currentQuizId);
        if (result && result.quiz_id) {
            showQuizResults(result);
        } else {
            alert('完成測驗失敗：' + (result.message || result.error));
        }
    }

    function showQuizResults(result) {
        const quizContainer = document.getElementById('quizContainer');
        quizContainer.innerHTML = `
            <div class="quiz-results">
                <div class="results-header"><h2>${result.is_passed ? '🎉 測驗通過！' : '😔 測驗未通過'}</h2></div>
                <div class="results-content">
                    <div class="score-display"><div class="score-circle ${result.is_passed ? 'passed' : 'failed'}"><span class="score-percentage">${result.score_percentage}%</span></div></div>
                    <div class="results-details">
                        <p><strong>正確答題：</strong>${result.correct_answers} / ${result.total_questions}</p>
                        <p><strong>通過標準：</strong>${result.pass_threshold}%</p>
                    </div>
                    ${result.is_passed ? '<div class="success-message"><p>恭喜！您已成功完成此單字本！</p></div>' : '<div class="retry-message"><p>請繼續努力，您可以重新學習後再次測驗。</p></div>'}
                    <div class="results-buttons">
                        <button class="btn btn-primary" id="backToBooksFromResults"><i class="fas fa-arrow-left"></i> 返回單字本列表</button>
                        ${!result.is_passed ? `<button class="btn btn-warning" id="retryQuiz"><i class="fas fa-redo"></i> 重新測驗</button>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('backToBooksFromResults').addEventListener('click', () => {
            quizContainer.remove();
            switchView('books');
            loadBooks();
        });
        
        if (!result.is_passed) {
            document.getElementById('retryQuiz').addEventListener('click', () => {
                quizContainer.remove();
                startQuiz();
            });
        }
    }

    function showLoginPrompt(message, redirectUrl) {
        const loginPrompt = document.createElement('div');
        loginPrompt.className = 'login-prompt-overlay';
        loginPrompt.innerHTML = `
            <div class="login-prompt-modal">
                <div class="login-prompt-header"><h3><i class="fas fa-sign-in-alt"></i> 需要登入</h3></div>
                <div class="login-prompt-body">
                    <p>${message}</p>
                    <div class="login-prompt-buttons">
                        <button class="btn btn-primary" id="goToLogin"><i class="fas fa-sign-in-alt"></i> 前往登入</button>
                        <button class="btn btn-secondary" id="cancelLogin"><i class="fas fa-times"></i> 取消</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(loginPrompt);
        
        document.getElementById('goToLogin').addEventListener('click', () => {
            window.location.href = redirectUrl;
        });
        document.getElementById('cancelLogin').addEventListener('click', () => loginPrompt.remove());
        loginPrompt.addEventListener('click', (e) => {
            if (e.target === loginPrompt) loginPrompt.remove();
        });
    }

    function handleApiError(response, data) {
        if (response.status === 401 && data.redirect) {
            showLoginPrompt(data.message, data.redirect);
            return true;
        }
        return false;
    }


    // --- Event Listeners ---
    createBookBtn.addEventListener('click', handleCreateBook);
    newBookNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCreateBook();
    });

    bookCardsContainer.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-book-btn');
        const deleteBtn = e.target.closest('.delete-book-btn');
        if (viewBtn) {
            handleViewBook(viewBtn.dataset.bookId);
        }
        if (deleteBtn) {
            handleDeleteBook(deleteBtn.dataset.bookId);
        }
    });

    backToBooksBtn.addEventListener('click', () => {
        switchView('books');
        loadBooks(); // Refresh book list to show updated word counts
    });

    addWordBtn.addEventListener('click', () => {
        englishWordInput.value = '';
        chineseWordInput.value = '';
        addWordModal.show();
    });

    saveWordBtn.addEventListener('click', handleSaveWord);

    wordCard.addEventListener('click', () => wordCard.classList.toggle('flipped'));
    flipCardBtn.addEventListener('click', () => wordCard.classList.toggle('flipped'));

    playAudioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const word = state.currentWords[state.currentWordIndex];
        if (word) {
            const audio = new Audio(`/play-word-audio?word=${encodeURIComponent(word.english)}`);
            audio.play();
        }
    });

    deleteWordBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteWord(e.currentTarget.dataset.wordId);
    });

    prevWordBtn.addEventListener('click', () => {
        if (state.currentWordIndex > 0) {
            state.currentWordIndex--;
            displayWord();
        }
    });

    nextWordBtn.addEventListener('click', () => {
        if (state.currentWordIndex < state.currentWords.length - 1) {
            state.currentWordIndex++;
            displayWord();
        } else if (state.currentWords.length > 0) {
            showCompletionWithQuizOption();
        }
    });

    // --- Initial Load ---
    loadBooks();
});
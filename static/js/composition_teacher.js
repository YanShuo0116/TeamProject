// static/js/composition_teacher.js

document.addEventListener('DOMContentLoaded', function () {
    // 當前活躍的段落
    let currentSection = 'introduction';

    // 當前模式狀態 (normal / elementary)
    let currentMode = 'normal';

    // 寫作提示內容
    const writingTips = {
        introduction: {
            title: "引言寫作技巧",
            content: `
                <div class="tip-item">
                    <h6><i class="fas fa-lightbulb"></i> 開頭策略</h6>
                    <p>• 用問句引起讀者興趣<br>
                    • 提出有趣的事實或統計數據<br>
                    • 簡述背景並提出論點</p>
                </div>
                <div class="tip-item">
                    <h6><i class="fas fa-target"></i> 結構建議</h6>
                    <p>• Hook (吸引注意)<br>
                    • Background (背景介紹)<br>
                    • Thesis Statement (論點陳述)</p>
                </div>
            `
        },
        body: {
            title: "內文寫作技巧",
            content: `
                <div class="tip-item">
                    <h6><i class="fas fa-list"></i> 段落組織</h6>
                    <p>• 每段一個主要論點<br>
                    • 使用主題句開始每段<br>
                    • 提供具體例子和證據</p>
                </div>
                <div class="tip-item">
                    <h6><i class="fas fa-link"></i> 連接詞使用</h6>
                    <p>• First, Second, Finally<br>
                    • However, Moreover, Therefore<br>
                    • For example, In addition</p>
                </div>
            `
        },
        conclusion: {
            title: "結論寫作技巧",
            content: `
                <div class="tip-item">
                    <h6><i class="fas fa-flag-checkered"></i> 總結策略</h6>
                    <p>• 重申主要論點<br>
                    • 總結關鍵證據<br>
                    • 提出未來展望或建議</p>
                </div>
                <div class="tip-item">
                    <h6><i class="fas fa-exclamation"></i> 避免事項</h6>
                    <p>• 不要引入新論點<br>
                    • 避免重複引言內容<br>
                    • 保持簡潔有力</p>
                </div>
            `
        }
    };

    // 初始化
    updateTeacherTips();

    // 段落切換事件
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (e) {
            const targetId = e.target.getAttribute('data-bs-target');
            if (targetId === '#intro-panel') currentSection = 'introduction';
            else if (targetId === '#body-panel') currentSection = 'body';
            else if (targetId === '#conclusion-panel') currentSection = 'conclusion';

            updateTeacherTips();
        });
    });

    // Elementary Mode Switch
    const modeSwitch = document.getElementById('elementaryModeSwitch');
    const modeStatusBadge = document.getElementById('modeStatusBadge');

    modeSwitch.addEventListener('change', function () {
        if (this.checked) {
            currentMode = 'elementary';
            modeStatusBadge.textContent = '國小英文模式';
            modeStatusBadge.classList.remove('bg-secondary');
            modeStatusBadge.classList.add('bg-primary');
        } else {
            currentMode = 'normal';
            modeStatusBadge.textContent = '正常模式';
            modeStatusBadge.classList.remove('bg-primary');
            modeStatusBadge.classList.add('bg-secondary');
        }
    });

    // 刷新AI建議按鈕
    document.getElementById('refresh-tips-btn').addEventListener('click', refreshAITips);

    // 隨機題目按鈕
    document.getElementById('random-topic-btn').addEventListener('click', generateRandomTopic);

    // 更新老師提示
    function updateTeacherTips() {
        const tipsContent = document.getElementById('teacher-tips-content');
        const tips = writingTips[currentSection];

        tipsContent.innerHTML = `
            <h6 class="text-primary">${tips.title}</h6>
            ${tips.content}
        `;
    }

    // 快捷問題按鈕事件
    document.querySelectorAll('.quick-question-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const question = this.getAttribute('data-question');
            document.getElementById('user-question-input').value = question;
            askAI();
        });
    });

    // 發送問題給AI
    document.getElementById('ask-ai-btn').addEventListener('click', askAI);
    document.getElementById('user-question-input').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            askAI();
        }
    });

    // 儲存作文
    document.getElementById('save-composition-btn').addEventListener('click', saveComposition);

    function askAI() {
        const questionInput = document.getElementById('user-question-input');
        const question = questionInput.value.trim();

        if (!question) {
            alert('請輸入問題');
            return;
        }

        // 獲取所有段落內容
        const sections = getSelectedSections();

        // 添加用戶消息到聊天記錄
        addChatMessage(question, 'user');

        // 添加載入中消息
        const loadingMessageId = addChatMessage('AI老師正在思考中...', 'ai-loading');

        // 清空輸入框
        questionInput.value = '';

        // 發送請求到後端
        fetch('/api/composition_feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                introduction: sections.introduction,
                body: sections.body,
                conclusion: sections.conclusion,
                current_section: currentSection,
                user_question: question + '（請使用繁體中文(英文輔助)，提供簡潔、條列式、有用的建議，將回覆限制在100字以內，並且不要使用任何"#","*"符號）',
                mode: currentMode  // 傳送當前模式
            })
        })
            .then(response => response.json())
            .then(data => {
                // 移除載入中消息
                document.getElementById(loadingMessageId).remove();

                if (data.success) {
                    // 添加AI回應
                    addChatMessage(data.feedback, 'ai');
                } else {
                    addChatMessage('抱歉，處理您的問題時發生錯誤：' + (data.message || '未知錯誤'), 'ai-error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById(loadingMessageId).remove();
                addChatMessage('網路錯誤，請稍後再試', 'ai-error');
            });
    }

    function getSelectedSections() {
        return {
            introduction: document.getElementById('introduction-text').value,
            body: document.getElementById('body-text').value,
            conclusion: document.getElementById('conclusion-text').value
        };
    }


    function addChatMessage(message, type) {
        const chatHistory = document.getElementById('chat-history');
        const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `chat-message chat-message-${type}`;
        messageDiv.textContent = message;

        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        return messageId;
    }


    function refreshAITips() {
        const sections = getSelectedSections();
        const currentContent = sections[currentSection];

        if (!currentContent || currentContent.trim() === '') {
            alert('請先在當前段落撰寫一些內容，AI才能給出個人化建議');
            return;
        }

        // 顯示載入狀態
        const tipsContent = document.getElementById('teacher-tips-content');
        tipsContent.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> AI正在分析您的內容...</p>';

        // 發送請求獲取AI建議
        fetch('/api/composition_feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                introduction: sections.introduction,
                body: sections.body,
                conclusion: sections.conclusion,
                current_section: currentSection,
                user_question: `請針對我的${getSectionName(currentSection)}段落，提供2-3個簡潔、條列式、有用的寫作建議。請用繁體中文回答(英文輔助)，將回覆限制在100字以內，不要有任何多餘的開頭或結語，並且不要使用任何"#","*"符號。`,
                mode: currentMode  // 傳送當前模式
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    tipsContent.innerHTML = `
                    <div class="ai-tip-response">
                        <h6 class="text-primary"><i class="fas fa-robot"></i> AI個人化建議</h6>
                        <div class="tip-content">${data.feedback.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
                } else {
                    tipsContent.innerHTML = '<p class="text-danger">獲取AI建議失敗，請稍後再試</p>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                tipsContent.innerHTML = '<p class="text-danger">網路錯誤，請稍後再試</p>';
            });
    }

    function generateRandomTopic() {
        const topics = [
            "My Favorite Season",
            "My Dream Job",
            "The Importance of Protecting the Environment",
            "My Most Unforgettable Day",
            "How Technology Affects Our Lives",
            "My Favorite Sport",
            "The Importance of Healthy Eating",
            "My Hometown",
            "The Benefits of Reading",
            "The Person I Admire Most",
            "The Meaning of Travel",
            "The Value of Friendship",
            "My Experience Learning English",
            "My Hobbies and Interests",
            "My Future School Life"
        ];

        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        document.getElementById('composition-title').value = randomTopic;
    }


    function getSectionName(section) {
        const names = {
            'introduction': '引言',
            'body': '內文',
            'conclusion': '結論'
        };
        return names[section] || section;
    }

    function saveComposition() {
        const title = document.getElementById('composition-title').value.trim();
        const sections = getSelectedSections();

        if (!title) {
            alert('請輸入作文標題');
            return;
        }

        if (!sections.introduction && !sections.body && !sections.conclusion) {
            alert('請至少撰寫一個段落');
            return;
        }

        // 顯示載入狀態
        const saveBtn = document.getElementById('save-composition-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>AI批改中...';
        saveBtn.disabled = true;

        // 組合完整作文內容
        let fullContent = '';
        if (sections.introduction) {
            fullContent += '【引言】\n' + sections.introduction + '\n\n';
        }
        if (sections.body) {
            fullContent += '【內文】\n' + sections.body + '\n\n';
        }
        if (sections.conclusion) {
            fullContent += '【結論】\n' + sections.conclusion;
        }

        // 先獲取AI評語
        fetch('/api/composition_feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                introduction: sections.introduction,
                body: sections.body,
                conclusion: sections.conclusion,
                current_section: 'all',
                user_question: '你是一位專業的英文作文老師。請用繁體中文，以條列式對我的整篇作文進行批改，提供簡潔但具體的評語。將總回覆限制在250字以內，不要使用任何"#","*"符號。請包含：1. 優點。2. 主要建議。3. 語法或詞彙修正。',
                mode: currentMode  // 傳送當前模式
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const aiEvaluation = data.feedback;

                    // 發送儲存請求
                    return fetch('/composition/save_teacher', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            title: title,
                            content: fullContent,
                            sections: sections,
                            ai_evaluation: aiEvaluation
                        })
                    });
                } else {
                    throw new Error('AI批改失敗');
                }
            })
            .then(response => response.json())
            .then(data => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;

                if (data.success && data.composition_id) {
                    // 直接重定向到新的作文查看頁面
                    window.location.href = '/composition/view/' + data.composition_id;
                } else {
                    alert('儲存失敗：' + (data.message || '未知錯誤'));
                }
            })
    }
});
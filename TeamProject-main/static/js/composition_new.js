document.addEventListener('DOMContentLoaded', function() {
    let currentStep = 1;
    let compositionData = {};

    // 步驟管理
    function showStep(step) {
        // 隱藏所有步驟
        document.querySelectorAll('.step-content').forEach(section => {
            section.classList.remove('active');
        });
        
        // 顯示當前步驟
        document.getElementById(`step${step}`).classList.add('active');
        
        // 更新進度條
        document.querySelectorAll('.progress-bar .step').forEach((stepEl, index) => {
            stepEl.classList.remove('active', 'completed');
            if (index + 1 < step) {
                stepEl.classList.add('completed');
            } else if (index + 1 === step) {
                stepEl.classList.add('active');
            }
        });
        
        // 顯示當前題目（步驟2以後）
        if (step >= 2 && compositionData.essay_topic) {
            updateCurrentTopicDisplay(step);
        }
        
        // 更新導航按鈕
        document.getElementById('prev-btn').disabled = step === 1;
        updateNextButton(step);
        
        currentStep = step;
    }

    function updateCurrentTopicDisplay(step) {
        const topicDisplays = [
            'current-topic',
            'current-topic-step3', 
            'current-topic-step4',
            'current-topic-step5'
        ];
        
        const topicTexts = [
            'topic-display',
            'topic-display-step3',
            'topic-display-step4', 
            'topic-display-step5'
        ];
        
        // 更新對應步驟的題目顯示
        if (step >= 2 && step <= 5) {
            const displayElement = document.getElementById(topicDisplays[step - 2]);
            const textElement = document.getElementById(topicTexts[step - 2]);
            
            if (displayElement && textElement) {
                textElement.textContent = compositionData.essay_topic;
                displayElement.style.display = 'block';
            }
        }
    }

    function updateNextButton(step) {
        const nextBtn = document.getElementById('next-btn');
        
        switch(step) {
            case 1:
                nextBtn.disabled = !compositionData.essay_topic;
                nextBtn.innerHTML = '下一步 <i class="fas fa-chevron-right"></i>';
                nextBtn.style.display = 'inline-flex';
                break;
            case 2:
                nextBtn.disabled = !compositionData.paragraph_theme;
                nextBtn.innerHTML = '下一步 <i class="fas fa-chevron-right"></i>';
                nextBtn.style.display = 'inline-flex';
                break;
            case 3:
                // 檢查是否至少有一個關鍵點被填寫
                const hasKeypoints = checkUserKeypoints();
                nextBtn.disabled = !hasKeypoints;
                nextBtn.innerHTML = '下一步 <i class="fas fa-chevron-right"></i>';
                nextBtn.style.display = 'inline-flex';
                break;
            case 4:
                // 檢查是否至少有一個主題句被填寫
                const hasSentences = checkUserSentences();
                nextBtn.disabled = !hasSentences;
                nextBtn.innerHTML = '下一步 <i class="fas fa-chevron-right"></i>';
                nextBtn.style.display = 'inline-flex';
                break;
            case 5:
                nextBtn.style.display = 'none';
                break;
        }
    }

    function checkUserKeypoints() {
        for (let i = 1; i <= 5; i++) {
            const textarea = document.getElementById(`keypoint-${i}`);
            if (textarea && textarea.value.trim()) {
                return true;
            }
        }
        return false;
    }

    function checkUserSentences() {
        for (let i = 1; i <= 5; i++) {
            const textarea = document.getElementById(`sentence-${i}`);
            if (textarea && textarea.value.trim()) {
                return true;
            }
        }
        return false;
    }

    // 步驟 1: 主題選擇
    document.querySelectorAll('.topic-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const topic = this.dataset.topic;
            generateTopic(topic);
        });
    });

    document.getElementById('set-custom-topic-btn').addEventListener('click', function() {
        const customTopic = document.getElementById('custom-topic').value.trim();
        if (customTopic) {
            setCustomTopic(customTopic);
        } else {
            alert('請輸入自訂題目');
        }
    });

    document.getElementById('regenerate-topic-btn').addEventListener('click', function() {
        if (compositionData.topic_category && compositionData.topic_category !== 'custom') {
            generateTopic(compositionData.topic_category);
        }
    });

    // 步驟 2: 段落主題
    document.getElementById('generate-themes-btn').addEventListener('click', function() {
        if (this.disabled) return;
        
        const keywords = [];
        for (let i = 1; i <= 5; i++) {
            const keyword = document.getElementById(`keyword-${i}`).value.trim();
            if (keyword) {
                keywords.push(keyword);
            }
        }
        
        if (keywords.length === 0) {
            showCustomAlert('請至少填寫一個想法！', 'warning');
            return;
        }
        
        const keywordsString = keywords.join(', ');
        generateParagraphThemes(keywordsString);
        
        // 鎖定按鈕
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-check"></i> 已使用AI建議';
        this.classList.add('btn-disabled');
    });

    // 步驟 3: 關鍵點
    document.getElementById('generate-keypoints-btn').addEventListener('click', function() {
        if (this.disabled) return;
        
        generateKeyPoints();
        
        // 鎖定按鈕
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-check"></i> 已使用AI建議';
        this.classList.add('btn-disabled');
    });

    // 關鍵點輸入監聽 - 使用事件委託
    document.addEventListener('input', function(e) {
        if (e.target.id && e.target.id.startsWith('keypoint-')) {
            updateNextButton(3);
        }
        if (e.target.id && e.target.id.startsWith('sentence-')) {
            updateNextButton(4);
        }
    });

    // 匯入按鈕 - 使用事件委託
    document.addEventListener('click', function(e) {
        // 匯入關鍵點詞彙
        if (e.target.classList.contains('import-keypoint-btn') || 
            e.target.closest('.import-keypoint-btn')) {
            const btn = e.target.classList.contains('import-keypoint-btn') ? 
                       e.target : e.target.closest('.import-keypoint-btn');
            const paragraph = btn.dataset.paragraph;
            importKeypoint(paragraph);
        }
        
        // 匯入主題句
        if (e.target.classList.contains('import-sentence-btn') || 
            e.target.closest('.import-sentence-btn')) {
            const btn = e.target.classList.contains('import-sentence-btn') ? 
                       e.target : e.target.closest('.import-sentence-btn');
            const paragraph = btn.dataset.paragraph;
            importSentence(paragraph);
        }
    });

    // 步驟 4: 主題句
    document.getElementById('generate-sentences-btn').addEventListener('click', function() {
        if (this.disabled) return;
        
        // 收集用戶的關鍵點
        const userKeypoints = [];
        for (let i = 1; i <= 5; i++) {
            const textarea = document.getElementById(`keypoint-${i}`);
            if (textarea) {
                userKeypoints.push(textarea.value.trim());
            }
        }
        generateTopicSentences(userKeypoints);
        
        // 鎖定按鈕
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-check"></i> 已使用AI範本';
        this.classList.add('btn-disabled');
    });

    // 主題句輸入監聽已在上面的事件委託中處理
    // 匯入主題句按鈕已在上面的事件委託中處理

    // 步驟 5: 完整作文
    document.getElementById('generate-essay-btn').addEventListener('click', function() {
        generateFinalEssay();
    });

    // 移除重複的事件監聽器，使用下面的事件委託

    document.getElementById('save-essay-btn').addEventListener('click', function() {
        saveEssay();
    });

    // 獲得評語按鈕
    document.addEventListener('click', function(e) {
        if (e.target.id === 'get-feedback-btn') {
            if (e.target.disabled) return;
            getFeedback();
            // 鎖定按鈕
            e.target.disabled = true;
            e.target.innerHTML = '<i class="fas fa-check"></i> 已獲得評語';
            e.target.classList.add('btn-disabled');
        }
        
        if (e.target.id === 'refine-essay-btn') {
            if (e.target.disabled) return;
            refineEssay();
            // 鎖定按鈕
            e.target.disabled = true;
            e.target.innerHTML = '<i class="fas fa-check"></i> 已完整潤飾';
            e.target.classList.add('btn-disabled');
        }
        
        if (e.target.id === 'restore-essay-btn') {
            restoreOriginalEssay();
        }
    });

    // 導航按鈕
    document.getElementById('prev-btn').addEventListener('click', function() {
        if (currentStep > 1) {
            showStep(currentStep - 1);
        }
    });

    document.getElementById('next-btn').addEventListener('click', function() {
        if (currentStep < 5) {
            showStep(currentStep + 1);
        }
    });

    // API 調用函數
    function generateTopic(topicCategory) {
        showLoading('topic-loading');
        
        fetch('/composition/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'generate_topic',
                topic_category: topicCategory
            })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading('topic-loading');
            if (data.success) {
                compositionData.topic_category = topicCategory;
                compositionData.essay_topic = data.essay_topic;
                
                document.getElementById('topic-text').textContent = data.essay_topic;
                document.getElementById('generated-topic').style.display = 'block';
                updateNextButton(1);
            } else {
                alert('生成題目失敗，請稍後再試');
            }
        })
        .catch(error => {
            hideLoading('topic-loading');
            console.error('Error:', error);
            alert('生成題目失敗，請稍後再試');
        });
    }

    function setCustomTopic(customTopic) {
        fetch('/composition/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'set_custom_topic',
                custom_topic: customTopic
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                compositionData.topic_category = 'custom';
                compositionData.essay_topic = data.essay_topic;
                
                document.getElementById('topic-text').textContent = data.essay_topic;
                document.getElementById('generated-topic').style.display = 'block';
                document.getElementById('regenerate-topic-btn').style.display = 'none';
                updateNextButton(1);
            } else {
                alert('設定題目失敗，請稍後再試');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('設定題目失敗，請稍後再試');
        });
    }

    function generateParagraphThemes(keywords) {
        showLoading('themes-loading');
        
        fetch('/composition/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'generate_paragraph_themes',
                keywords: keywords
            })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading('themes-loading');
            if (data.success) {
                compositionData.paragraph_theme = data.paragraph_theme;
                compositionData.keywords = keywords;
                
                displayParagraphThemes(data.paragraph_theme);
                updateNextButton(2);
            } else {
                alert('生成段落主題失敗，請稍後再試');
            }
        })
        .catch(error => {
            hideLoading('themes-loading');
            console.error('Error:', error);
            alert('生成段落主題失敗，請稍後再試');
        });
    }

    function generateKeyPoints() {
        showLoading('keypoints-loading');
        
        fetch('/composition/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'generate_key_points'
            })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading('keypoints-loading');
            if (data.success) {
                compositionData.key_points = data.key_points;
                
                displayKeyPoints(data.key_points);
                updateNextButton(3);
            } else {
                alert('生成關鍵點失敗，請稍後再試');
            }
        })
        .catch(error => {
            hideLoading('keypoints-loading');
            console.error('Error:', error);
            alert('生成關鍵點失敗，請稍後再試');
        });
    }

    function generateTopicSentences(userKeypoints) {
        showLoading('sentences-loading');
        
        fetch('/composition/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'generate_topic_sentences',
                user_keypoints: userKeypoints
            })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading('sentences-loading');
            if (data.success) {
                compositionData.topic_sentences = data.topic_sentences;
                
                displayTopicSentences(data.topic_sentences);
                updateNextButton(4);
            } else {
                alert('生成主題句失敗，請稍後再試');
            }
        })
        .catch(error => {
            hideLoading('sentences-loading');
            console.error('Error:', error);
            alert('生成主題句失敗，請稍後再試');
        });
    }

    function generateFinalEssay() {
        // 收集用戶編輯的主題句
        const userTopicSentences = [];
        for (let i = 1; i <= 5; i++) {
            const textarea = document.getElementById(`sentence-${i}`);
            if (textarea && textarea.value.trim()) {
                userTopicSentences.push(textarea.value.trim());
            }
        }

        if (userTopicSentences.length === 0) {
            showCustomAlert('請至少完成一個段落的主題句', 'warning');
            return;
        }

        // 直接組合主題句，不使用AI
        const combinedSentences = userTopicSentences.join('\n\n');
        
        // 顯示編輯器並填入組合的主題句
        document.getElementById('essay-editor').value = combinedSentences;
        document.getElementById('essay-editor-section').style.display = 'block';
        
        showCustomAlert('✅ 主題句已組合完成！請將它們擴展成完整的作文段落。', 'success');
    }

    function refineEssay() {
        const essayContent = document.getElementById('essay-editor').value.trim();
        
        if (!essayContent) {
            showCustomAlert('請先完成作文內容', 'warning');
            return;
        }

        // 備份原始作文內容
        const originalContent = essayContent;
        compositionData.originalEssay = originalContent;

        showLoading('essay-loading');
        
        fetch('/composition/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'refine_essay',
                essay: essayContent
            })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading('essay-loading');
            if (data.success && data.refined_essay) {
                // 將潤飾後的作文放回編輯器
                document.getElementById('essay-editor').value = data.refined_essay;
                // 顯示恢復按鈕
                document.getElementById('restore-essay-btn').style.display = 'inline-flex';
                showCustomAlert('✨ AI老師已幫你完整和潤飾作文！請檢查修改後的內容。', 'success');
            } else {
                // 如果失敗，恢復原始內容
                document.getElementById('essay-editor').value = originalContent;
                showCustomAlert('❌ 作文潤飾失敗：' + (data.error || '請稍後再試'), 'error');
            }
        })
        .catch(error => {
            hideLoading('essay-loading');
            console.error('Error:', error);
            // 如果出錯，恢復原始內容
            document.getElementById('essay-editor').value = originalContent;
            showCustomAlert('❌ 作文潤飾失敗，已恢復原始內容', 'error');
        });
    }

    function restoreOriginalEssay() {
        if (compositionData.originalEssay) {
            document.getElementById('essay-editor').value = compositionData.originalEssay;
            document.getElementById('restore-essay-btn').style.display = 'none';
            showCustomAlert('🔄 已恢復到潤飾前的版本', 'info');
        } else {
            showCustomAlert('❌ 沒有找到潤飾前的版本', 'warning');
        }
    }

    function getFeedback() {
        const essayContent = document.getElementById('essay-editor').value.trim();
        
        if (!essayContent) {
            showCustomAlert('請先完成作文內容', 'warning');
            return;
        }
        
        showLoading('essay-loading');
        
        fetch('/composition/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'get_feedback',
                essay: essayContent
            })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading('essay-loading');
            if (data.success) {
                compositionData.translation = data.translation;
                compositionData.evaluation = data.evaluation;
                
                document.getElementById('essay-translation').innerHTML = data.translation.replace(/\n/g, '<br>');
                document.getElementById('essay-evaluation').innerHTML = data.evaluation.replace(/\n/g, '<br>');
                document.getElementById('final-essay').style.display = 'block';
                
                // 更新作文內容到資料庫
                compositionData.essay = essayContent;
            } else {
                alert('獲得評語失敗：' + (data.error || '請稍後再試'));
            }
        })
        .catch(error => {
            hideLoading('essay-loading');
            console.error('Error:', error);
            alert('獲得評語失敗，請稍後再試');
        });
    }

    function saveEssay() {
        const essayContent = document.getElementById('essay-editor').value.trim();
        
        if (!essayContent) {
            showCustomAlert('請先完成作文內容', 'warning');
            return;
        }
        
        if (!compositionData.essay_topic) {
            showCustomAlert('請先選擇作文題目', 'warning');
            return;
        }
        
        showLoading('essay-loading');
        
        fetch('/composition/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'save_essay',
                essay_topic: compositionData.essay_topic,
                essay_content: essayContent,
                translation: compositionData.translation || '',
                evaluation: compositionData.evaluation || ''
            })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading('essay-loading');
            if (data.success) {
                compositionData.composition_id = data.composition_id;
                showCustomAlert('🎉 作文儲存成功！', 'success', () => {
                    window.location.href = '/composition';
                });
            } else {
                showCustomAlert('儲存失敗：' + (data.error || '請稍後再試'), 'error');
            }
        })
        .catch(error => {
            hideLoading('essay-loading');
            console.error('Error:', error);
            showCustomAlert('儲存失敗，請稍後再試', 'error');
        });
    }

    // 顯示函數
    function displayParagraphThemes(themes) {
        const themesList = document.getElementById('themes-list');
        const lines = themes.split('\n');
        
        themesList.innerHTML = lines.map((line, index) => {
            if (line.trim()) {
                return `<div class="theme-item">
                    <strong>${line.split(':')[0]}:</strong> ${line.split(':')[1] || ''}
                </div>`;
            }
            return '';
        }).join('');
        
        document.getElementById('paragraph-themes').style.display = 'block';
        
        // 同時顯示在步驟3
        const themesDisplay = document.getElementById('themes-display');
        if (themesDisplay) {
            themesDisplay.innerHTML = lines.map((line, index) => {
                if (line.trim()) {
                    return `<div class="theme-item">
                        <strong>${line.split(':')[0]}:</strong> ${line.split(':')[1] || ''}
                    </div>`;
                }
                return '';
            }).join('');
            document.getElementById('paragraph-themes-display').style.display = 'block';
        }
    }

    function generateKeyPoints() {
        showLoading('keypoints-loading');
        
        fetch('/composition/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'generate_key_points'
            })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading('keypoints-loading');
            if (data.success) {
                compositionData.key_points = data.key_points;
                
                displayKeyPoints(data.key_points);
            } else {
                alert('生成關鍵點失敗，請稍後再試');
            }
        })
        .catch(error => {
            hideLoading('keypoints-loading');
            console.error('Error:', error);
            alert('生成關鍵點失敗，請稍後再試');
        });
    }

    function displayKeyPoints(keyPoints) {
        const keypointsList = document.getElementById('keypoints-list');
        const lines = keyPoints.split('\n');
        
        // 儲存AI詞彙供匯入使用
        compositionData.ai_keypoints = lines.filter(line => line.trim());
        
        keypointsList.innerHTML = lines.map((line, index) => {
            if (line.trim()) {
                return `<div class="keypoint-item">
                    <strong>${line.split(':')[0]}:</strong> ${line.split(':')[1] || ''}
                </div>`;
            }
            return '';
        }).join('');
        
        document.getElementById('key-points').style.display = 'block';
    }

    function importKeypoint(paragraph) {
        if (!compositionData.ai_keypoints) {
            showCustomAlert('請先請AI老師準備詞彙建議！', 'warning');
            return;
        }
        
        const paragraphIndex = parseInt(paragraph) - 1;
        if (paragraphIndex < compositionData.ai_keypoints.length) {
            const keypoint = compositionData.ai_keypoints[paragraphIndex];
            const content = keypoint.split(':')[1] ? keypoint.split(':')[1].trim() : '';
            const textarea = document.getElementById(`keypoint-${paragraph}`);
            if (textarea) {
                // 如果已有內容，在後面添加，否則直接設置
                if (textarea.value.trim()) {
                    textarea.value += ', ' + content;
                } else {
                    textarea.value = content;
                }
                updateNextButton(3);
            }
        }
    }

    function displayTopicSentences(topicSentences) {
        const sentencesExamples = document.getElementById('sentences-examples');
        const lines = topicSentences.split('\n');
        
        // 儲存AI例子供匯入使用
        compositionData.ai_sentences = lines.filter(line => line.trim());
        
        sentencesExamples.innerHTML = lines.map((line, index) => {
            if (line.trim()) {
                const parts = line.split(':');
                const paragraphNum = index + 1;
                const sentence = parts[1] ? parts[1].trim() : '';
                
                return `<div class="sentence-example" style="background: rgba(0, 123, 255, 0.1); padding: 15px; margin: 10px 0; border-radius: 5px;">
                    <strong>第${paragraphNum}段例子：</strong> ${sentence}
                </div>`;
            }
            return '';
        }).join('');
        
        document.getElementById('topic-sentences-section').style.display = 'block';
    }

    function importSentence(paragraph) {
        if (!compositionData.ai_sentences) {
            showCustomAlert('請先請AI老師準備例子！', 'warning');
            return;
        }
        
        const paragraphIndex = parseInt(paragraph) - 1;
        if (paragraphIndex < compositionData.ai_sentences.length) {
            const example = compositionData.ai_sentences[paragraphIndex];
            const content = example.split(':')[1] ? example.split(':')[1].trim() : '';
            const textarea = document.getElementById(`sentence-${paragraph}`);
            if (textarea) {
                textarea.value = content;
                updateNextButton(4);
            }
        }
    }

    // 工具函數
    function showLoading(elementId) {
        document.getElementById(elementId).style.display = 'block';
    }

    function hideLoading(elementId) {
        document.getElementById(elementId).style.display = 'none';
    }

    // 美化的彈出視窗
    function showCustomAlert(message, type = 'info', callback = null) {
        // 移除現有的彈出視窗
        const existingAlert = document.querySelector('.custom-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // 創建彈出視窗
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert custom-alert-${type}`;
        
        const iconMap = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };

        alertDiv.innerHTML = `
            <div class="custom-alert-content">
                <div class="custom-alert-icon">
                    <i class="${iconMap[type] || iconMap['info']}"></i>
                </div>
                <div class="custom-alert-message">${message}</div>
                <button class="custom-alert-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(alertDiv);

        // 動畫效果
        setTimeout(() => {
            alertDiv.classList.add('show');
        }, 10);

        // 自動關閉
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.classList.remove('show');
                setTimeout(() => {
                    if (alertDiv.parentElement) {
                        alertDiv.remove();
                        if (callback) callback();
                    }
                }, 300);
            }
        }, type === 'success' ? 2000 : 3000);

        // 點擊關閉
        alertDiv.querySelector('.custom-alert-close').addEventListener('click', () => {
            alertDiv.classList.remove('show');
            setTimeout(() => {
                if (alertDiv.parentElement) {
                    alertDiv.remove();
                    if (callback) callback();
                }
            }, 300);
        });
    }

    // 初始化
    showStep(1);
});
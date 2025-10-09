// speaking_practice.js - 口說練習功能

// 安全解析 JSON，若非 JSON 回應（例如被導向到 HTML 登入頁）則回傳 { nonJson: true, text }
async function parseJsonSafely(response) {
    try {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await response.text();
            return { nonJson: true, status: response.status, text };
        }
        const data = await response.json();
        return { nonJson: false, status: response.status, data };
    } catch (err) {
        const text = await response.text().catch(() => '');
        return { nonJson: true, status: response.status, text: text || String(err) };
    }
}

class SpeakingPractice {
    constructor() {
        this.currentLevel = 'A1';
        this.currentTopicId = null;
        this.currentSessionId = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.usedScenarios = new Set(); // 追蹤已使用的情境
        this.questionCount = 0; // 問題計數器
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTopics();
        // 移除此處的 setupAudioRecording，延遲到用戶點擊錄音時再執行
        // this.setupAudioRecording(); 
    }

    bindEvents() {
        // CEFR等級選擇
        document.getElementById('cefrSelect').addEventListener('change', (e) => {
            this.currentLevel = e.target.value;
            this.updateTopicCards();
        });

        // 返回主題選擇
        document.getElementById('backToTopicsBtn').addEventListener('click', () => {
            this.showTopicSelection();
        });

        // 錄音控制
        document.getElementById('recordBtn').addEventListener('click', () => {
            this.startRecording();
        });

        document.getElementById('stopRecordBtn').addEventListener('click', () => {
            this.stopRecording();
        });

        document.getElementById('reRecordBtn').addEventListener('click', () => {
            this.reRecord();
        });

        document.getElementById('submitAudioBtn').addEventListener('click', () => {
            this.submitAudio();
        });

        // 會話控制
        document.getElementById('nextQuestionBtn').addEventListener('click', () => {
            this.showTopicSelection();
        });

        document.getElementById('endSessionBtn').addEventListener('click', () => {
            this.endSession();
        });

        // Custom Topic
        document.getElementById('startCustomTopicBtn').addEventListener('click', () => {
            this.startCustomPractice();
        });
    }

    async loadTopics() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/speaking/topics');
            const data = await response.json();
            
            if (data.success) {
                this.topics = data.topics;
                this.cefrLevels = data.cefr_levels;
                this.renderTopicCards();
            } else {
                console.error('載入主題失敗:', data.error);
                // 使用備用的靜態主題
                this.loadStaticTopics();
            }
        } catch (error) {
            console.error('載入主題時發生錯誤:', error);
            // 使用備用的靜態主題
            this.loadStaticTopics();
        } finally {
            this.showLoading(false);
        }
    }

    loadStaticTopics() {
        // 備用的靜態主題數據
        this.topics = {
            1: {
                title: "Introducing Yourself",
                description: "學生彼此初次見面，自我介紹名字、年級、興趣",
                icon: "fas fa-user"
            },
            2: {
                title: "Ordering Food", 
                description: "在速食店或餐廳點餐，含點餐、加點、結帳",
                icon: "fas fa-utensils"
            },
            3: {
                title: "Asking for Directions",
                description: "在街上問路，如問怎麼走到圖書館或捷運站", 
                icon: "fas fa-map-marked-alt"
            },
            4: {
                title: "At the Supermarket",
                description: "問價錢、詢問商品在哪裡、結帳互動",
                icon: "fas fa-shopping-cart"
            },
            5: {
                title: "Making an Appointment",
                description: "跟醫院、牙醫、理髮店預約時間",
                icon: "fas fa-calendar-check"
            },
            6: {
                title: "Shopping for Clothes",
                description: "在服飾店選衣服、詢問尺寸、試穿與付款",
                icon: "fas fa-tshirt"
            },
            7: {
                title: "At the Doctor's Office",
                description: "說明身體不適的症狀，醫師給建議",
                icon: "fas fa-stethoscope"
            },
            8: {
                title: "Talking about Daily Routines",
                description: "描述平日作息，例如幾點起床、上學、做功課等",
                icon: "fas fa-clock"
            },
            9: {
                title: "Asking for Help",
                description: "在校園裡請老師/同學幫忙找東西、搬東西、解釋問題",
                icon: "fas fa-hands-helping"
            },
            10: {
                title: "Making Invitations",
                description: "邀請朋友參加生日派對、看電影、去公園等",
                icon: "fas fa-envelope"
            },
            11: {
                title: "Talking about Hobbies",
                description: "描述自己的興趣，例如打球、畫畫、聽音樂等",
                icon: "fas fa-heart"
            },
            12: {
                title: "Talking about the Weather",
                description: "今天的天氣如何、適合做什麼活動（可延伸到旅遊）",
                icon: "fas fa-cloud-sun"
            }
        };
        
        this.renderTopicCards();
    }

    renderTopicCards() {
        const container = document.getElementById('topicCardsContainer');
        container.innerHTML = '';

        // 檢查是否有主題數據
        if (!this.topics) {
            container.innerHTML = '<div class="col-12 text-center"><p>載入主題中...</p></div>';
            return;
        }

        // 遍歷主題對象
        Object.keys(this.topics).forEach(topicId => {
            const topic = this.topics[topicId];
            const card = document.createElement('div');
            card.className = 'col-md-4 mb-3';
            card.innerHTML = `
                <div class="card topic-card" data-topic-id="${topicId}">
                    <div class="card-body">
                        <h5 class="card-title">
                            <i class="${topic.icon || 'fas fa-comments'} me-2"></i>
                            ${topic.title}
                        </h5>
                        <p class="card-text">${topic.description}</p>
                        <button class="btn btn-primary btn-sm start-topic-btn">
                            <i class="fas fa-play me-1"></i>
                            開始練習
                        </button>
                    </div>
                </div>
            `;

            // 添加點擊事件
            const startBtn = card.querySelector('.start-topic-btn');
            startBtn.addEventListener('click', () => {
                this.startTopic(parseInt(topicId), topic.title);
            });

            container.appendChild(card);
        });
    }

    updateTopicCards() {
        // 根據選擇的CEFR等級更新主題卡片的顯示
        const cards = document.querySelectorAll('.topic-card');
        cards.forEach(card => {
            // 這裡可以根據難度等級來啟用/禁用某些主題
            card.classList.remove('disabled');
        });
    }

    async startTopic(topicId, topicTitle) {
        // 檢查是否選擇了難度等級
        if (!this.currentLevel) {
            showErrorModal('請先選擇CEFR難度等級');
            return;
        }

        this.currentTopicId = topicId;
        
        // 顯示載入指示器
        this.showLoading(true);
        
        try {
            // 調用API開始新的練習會話
            const response = await fetch('/api/speaking/start_session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic_id: topicId,
                    cefr_level: this.currentLevel
                })
            });

            const parsed = await parseJsonSafely(response);
            if (parsed.nonJson) {
                console.error('開始會話回傳非JSON:', parsed.text);
                showErrorModal('開始練習失敗：伺服器回傳非JSON（可能未登入或反向代理攔截）。');
                return;
            }
            const data = parsed.data;

            if (data.success) {
                this.currentSessionId = data.session_id;
                console.log(`開始練習會話: ${data.session_id}, 主題: ${topicTitle}, 難度: ${this.currentLevel}`);
                
                // 切換到聊天室界面
                this.showChatInterface(topicTitle);
                
                // 生成第一個問題
                this.generateFirstQuestion();
                
            } else if (data.redirect) {
                // 需要登入
                showErrorModal(data.message);
                window.location.href = data.redirect;
            } else {
                throw new Error(data.error || '開始會話失敗');
            }
            
        } catch (error) {
            console.error('開始練習失敗:', error);
            showErrorModal(`開始練習失敗: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async startCustomPractice() {
        const topicTitle = document.getElementById('customTopicInput').value.trim();
        if (!topicTitle) {
            showErrorModal('請輸入自訂主題');
            return;
        }

        if (!this.currentLevel) {
            showErrorModal('請先選擇CEFR難度等級');
            return;
        }

        this.currentTopicId = 'custom';
        
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/speaking/start_session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic_id: 'custom',
                    custom_topic: topicTitle,
                    cefr_level: this.currentLevel
                })
            });

            const parsed = await parseJsonSafely(response);
            if (parsed.nonJson) {
                console.error('開始自訂練習回傳非JSON:', parsed.text);
                showErrorModal('開始自訂練習失敗：伺服器回傳非JSON（可能未登入或反向代理攔截）。');
                return;
            }
            const data = parsed.data;

            if (data.success) {
                this.currentSessionId = data.session_id;
                console.log(`開始自訂練習會話: ${data.session_id}, 主題: ${topicTitle}, 難度: ${this.currentLevel}`);
                
                this.showChatInterface(topicTitle);
                
                this.generateFirstQuestion();
                
            } else if (data.redirect) {
                showErrorModal(data.message);
                window.location.href = data.redirect;
            } else {
                throw new Error(data.error || '開始會話失敗');
            }
            
        } catch (error) {
            console.error('開始自訂練習失敗:', error);
            showErrorModal(`開始自訂練習失敗: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    showChatInterface(topicTitle) {
        // 隱藏主題選擇，顯示聊天室
        document.getElementById('topicSelectionSection').style.display = 'none';
        document.getElementById('chatSection').style.display = 'block';
        
        // 更新標題和難度顯示
        document.getElementById('currentTopicTitle').textContent = topicTitle;
        document.getElementById('currentDifficulty').textContent = this.currentLevel;
        
        // 清空聊天記錄
        document.getElementById('chatMessages').innerHTML = '';

        // 顯示控制按鈕
        document.getElementById('nextQuestionBtn').style.display = 'inline-block';
        document.getElementById('endSessionBtn').style.display = 'inline-block';
    }

    showTopicSelection() {
        // 顯示主題選擇，隱藏聊天室
        document.getElementById('topicSelectionSection').style.display = 'block';
        document.getElementById('chatSection').style.display = 'none';
        
        // 重置狀態
        this.resetSessionState();
        this.currentTopicId = null;
    }

    async generateFirstQuestion() {
        // 簡化歡迎訊息，只顯示英文
        this.addMessage('ai', '', 'Welcome to speaking practice!');
        
        // 延遲播放歡迎訊息
        setTimeout(() => {
            this.playAudio('Welcome to speaking practice!');
        }, 1000);
        
        // 等待一下再生成第一個問題
        setTimeout(() => {
            this.generateQuestion(0);
        }, 2000);
    }

    async generateQuestion(scenarioIndex = null) {
        if (!this.currentSessionId) {
            console.error('沒有有效的會話ID');
            return;
        }

        // 智能選擇情境索引，避免重複
        if (scenarioIndex === null) {
            scenarioIndex = this.getNextScenarioIndex();
        }

        this.showLoading(true);
        
        try {
            const response = await fetch('/api/speaking/generate_question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSessionId,
                    scenario_index: scenarioIndex
                })
            });

            const parsed = await parseJsonSafely(response);
            if (parsed.nonJson) {
                console.error('生成問題回傳非JSON:', parsed.text);
                this.generateFallbackQuestion();
                return;
            }
            const data = parsed.data;

            if (data.success) {
                const questionData = data.question_data;
                this.currentExchangeId = questionData.exchange_id;
                
                // 顯示情境描述（只有中文，加上"情境："前綴）
                this.addMessage('ai', `情境：${questionData.situation}`);
                
                // 顯示問題（英文為主，中文翻譯和建議隱藏）
                const questionText = questionData.question;
                const keywords = questionData.keywords ? questionData.keywords.join(', ') : '';
                const guidance = questionData.guidance || '';
                const chineseTranslation = questionData.translation; // Use translation from backend

                let fullGuidance = guidance;
                if (keywords) {
                    fullGuidance += `\n\n💡 關鍵詞提示: ${keywords}`;
                }
                
                this.addMessage('ai', chineseTranslation, questionText, fullGuidance);
                
                // 延遲播放，讓訊息先顯示
                setTimeout(() => {
                    this.playAudio(questionText);
                }, 500);
                
                console.log('問題生成成功:', questionData);
                
            } else if (data.redirect) {
                showErrorModal(data.message);
                window.location.href = data.redirect;
            } else {
                throw new Error(data.error || '生成問題失敗');
            }
            
        } catch (error) {
            console.error('生成問題失敗:', error);
            // 使用備用問題
            this.generateFallbackQuestion();
        } finally {
            this.showLoading(false);
        }
    }

    generateFallbackQuestion() {
        // 備用問題，當API失敗時使用
        const fallbackQuestions = {
            1: {
                situation: "你在學校遇到新同學，想要自我介紹。",
                question: "Please introduce yourself. Tell me your name and what you like to do.",
                guidance: "記得說出你的名字、年級和興趣愛好。",
                translation: "請自我介紹。告訴我你的名字和你喜歡做什麼。"
            },
            2: {
                situation: "你在餐廳想要點餐。",
                question: "You are at a restaurant. What would you like to order?",
                guidance: "可以說 'I would like...' 或 'Can I have...'。",
                translation: "你在餐廳。你想要點什麼？"
            },
            3: {
                situation: "你在街上迷路了，需要問路。",
                question: "You are lost. How do you ask for directions to the library?",
                guidance: "可以說 'Excuse me, how can I get to...' 或 'Where is...'。",
                translation: "你迷路了。你如何問圖書館的方向？"
            }
        };
        
        const questionData = fallbackQuestions[this.currentTopicId] || fallbackQuestions[1];
        
        // 顯示情境（加上前綴）
        this.addMessage('ai', `情境：${questionData.situation}`);
        
        // 顯示問題
        this.addMessage('ai', questionData.translation, questionData.question, questionData);
        
        this.playAudio(questionData.question);
    }

    getRandomQuestion() {
        // 根據當前主題和難度生成問題（這裡是模擬）
        const questions = {
            1: { // Introducing Yourself
                A1: {
                    chinese: '請用英文介紹你的名字和年級。',
                    english: 'Please introduce your name and grade in English.'
                },
                A2: {
                    chinese: '請介紹你自己，包括你的興趣和愛好。',
                    english: 'Please introduce yourself, including your interests and hobbies.'
                },
                B1: {
                    chinese: '請詳細介紹你自己，包括你的背景、興趣和未來計畫。',
                    english: 'Please introduce yourself in detail, including your background, interests, and future plans.'
                }
            }
        };

        const topicQuestions = questions[this.currentTopicId] || questions[1];
        return topicQuestions[this.currentLevel] || topicQuestions.A1;
    }

    addMessage(sender, chineseText, englishText = '', guidance = '') {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (sender === 'ai') {
            let contentHtml = '';
            let buttonsHtml = '';
            
            // 如果只有英文（如歡迎訊息）
            if (englishText && !chineseText) {
                contentHtml = `<div class="english-text">${englishText}</div>`;
                buttonsHtml = `
                    <button class="btn btn-sm btn-outline-primary replay-btn" onclick="speakingPractice.playAudio('${englishText.replace(/'/g, "\'")}')">
                        <i class="fas fa-volume-up"></i> 重播
                    </button>
                `;
            } 
            // 如果有中文和英文（問題訊息）
            else if (chineseText && englishText) {
                contentHtml = `
                    <div class="english-text">${englishText}</div>
                    <div class="hidden-content translation-content" style="display: none;">
                        <div class="chinese-text">${chineseText}</div>
                    </div>
                    ${guidance ? `<div class="hidden-content guidance-content" style="display: none;">
                        <div class="guidance-text"><strong>💡 建議：</strong>${guidance}</div>
                    </div>` : ''}
                `;
                
                buttonsHtml = `
                    <div class="control-buttons">
                        <button class="btn btn-sm toggle-btn translation-btn" onclick="speakingPractice.toggleTranslation(this)">
                            <i class="fas fa-language"></i> 翻譯
                        </button>
                        ${guidance ? `<button class="btn btn-sm toggle-btn guidance-btn" onclick="speakingPractice.toggleGuidance(this)">
                            <i class="fas fa-lightbulb"></i> 建議
                        </button>` : ''}
                        <button class="btn btn-sm btn-outline-primary replay-btn" onclick="speakingPractice.playAudio('${englishText.replace(/'/g, "\'")}')">
                            <i class="fas fa-volume-up"></i> 重播
                        </button>
                    </div>
                `;
            }
            // 如果只有中文（情境描述）
            else if (chineseText && !englishText) {
                contentHtml = `<div class="chinese-text">${chineseText}</div>`;
            }
            
            messageDiv.innerHTML = `
                <div class="message-content">
                    ${contentHtml}
                    ${buttonsHtml}
                </div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="user-text">${chineseText}</div>
                </div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            `;
        }
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async setupAudioRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            });
            this.audioStream = stream;
            console.log('麥克風權限已獲得');
            
            // 檢查瀏覽器支援的音檔格式
            this.checkAudioSupport();
            
        } catch (error) {
            console.error('無法獲得麥克風權限:', error);
            this.showMicrophoneError(error);
        }
    }

    checkAudioSupport() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        // iOS 優先使用 audio/mp4，其他系統優先使用 audio/webm
        const testTypes = isIOS 
            ? ['audio/mp4', 'audio/webm', 'audio/wav'] 
            : ['audio/webm', 'audio/mp4', 'audio/wav'];
        
        let supportedMimeType = null;
        for (const type of testTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                supportedMimeType = type;
                break;
            }
        }
        
        this.supportedMimeType = supportedMimeType || 'audio/webm'; // 預設值
        console.log(`[Audio Check] Is iOS: ${isIOS}, Selected MIME Type: ${this.supportedMimeType}`);
    }

    showMicrophoneError(error) {
        let message = '需要麥克風權限才能進行口說練習。';
        
        switch(error.name) {
            case 'NotAllowedError':
                message = '請允許麥克風權限，然後重新整理頁面。';
                break;
            case 'NotFoundError':
                message = '找不到麥克風設備，請檢查您的設備。';
                break;
            case 'NotReadableError':
                message = '麥克風被其他應用程式佔用，請關閉其他應用程式後重試。';
                break;
            default:
                message = `麥克風錯誤: ${error.message}`;
        }
        
        showErrorModal(message);
    }

    startRecording() {
        if (!this.audioStream) {
            this.setupAudioRecording().then(() => {
                if (this.audioStream) {
                    this.startRecording();
                }
            });
            return;
        }

        this.audioChunks = [];
        
        try {
            // 使用支援的音檔格式
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType: this.supportedMimeType || 'audio/webm'
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.processRecording();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('錄音錯誤:', event.error);
                showErrorModal('錄音發生錯誤，請重試');
                this.resetRecordingUI();
            };

            // 開始錄音
            this.mediaRecorder.start(1000); // 每秒收集一次數據
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            // 更新UI
            this.updateRecordingUI(true);
            
            // 開始錄音計時器
            this.startRecordingTimer();
            
        } catch (error) {
            console.error('無法開始錄音:', error);
            alert('錄音功能初始化失敗，請檢查瀏覽器設定');
        }
    }

    processRecording() {
        if (this.audioChunks.length === 0) {
            alert('錄音失敗，請重試');
            this.resetRecordingUI();
            return;
        }

        // 創建音檔 Blob
        const mimeType = this.supportedMimeType || 'audio/webm';
        this.currentAudioBlob = new Blob(this.audioChunks, { type: mimeType });
        
        // 檢查音檔大小，與後端 fallback_speech_recognition 保持一致
        if (this.currentAudioBlob.size < 5000) {
            alert('錄音時間太短 (檔案需大於 5KB)，請重新錄音。');
            this.resetRecordingUI();
            return;
        }
        
        // 創建播放URL
        const audioUrl = URL.createObjectURL(this.currentAudioBlob);
        
        // 設置音檔播放器
        const audioElement = document.getElementById('userAudio');
        audioElement.src = audioUrl;
        
        // 顯示播放控制
        document.getElementById('audioPlayback').style.display = 'block';
        
        console.log(`錄音完成: ${this.currentAudioBlob.size} bytes, ${mimeType}`);
    }

    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('recordBtn');
        const stopBtn = document.getElementById('stopRecordBtn');
        const status = document.getElementById('recordingStatus');
        
        if (isRecording) {
            recordBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            status.textContent = '錄音中... 00:00';
            status.style.color = '#dc3545';
        } else {
            recordBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
            status.textContent = '';
        }
    }

    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            if (this.isRecording && this.recordingStartTime) {
                const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
                const seconds = (elapsed % 60).toString().padStart(2, '0');
                
                document.getElementById('recordingStatus').textContent = `錄音中... ${minutes}:${seconds}`;
                
                // 限制最大錄音時間（2分鐘）
                if (elapsed >= 120) {
                    this.stopRecording();
                    alert('錄音時間已達上限（2分鐘），自動停止');
                }
            }
        }, 1000);
    }

    resetRecordingUI() {
        this.updateRecordingUI(false);
        document.getElementById('audioPlayback').style.display = 'none';
        
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // 停止計時器
            if (this.recordingTimer) {
                clearInterval(this.recordingTimer);
                this.recordingTimer = null;
            }
            
            // 更新UI
            this.updateRecordingUI(false);
            document.getElementById('recordingStatus').textContent = '處理錄音中...';
        }
    }

    reRecord() {
        // 清理之前的錄音
        if (this.currentAudioBlob) {
            URL.revokeObjectURL(document.getElementById('userAudio').src);
            this.currentAudioBlob = null;
        }
        
        this.resetRecordingUI();
    }

    async submitAudio() {
        if (!this.currentAudioBlob) {
            alert('沒有錄音可以提交');
            return;
        }

        if (!this.currentSessionId || !this.currentExchangeId) {
            alert('會話信息錯誤，請重新開始');
            return;
        }

        // 先顯示提交中的訊息
        this.addMessage('user', '🎤 語音已錄製，正在處理...', '');
        this.showLoading(true);
        
        try {
            // 準備表單數據
            const formData = new FormData();
            formData.append('audio', this.currentAudioBlob, 'user_audio.wav');
            formData.append('session_id', this.currentSessionId);
            formData.append('exchange_id', this.currentExchangeId);

            // 上傳音檔
            const response = await fetch('/api/speaking/upload_audio', {
                method: 'POST',
                body: formData
            });

            const parsed = await parseJsonSafely(response);
            if (parsed.nonJson) {
                console.error('上傳音檔回傳非JSON:', parsed.text);
                this.updateLastUserMessage('❌ 上傳失敗（伺服器回傳非JSON），請重新錄音', 0);
                return;
            }
            const data = parsed.data;

            if (data.success) {
                // 保存音檔信息
                this.currentUserAudioUrl = data.audio_url;
                this.currentAudioFilename = data.audio_filename;
                
                // 直接開始語音識別，不顯示中間步驟
                this.processUserAudio();
                
                console.log('音檔上傳成功:', data.audio_filename);
                
            } else if (data.redirect) {
                alert(data.message);
                window.location.href = data.redirect;
            } else {
                throw new Error(data.error || '上傳失敗');
            }
            
        } catch (error) {
            console.error('提交音檔失敗:', error);
            this.updateLastUserMessage('❌ 上傳失敗，請重新錄音', 0);
            alert(`提交失敗: ${error.message}`);
        } finally {
            this.resetRecordingUI();
            // 釋放麥克風資源，確保下次可以重新獲取
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
                console.log('Audio stream stopped and released.');
            }
        }
    }

    async evaluateUserResponse(userResponse) {
        if (!this.currentSessionId || !this.currentExchangeId || !userResponse) {
            console.error('缺少評估所需的信息');
            this.generateMockFeedback();
            return;
        }

        this.showLoading(true);
        
        try {
            // 調用AI評估API
            const response = await fetch('/api/speaking/evaluate_response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSessionId,
                    exchange_id: this.currentExchangeId,
                    user_response: userResponse
                })
            });

            const parsed = await parseJsonSafely(response);
            if (parsed.nonJson) {
                console.error('評測回傳非JSON:', parsed.text);
                this.generateMockFeedback();
                showErrorModal('評測錯誤：伺服器回傳非JSON（可能未登入、Session 過期或反向代理返回HTML）。');
                return;
            }
            const data = parsed.data;

            if (data.success) {
                const evaluation = data.evaluation;
                this.displayEvaluation(evaluation);
                
                console.log('AI評估成功:', evaluation);
                
            } else if (data.redirect) {
                alert(data.message);
                window.location.href = data.redirect;
            } else {
                console.error('評估失敗:', data.error);
                this.generateMockFeedback();
            }
            
        } catch (error) {
            console.error('評估請求失敗:', error);
            this.generateMockFeedback();
        } finally {
            this.showLoading(false);
        }
    }

    displayEvaluation(evaluation) {
        // 顯示詳細的評估結果
        const scores = {
            '語法': evaluation.grammar_score || 0,
            '詞彙': evaluation.vocabulary_score || 0,
            '流暢度': evaluation.fluency_score || 0,
            '相關性': evaluation.relevance_score || 0
        };
        
        // 創建評分顯示
        let scoresHtml = '<div class="evaluation-scores">';
        Object.entries(scores).forEach(([category, score]) => {
            const percentage = (score / 10) * 100;
            const color = score >= 8 ? '#28a745' : score >= 6 ? '#ffc107' : '#dc3545';
            scoresHtml += `
                <div class="score-item">
                    <span class="score-label">${category}</span>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                    </div>
                    <span class="score-value">${score}/10</span>
                </div>
            `;
        });
        scoresHtml += '</div>';
        
        // 顯示總分
        const overallScore = evaluation.overall_score || 0;
        const overallColor = overallScore >= 8 ? '#28a745' : overallScore >= 6 ? '#ffc107' : '#dc3545';
        
        // 顯示中文回饋
        const chineseFeedback = evaluation.feedback_chinese || '評估完成！';
        const englishFeedback = evaluation.feedback_english || 'Evaluation completed!';
        
        // 組合完整的評估訊息
        const fullMessage = `
            <div class="ai-evaluation">
                <h5>📊 評估結果 (總分: <span style="color: ${overallColor}; font-weight: bold;">${overallScore}/10</span>)</h5>
                ${scoresHtml}
                <div class="feedback-section">
                    <p><strong>💬 回饋：</strong>${chineseFeedback}</p>
                    ${evaluation.strengths ? `<p><strong>✅ 優點：</strong>${evaluation.strengths}</p>` : ''}
                    ${evaluation.areas_for_improvement ? `<p><strong>📈 改進建議：</strong>${evaluation.areas_for_improvement}</p>` : ''}
                </div>
            </div>
        `;
        
        this.addMessage('ai', fullMessage, englishFeedback);
        
        const scheduleNext = () => {
            setTimeout(() => this.generateQuestion(), 4000); // 4秒後自動提問
        };

        // 如果有改進後的回答範例
        if (evaluation.improved_answer && evaluation.improved_answer !== evaluation.user_response) {
            setTimeout(() => {
                this.addMessage('ai', '📝 這是一個更好的回答範例：', evaluation.improved_answer);
                this.playAudio(evaluation.improved_answer);
                scheduleNext();
            }, 1500);
        } else {
            // 播放英文回饋
            setTimeout(() => {
                this.playAudio(englishFeedback);
                scheduleNext();
            }, 500);
        }
    }

    generateMockFeedback() {
        // 備用回饋（當AI評估失敗時使用）
        const feedbacks = [
            'Great job! Your pronunciation is clear and easy to understand.',
            'Good effort! Try to speak a bit more slowly for better clarity.',
            'Well done! Your grammar is correct and your vocabulary is appropriate.',
            'Nice work! Remember to pause between sentences for better flow.',
            'Excellent! Your confidence in speaking is improving.'
        ];
        
        const randomFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
        
        this.addMessage('ai', '很好！讓我給你一些回饋...', randomFeedback);
        
        // 延遲播放回饋
        setTimeout(() => {
            this.playAudio(randomFeedback);
        }, 500);
        
        // 顯示控制按鈕
        setTimeout(() => {
            document.getElementById('nextQuestionBtn').style.display = 'inline-block';
            document.getElementById('endSessionBtn').style.display = 'inline-block';
        }, 2000);
    }

    async processUserAudio() {
        if (!this.currentAudioFilename || !this.currentSessionId || !this.currentExchangeId) {
            console.error('缺少音檔處理所需的信息');
            return;
        }

        try {
            // 簡化顯示
            this.updateLastUserMessage('🎯 正在識別語音...', 0);
            
            // 調用語音處理API
            const response = await fetch('/api/speaking/process_audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio_filename: this.currentAudioFilename,
                    session_id: this.currentSessionId,
                    exchange_id: this.currentExchangeId
                })
            });

            const parsed = await parseJsonSafely(response);
            if (parsed.nonJson) {
                console.error('處理語音回傳非JSON:', parsed.text);
                this.updateLastUserMessage('❌ 語音識別失敗（伺服器回傳非JSON）', 0);
                return;
            }
            const data = parsed.data;

            if (data.success) {
                // 直接顯示識別結果
                this.updateLastUserMessage(data.transcription, data.confidence);
                
                // 立即生成AI回饋
                setTimeout(() => {
                    this.evaluateUserResponse(data.transcription);
                }, 500);
                
                console.log('語音處理成功:', data.transcription);
                
            } else if (data.redirect) {
                alert(data.message);
                window.location.href = data.redirect;
            } else {
                console.error('語音處理失敗:', data.error);
                this.updateLastUserMessage('❌ 語音識別失敗，請重新錄音', 0);
                
                // 提示重新錄音
                setTimeout(() => {
                    this.addMessage('ai', '抱歉，我無法清楚聽到您的回答。請重新錄音試試。', 'Sorry, I couldn\'t hear your answer clearly. Please try recording again.');
                    this.playAudio('Sorry, I couldn\'t hear your answer clearly. Please try recording again.');
                }, 1000);
            }
            
        } catch (error) {
            console.error('語音處理請求失敗:', error);
            this.updateLastUserMessage('❌ 網路錯誤，請重試', 0);
        } finally {
            this.showLoading(false);
        }
    }

    updateLastUserMessage(transcription, confidence) {
        // 找到最後一個用戶訊息並更新
        const userMessages = document.querySelectorAll('.user-message');
        if (userMessages.length > 0) {
            const lastMessage = userMessages[userMessages.length - 1];
            const messageContent = lastMessage.querySelector('.message-content');
            
            if (messageContent) {
                let confidenceText = '';
                if (confidence > 0.8) {
                    confidenceText = ' ✅';
                } else if (confidence > 0.6) {
                    confidenceText = ' ⚠️';
                } else if (confidence > 0) {
                    confidenceText = ' ❓';
                }
                
                messageContent.innerHTML = `
                    <div class="user-text">"${transcription}"${confidenceText}</div>
                    ${this.currentUserAudioUrl ? `
                        <button class="btn btn-sm btn-outline-secondary mt-2" onclick="speakingPractice.playUserAudio()">
                            <i class="fas fa-play"></i> 重播我的錄音
                        </button>
                    ` : ''}
                    <div class="message-time">${new Date().toLocaleTimeString()}</div>
                `;
            }
        }
    }

    playUserAudio() {
        if (this.currentUserAudioUrl) {
            const audio = document.getElementById('hiddenAudioPlayer');
            audio.src = this.currentUserAudioUrl;
            audio.play().catch(error => {
                console.error('播放用戶音檔失敗:', error);
                alert('無法播放錄音，請重新錄製');
            });
        }
    }

    getNextQuestion() {
        // 隱藏控制按鈕
        document.getElementById('nextQuestionBtn').style.display = 'none';
        document.getElementById('endSessionBtn').style.display = 'none';
        
        // 生成新問題（使用不同的情境）
        const currentExchangeCount = document.querySelectorAll('.ai-message').length;
        this.generateQuestion(currentExchangeCount);
    }

    endSession() {
        if (confirm('確定要結束這次練習嗎？')) {
            this.addMessage('ai', '練習結束！感謝你的參與，繼續加油！', 'Practice completed! Thank you for participating, keep up the good work!');
            this.playAudio('Practice completed! Thank you for participating, keep up the good work!');
            
            // 隱藏控制按鈕
            document.getElementById('nextQuestionBtn').style.display = 'none';
            document.getElementById('endSessionBtn').style.display = 'none';
            
            // 3秒後返回主題選擇
            setTimeout(() => {
                this.showTopicSelection();
            }, 3000);
        }
    }

    async playAudio(text) {
        try {
            // 獲取當前口音設定
            const currentAccent = window.globalAccentSwitch ? window.globalAccentSwitch.getCurrentAccent() : 'us';
            
            // 優先使用後端 TTS 服務
            const response = await fetch('/api/speaking/generate_audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    language: 'en',
                    accent: currentAccent
                })
            });

            const parsed = await parseJsonSafely(response);
            if (parsed.nonJson) {
                console.error('TTS 回傳非JSON:', parsed.text);
                this.fallbackToWebSpeech(text);
                return;
            }
            const data = parsed.data;

            if (data.success) {
                // 播放生成的音檔
                const audio = document.getElementById('hiddenAudioPlayer');
                audio.src = data.audio_url;
                audio.play().catch(error => {
                    console.error('音檔播放失敗:', error);
                    this.fallbackToWebSpeech(text);
                });
            } else {
                console.error('TTS 生成失敗:', data.error);
                this.fallbackToWebSpeech(text);
            }
        } catch (error) {
            console.error('TTS 服務錯誤:', error);
            this.fallbackToWebSpeech(text);
        }
    }

    fallbackToWebSpeech(text) {
        // 備用：使用 Web Speech API
        if ('speechSynthesis' in window) {
            // 停止任何正在播放的語音
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // 設置語音完成回調
            utterance.onend = () => {
                console.log('語音播放完成');
            };
            
            utterance.onerror = (event) => {
                console.error('語音播放錯誤:', event.error);
            };
            
            speechSynthesis.speak(utterance);
        } else {
            console.warn('瀏覽器不支援語音合成');
        }
    }

    stopAudio() {
        // 停止所有音頻播放
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        
        const audio = document.getElementById('hiddenAudioPlayer');
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = show ? 'block' : 'none';
    }

    // 新增功能：智能選擇下一個情境索引，避免重複
    getNextScenarioIndex() {
        this.questionCount++;
        
        // 為每個主題定義可用的情境數量
        const maxScenarios = {
            1: 5,  // 自我介紹
            2: 6,  // 點餐
            3: 4,  // 問路
            4: 5,  // 超市購物
            5: 4,  // 預約
            6: 5,  // 買衣服
            7: 4,  // 看醫生
            8: 6,  // 日常作息
            9: 5,  // 尋求幫助
            10: 4, // 邀請
            11: 6, // 興趣愛好
            12: 5  // 天氣
        };
        
        const maxForTopic = maxScenarios[this.currentTopicId] || 5;
        
        // 如果已經用完所有情境，重置
        if (this.usedScenarios.size >= maxForTopic) {
            this.usedScenarios.clear();
        }
        
        // 找到未使用的情境索引
        let scenarioIndex;
        do {
            scenarioIndex = Math.floor(Math.random() * maxForTopic);
        } while (this.usedScenarios.has(scenarioIndex));
        
        this.usedScenarios.add(scenarioIndex);
        return scenarioIndex;
    }

    // 新增功能：切換翻譯顯示
    toggleTranslation(button) {
        const messageContent = button.closest('.message-content');
        const translationContent = messageContent.querySelector('.translation-content');
        
        if (translationContent.style.display === 'none' || translationContent.style.display === '') {
            translationContent.style.display = 'block';
            button.innerHTML = '<i class="fas fa-language"></i> 隱藏翻譯';
            button.classList.add('active');
        } else {
            translationContent.style.display = 'none';
            button.innerHTML = '<i class="fas fa-language"></i> 翻譯';
            button.classList.remove('active');
        }
    }

    // 新增功能：切換建議顯示
    toggleGuidance(button) {
        const messageContent = button.closest('.message-content');
        const guidanceContent = messageContent.querySelector('.guidance-content');
        
        if (guidanceContent.style.display === 'none' || guidanceContent.style.display === '') {
            guidanceContent.style.display = 'block';
            button.innerHTML = '<i class="fas fa-lightbulb"></i> 隱藏建議';
            button.classList.add('active');
        } else {
            guidanceContent.style.display = 'none';
            button.innerHTML = '<i class="fas fa-lightbulb"></i> 建議';
            button.classList.remove('active');
        }
    }

    // 重置會話狀態
    resetSessionState() {
        this.usedScenarios.clear();
        this.questionCount = 0;
        this.currentSessionId = null;
        this.currentExchangeId = null;
    }

    
}

// 初始化
let speakingPractice;
document.addEventListener('DOMContentLoaded', () => {
    speakingPractice = new SpeakingPractice();
    
    // 監聽全域口音變更事件
    window.addEventListener('accentChanged', function(event) {
        console.log('口說練習頁面：口音已變更為', event.detail.accent);
        // 停止當前播放的音頻
        if (speakingPractice) {
            speakingPractice.stopAudio();
        }
        // 可以在這裡添加其他需要響應口音變更的邏輯
        console.log('口說練習已切換到', event.detail.accent === 'us' ? '美式口音' : '英式口音');
    });
});
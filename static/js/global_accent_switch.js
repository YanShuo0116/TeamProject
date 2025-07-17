/**
 * 全域口音切換功能
 * 用於所有有語音功能的頁面
 */

class GlobalAccentSwitch {
    constructor() {
        this.currentAccent = 'us'; // 預設美式口音
        this.init();
    }

    init() {
        this.createAccentSwitch();
        this.loadUserAccentPreference();
        this.bindEvents();
    }

    createAccentSwitch() {
        // 檢查是否已存在口音切換器
        if (document.getElementById('globalAccentSwitch')) {
            return;
        }

        // 創建口音切換器 HTML
        const accentSwitchHTML = `
            <div class="accent-switch-container" id="globalAccentSwitch">
                <div class="accent-option active" id="globalAmericanAccent" data-accent="us">
                    <i class="fas fa-flag-usa"></i>
                    <span class="accent-text">美式</span>
                </div>
                <div class="accent-option" id="globalBritishAccent" data-accent="co.uk">
                    <i class="fas fa-flag"></i>
                    <span class="accent-text">英式</span>
                </div>
            </div>
        `;

        // 添加 CSS 樣式
        this.addAccentSwitchStyles();

        // 不再添加到導覽列，改為內頁處理
    }

    addAccentSwitchStyles() {
        // 檢查是否已添加樣式
        if (document.getElementById('globalAccentSwitchStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'globalAccentSwitchStyles';
        style.textContent = `
            .accent-switch-nav-item {
                display: flex;
                align-items: center;
                margin: 0 10px;
            }

            .accent-switch-container {
                display: flex;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 25px;
                padding: 5px;
                gap: 5px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .accent-option {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 8px 12px;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                color: rgba(255, 255, 255, 0.8);
                font-size: 0.9rem;
                font-weight: 500;
                min-width: 60px;
                justify-content: center;
            }

            .accent-option:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                transform: translateY(-1px);
            }

            .accent-option.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }

            .accent-option i {
                font-size: 1rem;
            }

            .accent-text {
                font-size: 0.85rem;
                white-space: nowrap;
            }

            /* 響應式設計 */
            @media (max-width: 768px) {
                .accent-switch-container {
                    padding: 3px;
                    gap: 3px;
                }
                
                .accent-option {
                    padding: 6px 8px;
                    min-width: 50px;
                }
                
                .accent-text {
                    display: none;
                }
            }

            /* 深色模式適配 */
            body.dark-mode .accent-switch-container {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            body.dark-mode .accent-option {
                color: rgba(255, 255, 255, 0.9);
            }

            body.dark-mode .accent-option:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // 綁定點擊事件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.accent-option')) {
                const option = e.target.closest('.accent-option');
                const accent = option.dataset.accent;
                this.setAccentPreference(accent);
            }
        });
    }

    setAccentPreference(accent) {
        if (accent === this.currentAccent) return;

        // 更新 UI
        this.updateAccentUI(accent);
        
        // 發送到後端儲存
        fetch('/update-accent?accent=' + accent)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    this.currentAccent = accent;
                    console.log('全域口音設定已更新:', accent);
                    this.showAccentMessage(data.message, 'success');
                    
                    // 觸發自定義事件，通知其他組件口音已變更
                    window.dispatchEvent(new CustomEvent('accentChanged', {
                        detail: { accent: accent }
                    }));
                } else {
                    console.error('口音設定失敗:', data.message);
                    this.showAccentMessage(data.message, 'error');
                    // 恢復原來的 UI 狀態
                    this.updateAccentUI(this.currentAccent);
                }
            })
            .catch(error => {
                console.error('網路錯誤:', error);
                this.showAccentMessage('網路連接錯誤', 'error');
                // 恢復原來的 UI 狀態
                this.updateAccentUI(this.currentAccent);
            });
    }

    updateAccentUI(accent) {
        const americanOption = document.getElementById('globalAmericanAccent');
        const britishOption = document.getElementById('globalBritishAccent');
        
        if (americanOption && britishOption) {
            americanOption.classList.toggle('active', accent === 'us');
            britishOption.classList.toggle('active', accent === 'co.uk');
        }
    }

    loadUserAccentPreference() {
        // 獲取用戶當前的口音偏好設定
        fetch('/api/get-user-accent')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.currentAccent = data.accent;
                    this.updateAccentUI(data.accent);
                    console.log('已載入全域口音偏好:', data.accent);
                }
            })
            .catch(error => {
                console.log('載入口音偏好失敗，使用預設設定');
                // 預設使用美式口音
                this.updateAccentUI('us');
            });
    }

    showAccentMessage(message, type) {
        // 移除現有的訊息
        const existingMessage = document.querySelector('.global-accent-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 創建提示訊息
        const messageDiv = document.createElement('div');
        messageDiv.className = `global-accent-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 9999;
            opacity: 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            ${type === 'success' 
                ? 'background: linear-gradient(135deg, #4CAF50, #45a049);' 
                : 'background: linear-gradient(135deg, #f44336, #d32f2f);'
            }
        `;
        
        document.body.appendChild(messageDiv);
        
        // 顯示動畫
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateX(0)';
        }, 100);
        
        // 3秒後自動消失
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    // 獲取當前口音設定（供其他組件使用）
    getCurrentAccent() {
        return this.currentAccent;
    }
}

// 全域實例
let globalAccentSwitch = null;

// 初始化函數
function initGlobalAccentSwitch() {
    if (!globalAccentSwitch) {
        globalAccentSwitch = new GlobalAccentSwitch();
    }
    return globalAccentSwitch;
}

// 自動初始化（當 DOM 載入完成時）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalAccentSwitch);
} else {
    initGlobalAccentSwitch();
}

// 導出供其他腳本使用
window.GlobalAccentSwitch = GlobalAccentSwitch;
window.globalAccentSwitch = globalAccentSwitch;
window.initGlobalAccentSwitch = initGlobalAccentSwitch;
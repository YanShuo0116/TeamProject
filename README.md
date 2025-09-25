# HTML試用初始版本 更新日期2025/7/10(陳衍碩)

# 作文功能

- **新增作文**：使用者可以新增作文，並由 AI 提供批改建議。
- **查看作文**：使用者可以查看自己所有的作文列表。
- **批改作文**：AI 會針對使用者提交的作文提供文法、拼字、風格等方面的建議。

# 安裝包(大致上是這幾個)

pip3 install google-generativeai gradio
pip3 install soundfile
pip3 install gTTS
pip3 install flask-ngrok
pip3 install -q -U google-generativeai
pip3 install pyngrok
pip3 install flask-cors  (mac才需要）
pip3 install Flask-SQLAlchemy pandas
pip3 install Flask-Login

# API 調用

去註冊以下兩個

gemini api
https://aistudio.google.com/welcome

ngrok
https://ngrok.com/

得到API後去app.py的"配置API"中替換"YOUR_API"

# 資料庫設定

本專案使用 SQLite 資料庫來儲存使用者資料、學習記錄等。

## 初始化資料庫

在第一次執行應用程式之前，您需要初始化資料庫。請執行以下指令：

```bash
python3 database_setup.py
```

這將會建立 `learning_platform.db` 檔案，並在其中建立所有必要的資料表，同時匯入預設的管理員帳號和單字資料。

# 執行cmd （source "/Volumes/我的Ｍ．２ssd 1/程式/my_project_v0.4/venv/bin/activate"）

python app.py

# 啟動成功後會顯示

C:\Users\碩\Desktop\test專題>python app.py
公開 URL: https://b5f2-58-115-97-74.ngrok-free.app
 * Serving Flask app 'app'
 * Debug mode: off
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on http://127.0.0.1:5000
Press CTRL+C to quit

# 按著CTRL 點擊公開 URL 即可連線

       _                        
       `*-.
        )  _`-.
       .  : `. .
       : _   '  \
       ; *` _.   `*-._
       `-.-'          `-.
         ;       `       `.
         :.       .        \
         . \  .   :   .-'   .
         '  `+.;  ;  '      :
         :  '  |    ;       ;-. 
         ; '   : :`-:     _.`* ;
[bug] .*' /  .*' ; .*`- +'  `*' 
      `*-*   `*-*  `*-*'



# Folder部分

MY_PROJECT/
│
├── app.py                # 主要程式：Flask 應用程式的入口點，負責路由、視圖函數、API 配置和應用程式初始化。
├── models.py             # 資料庫模型：定義了所有資料庫表格的結構 (例如 User, LearningRecord 等)，並處理密碼加密。
├── database_setup.py     # 資料庫初始化腳本：用於建立資料庫、資料表，並匯入初始數據 (例如預設管理員帳號和單字資料)。
├── auth.py               # 身份驗證模組：處理使用者登入、註冊和登出邏輯，並管理使用者會話。
├── admin.py              # 管理員模組：包含管理員專屬的路由和功能，例如顯示後台儀表板和統計數據。
├── learning_platform.db  # SQLite 資料庫檔案：應用程式的資料庫文件。
├── README.md             # 各種介紹
├── audio_files           # 存放音檔
│
├── static/               # 靜態文件（CSS、JS、圖像等）
│   ├── css/
│   │   ├── styles.css    
│   │   ├── teach.css    
│   │   ├── button.css   ＃特殊效果按鈕
│   │   ├── composition.css 
│   │   ├──translator.css
│   │   ├──we.css
│   │   ├── login_register.css # 登入/註冊頁面樣式
│   │   └── admin.css          # 管理員後台樣式
│   │
│   ├── js/
│   │   ├── scripts.js    
│   │   ├── teach.js  
│   │   ├── composition.js     
│   │   ├──translator.js
│   │   └──we.js
│   └── images/           
│
└── templates/            # HTML 模板
    ├── index.html        # 主頁
    ├── teach.html        # AI老師
    ├── composition.html  # 英文作文助手
    ├── translator.html   # 翻譯機
    ├── we.html           # 自我介紹
    ├── login.html        # 登入頁面
    ├── register.html     # 註冊頁面
    ├── admin_dashboard.html # 管理員後台儀表板
    └── unauthorized.html # 未授權訪問頁面

# 管理員後台使用說明

1.  **啟動應用程式**：確保您已按照上述步驟初始化資料庫並啟動 Flask 應用程式 (`python app.py`)。
2.  **登入**：在瀏覽器中訪問 `/login` 路由，使用預設的管理員帳號登入：
    *   **使用者名稱 (Username)**: `admin`
    *   **密碼 (Password)**: `admin`
3.  **訪問後台**：成功登入後，您將會被自動導向到管理員後台儀表板 (`/admin/dashboard`)。您也可以直接在瀏覽器中輸入 `/admin/dashboard` 來訪問。
4.  **後台功能**：在管理員後台，您可以查看系統的統計數據，例如總使用者數、作文數量、學習記錄數量和單字數量。未來可以擴展更多管理功能。


---

# 最新更新內容 (2025/6/30)

- **Bug修復**：修正了單字學習功能中的一個錯誤。
- **功能優化**：將翻譯機的語音生成邏輯改為根據資料庫排序，確保語音順序正確無誤。

# 最新更新內容 (2025/6/29)

## 新增功能：單字隨機測驗
- 新增單字隨機測驗功能，提供互動式學習體驗
- 支援隨機選取單字進行測驗
- 包含音頻播放功能，提升學習效果
- 測驗結果會記錄到學習記錄中

## 已知Bug
- **測驗途中閃退會顯示已完成**：當使用者在進行單字測驗過程中意外離開或刷新頁面時，系統會錯誤地將該次測驗標記為已完成狀態。此問題需要在後續版本中修正，建議加入測驗狀態追蹤機制。

---
# 最新更新內容 (2025/09/25) - RAG 系統與單字本開發

## 🔍 RAG 問答系統 v0.8
- **檢索增強生成**：整合 Langchain 框架強化問答精準度
- **多來源整合**：支援 PDF 教材/CSV 資料/網路文章多類型資料源
- **語境辨識**：自動偵測問題類別匹配知識庫 (基礎單字/情境會話/語法規則)
- **暫存機制**：自動保留最近 3 次對話歷史提升連貫性
- **混源引用**：回答時自動標註參考資料來源 (PDF頁碼/CSV行數)

## 📔 自訂單字本 (開發中 50%)
⚠️ 半成品注意 - 目前實現功能：
- **單字收藏**：支援從 RAG 回答/測驗系統快速添加
- **分級標記**：CEFR 分級標籤 (A1~C2)
- **批量管理**：CSV 批次導入/導出功能
- **智能排序**：基於遺忘曲線的複習排程

🚧 待開發功能：
- 單字卡生成系統
- 跨裝置同步機制
- 發音比對練習
- 客製化測驗引擎

## ⚠️ 臨時限制
- RAG 反應時間需優化 (目前平均 5-8 秒)
- 單字本尚未支援圖片上傳
- 部分 CSV 格式相容性待處理

## 🛠 技術架構
- ChromaDB 向量檢索核心
- Langchain 自訂檢索鏈
- Sentence-BERT 嵌入模型
- 分散式快取層 (Redis)

# 最新更新內容 (2025/7/10) - 性能優化

## 🔥 輕量化多 API 協作系統
- **多金鑰負載平衡**：整合5個API金鑰，自動分配請求，告別單點故障！
- **智能錯誤重試**：API失效？自動切換下一個金鑰，用戶完全無感！
- **金鑰隱藏保護**：API金鑰不再硬編碼，安全性大幅提升
- **實時監控面板**：管理員後台可查看API使用統計，掌握系統健康狀態
- **零侵入整合**：現有功能完全不受影響，向後兼容100%

## ⚡ 單字學習性能飛躍
- **圖片快取系統**：相同單字圖片只載入一次，速度提升300%！
- **音檔智能快取**：TTS音檔避免重複生成，播放延遲幾乎為零
- **背景預載入**：應用啟動時自動預載常用單字資源，學習體驗如絲般順滑
- **載入優化**：從原本3-8秒延遲優化到幾乎瞬間載入

## 🎯 用戶體驗大升級
- **流暢度**：單字卡片切換如原生應用般流暢
- **穩定性**：多API備援

## 📊 技術亮點
- API管理架構
- 智能資源快取機制  
- 背景任務優化
- 實時監控與統計

---

# 🎤 最新重大更新 (2025/07/14) - 語音練習功能初版

## 🚀 Speaking Practice System v1.0 正式發布

### 核心功能
- **🎯 專業語音識別**：整合 AssemblyAI，識別準確度高達 93%+
- **💬 互動對話練習**：12個主題情境 × 6個CEFR難度等級 (A1-C2)
- **🧠 智能出題系統**：AI驅動的問題生成，內建防重複演算法
- **🎨 現代化聊天界面**：美觀的對話氣泡設計，用戶訊息右側顯示
- **🌐 智能翻譯系統**：完整中文翻譯對照表，支援關鍵詞智能匹配
- **📚 情境式學習**：真實生活場景模擬（購物、用餐、問路等）
- **📊 即時AI評估**：語法、詞彙、流暢度、相關性四維度評分

### 技術特色
- **AssemblyAI 語音轉文字**：取代傳統 Google Speech API，提供更穩定的語音識別
- **多層次翻譯策略**：精確翻譯對照表 + 智能關鍵詞匹配 + 備用翻譯機制
- **防重複出題演算法**：智能追蹤已使用情境，確保學習內容多樣性
- **響應式設計**：支援各種螢幕尺寸，完美適配桌面和移動設備

### 學習體驗升級
- **沉浸式英語環境**：英文優先顯示，中文翻譯按需查看
- **真實對話模擬**：店員問候 → 學生回應的自然對話流程
- **視覺化學習回饋**：彩色評分條、動畫效果、狀態指示
- **個性化難度調整**：從A1基礎到C2精通，滿足不同程度學習者

### 支援的練習主題
1. 🗣️ 自我介紹 (Introducing Yourself)
2. 🍔 點餐 (Ordering Food)  
3. 🗺️ 問路 (Asking for Directions)
4. 🛒 超市購物 (At the Supermarket)
5. ⏰ 預約 (Making an Appointment)
6. 👕 服飾購物 (Shopping for Clothes)
7. 🏥 看醫生 (At the Doctor's Office)
8. 📅 日常作息 (Daily Routines)
9. 🤝 尋求幫助 (Asking for Help)
10. 🎉 邀請 (Making Invitations)
11. 🎨 興趣愛好 (Talking about Hobbies)
12. 🌤️ 天氣 (Talking about the Weather)

### 開發團隊
- **語音識別整合**：AssemblyAI API 集成與優化
- **前端界面設計**：現代化聊天室UI/UX
- **後端邏輯開發**：智能問題生成與評估系統
- **翻譯系統建構**：多語言支援與智能匹配

這次更新標誌著平台從靜態學習工具向互動式語言練習系統的重大轉變，為學生提供了更加真實和有效的英語口說練習體驗！

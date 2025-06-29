# HTML試用初始版本 更新日期2025/6/29(陳衍碩)
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
       \`*-.
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

# HTML試用初始版本 更新日期2024/12/11(陳衍碩)
# 安裝包(大致上是這幾個)

pip3 install google-generativeai gradio
pip3 install soundfile
pip3 install gTTS
pip3 install flask-ngrok
pip3 install -q -U google-generativeai
pip3 install pyngrok
pip3 install flask-cors  (mac才需要）

# API 調用

去註冊以下兩個

gemini api
https://aistudio.google.com/welcome

ngrok
https://ngrok.com/

得到API後去app.py的"配置API"中替換"YOUR_API"

# 執行cmd 

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
├── app.py                # 主要程式
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
│   │   └──we.css
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
    ├── teach.html        #AI老師
    ├── composition.html  #英文作文助手
    ├── translator.html   # 翻譯機
    └── we.html           # 自我介紹      --------------可以按照不滿意部分去各自檔案修改

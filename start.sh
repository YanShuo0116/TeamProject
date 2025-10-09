#!/bin/bash

# 當腳本被中斷 (Ctrl+C) 或終止時，執行 cleanup 函數
trap cleanup SIGINT SIGTERM

cleanup() {
    echo "

🛑 正在關閉服務..."
    
    # 檢查 FLASK_PID 變數是否存在，如果存在就終止該程序
    if [ ! -z "$FLASK_PID" ]; then
        kill $FLASK_PID
        echo "Flask 伺服器 (PID: $FLASK_PID) 已停止。"
    fi
    
    # 終止 cloudflared 程序
    # pkill 通常能更可靠地找到並關閉它
    pkill -f "cloudflared tunnel"
    echo "Cloudflare tunnel 已停止。"
    
    exit 0
}

echo "🚀 正在背景啟動 Flask 伺服器..."
# 啟動 Flask app，並將其輸出導入到日誌檔案，保持終端機乾淨
python3 app.py > flask.log 2>&1 &

# 獲取剛剛在背景執行的 Flask 程序的 PID
FLASK_PID=$!
echo "Flask 伺服器已啟動，PID 為: $FLASK_PID"

echo "⏳ 等待 Flask 伺服器準備就緒 (5秒)..."
sleep 5

echo "☁️ 正在啟動 Cloudflare Tunnel..."
echo "(按下 Ctrl+C 來關閉所有服務)"

# 在前台啟動 cloudflared，腳本會在此暫停，直到你按下 Ctrl+C
cloudflared tunnel --url http://127.0.0.1:5000

# 當 cloudflared 結束後，腳本也會結束，並觸發 trap

import os

# 讀取環境變數
print(os.environ.get("GEMINI_API_KEY"))

# 設定環境變數
os.environ["GEMINI_API_KEY"] = "my_secret_key"

# 刪除環境變數
if "GEMINI_API_KEY" in os.environ:
    del os.environ["GEMINI_API_KEY"]
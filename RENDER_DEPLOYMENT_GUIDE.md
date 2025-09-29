# Render 部署指南

## 專案已準備好部署到 Render

### 已完成的修改

1. **移除 ngrok 依賴**
   - 刪除了 `start_ngrok()` 函數
   - 移除了 pyngrok 相關代碼
   - 更新了 requirements.txt

2. **環境變數支援**
   - 添加了 `.env` 文件模板
   - 修改 app.py 支援環境變數
   - SECRET_KEY, PEXELS_API_KEY 從環境變數讀取

3. **Render 配置文件**
   - `render.yaml` - Render 服務配置
   - `Procfile` - 進程配置
   - `runtime.txt` - Python 版本指定

4. **資料庫初始化**
   - 修改 `database_setup.py` 支援無 CSV 文件的部署
   - 添加基本詞彙數據創建功能

### 部署步驟

1. **推送代碼到 GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **在 Render 創建新服務**
   - 登入 [Render Dashboard](https://dashboard.render.com)
   - 點擊 "New +" -> "Web Service"
   - 連接你的 GitHub 倉庫

3. **配置環境變數**
   在 Render 服務設定中添加：
   - `GEMINI_API_KEY`: 你的 Google Gemini API 金鑰
   - `SECRET_KEY`: 會自動生成
   - `FLASK_ENV`: production
   - `PEXELS_API_KEY`: 已在 render.yaml 中設定

4. **部署設定**
   - Build Command: `pip install -r requirements.txt && python database_setup.py`
   - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`
   - Python Version: 3.11.9

### 重要注意事項

1. **API 金鑰設定**
   - 必須在 Render 環境變數中設定 `GEMINI_API_KEY`
   - 可以在 `api_config.json` 中添加多個金鑰

2. **資料庫**
   - 使用 SQLite，數據會在每次部署時重置
   - 考慮升級到 PostgreSQL 用於生產環境

3. **靜態文件**
   - 音頻和圖片文件會在重啟時丟失
   - 考慮使用外部存儲服務（如 AWS S3）

4. **免費方案限制**
   - Render 免費方案有睡眠模式
   - 15分鐘無活動後會進入睡眠
   - 首次喚醒可能需要30秒

### 測試部署

部署完成後，測試以下功能：
- [ ] 用戶註冊/登入
- [ ] 詞彙學習功能
- [ ] AI 翻譯功能
- [ ] 作文批改功能
- [ ] 管理員面板

### 故障排除

1. **部署失敗**
   - 檢查 build logs
   - 確認所有依賴都在 requirements.txt 中

2. **API 錯誤**
   - 檢查 GEMINI_API_KEY 是否正確設定
   - 查看 API 管理器健康狀態：`/api/manager/health`

3. **資料庫問題**
   - 檢查 database_setup.py 執行日誌
   - 確認基本數據已創建

### 後續優化建議

1. **升級資料庫**
   - 使用 Render PostgreSQL 服務
   - 修改 SQLALCHEMY_DATABASE_URI

2. **添加外部存儲**
   - 整合 AWS S3 或 Cloudinary
   - 存儲音頻和圖片文件

3. **監控和日誌**
   - 添加應用監控
   - 設定錯誤通知

4. **性能優化**
   - 添加 Redis 快取
   - 優化資料庫查詢
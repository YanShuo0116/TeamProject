# PDF + gemini langchain + flask 專題測試版

可讓你將多份 PDF 放入 `pdfs/` 資料夾，經向量化後，透過網頁介面查詢內容，AI 會根據 PDF 回答你的問題。

---

## 1. 安裝步驟

建議使用虛擬環境：
```bash
python3 -m venv 自訂
source 自訂/bin/activate

source langchain_env/bin/activate
```


安裝必要套件：
```bash
pip install -r requirements.txt
# 若無 requirements.txt，請依下列安裝：
pip install pypdf chromadb google-generativeai langchain-google-genai langchain langchain_community flask
```

---

## 2. 設定 Google Gemini API 金鑰

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)，啟用 Gemini/Generative Language API。

＃終端機輸入
export GOOGLE_API_KEY="你剛剛拿到的api"
export GOOGLE_API_KEY="AIzaSyDV0Fd8TLDoox9xoq8Ul4wntxi9KdqMXnY"2
---

## 3. 放置 PDF 檔案

- 請將所有要查詢的 PDF 檔案放到專案根目錄下的 `pdfs/` 資料夾。
- 範例：
  - pdfs/生活用語1.pdf
  - pdfs/生活用語2.pdf

---

## 4. 建立/更新向量資料庫

每份 PDF 會自動建立一個獨立的子資料庫。

```bash
python chroma.py
```
- 執行後會自動處理 `pdfs/` 內所有 PDF，並在 `chroma_db/` 產生對應子資料夾。
- 若遇到資料夾/檔案衝突會自動清理。

---

## 5. 啟動網頁查詢系統

```bash
python app.py
```
- 啟動後，瀏覽器打開 [http://127.0.0.1:5000/](http://127.0.0.1:5000/)
- 選擇 PDF、輸入問題，送出即可查詢。

---

## 6. 常見錯誤與排解

- **API 金鑰錯誤/未設置**：
  - 請確認 `GOOGLE_APPLICATION_CREDENTIALS` 是否正確設置。
- **API 配額超過（429 ResourceExhausted）**：
  - 免費額度用完，請等配額重置或升級帳號。
- **PDF 沒有被向量化**：
  - 請先執行 `python chroma.py`。
- **Chroma 相關錯誤**：
  - 程式會自動清理舊資料夾，若仍有問題請檢查檔案權限。

---

## 7. 進階參數

可調整 `chroma.py` 內：
- `chunk_size`：每段分割字數
- `chunk_overlap`：分段重疊字數

---

## 8. 結構說明

- `pdfs/`：放 PDF 檔案
- `chroma_db/`：每個 PDF 對應一個子資料庫資料夾
- `app.py`：網頁查詢主程式
- `chroma.py`：PDF 向量化批次處理

---


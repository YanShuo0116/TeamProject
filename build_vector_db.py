import os
import json
import pandas as pd
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings  # ✅ 新版本
from langchain.docstore.document import Document
from langchain_community.vectorstores import Chroma  # ✅ 統一版本
from utils import get_loader

# 專案根目錄
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config", "database_config.json")

def build_vector_db(path_to_file, dataset_name, vector_path, source_column=None):
    # 處理絕對路徑和相對路徑
    if os.path.isabs(path_to_file):
        full_path = path_to_file
    else:
        full_path = os.path.join(BASE_DIR, path_to_file)
    
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"找不到教材檔案：{full_path}")

    print(f"📁 正在處理檔案：{full_path}")
    ext = os.path.splitext(full_path)[1].lower()

    # CSV 特別處理
    if ext == ".csv":
        try:
            df = pd.read_csv(full_path, encoding="utf-8")
            print(f"📊 CSV 檔案載入成功，共 {len(df)} 行")
            print(f"📊 欄位: {list(df.columns)}")
            
            if "中文" in df.columns and "英文" in df.columns:
                documents = []
                for _, row in df.iterrows():
                    zh = str(row["中文"]).strip()
                    en = str(row["英文"]).strip()
                    if zh and en and zh != 'nan' and en != 'nan':
                        documents.append(Document(page_content=zh, metadata={"label": en, "type": "chinese"}))
                        documents.append(Document(page_content=en, metadata={"label": zh, "type": "english"}))
            else:
                # 創建包含所有欄位信息的文檔
                documents = []
                for idx, row in df.iterrows():
                    # 將每一行轉換為描述性文字
                    row_description = f"資料第 {idx+1} 筆: "
                    row_parts = []
                    for col in df.columns:
                        value = str(row[col]).strip()
                        if value and value != 'nan' and value.lower() != 'none':
                            row_parts.append(f"{col} 是 {value}")
                    
                    if row_parts:
                        content = row_description + "，".join(row_parts) + "。"
                        documents.append(Document(
                            page_content=content, 
                            metadata={"source": "csv_row", "row_index": idx}
                        ))
                        print(f"📝 CSV 行 {idx+1}: {content[:50]}...")
                
                # 如果沒有生成任何文檔，嘗試使用原始方法
                if not documents:
                    if not source_column or source_column not in df.columns:
                        text_columns = df.select_dtypes(include=['object']).columns
                        if len(text_columns) > 0:
                            source_column = text_columns[0]
                            print(f"🔍 自動選擇欄位：{source_column}")
                        else:
                            raise ValueError(f"{dataset_name} 的 CSV 沒有找到文字欄位")
                    
                    for _, row in df.iterrows():
                        content = str(row[source_column]).strip()
                        if content and content != 'nan' and content.lower() != 'none' and len(content) > 2:
                            documents.append(Document(page_content=content, metadata={"source": source_column}))
                            print(f"📝 CSV 行內容: {content[:30]}...")
        except Exception as e:
            raise ValueError(f"CSV 處理失敗：{e}")
    else:
        # PDF / TXT
        try:
            loader = get_loader(full_path, source_column=source_column)
            documents = loader.load()
            print(f"📄 文件載入成功，共 {len(documents)} 個文檔")
            
            # 檢查是否為空的 PDF（可能是掃描版）
            if ext == ".pdf":
                empty_docs = sum(1 for doc in documents if not doc.page_content.strip())
                if empty_docs == len(documents):
                    raise ValueError(f"PDF 檔案可能是掃描版本或圖片格式，無法提取文字內容。請使用包含可選取文字的 PDF 檔案，或將內容轉換為 TXT 格式。")
                elif empty_docs > 0:
                    print(f"⚠️ 發現 {empty_docs} 個空白頁面，可能部分內容無法提取")
                    
        except Exception as e:
            if "掃描版本" in str(e):
                raise e
            else:
                raise ValueError(f"文件載入失敗：{e}")

    if not documents:
        raise ValueError(f"{dataset_name} 無法從 {full_path} 載入任何內容")

    print(f"📝 原始文檔數量：{len(documents)}")
    
    # 過濾空白文檔並顯示詳細信息
    valid_documents = []
    for i, doc in enumerate(documents):
        content = doc.page_content.strip()
        print(f"📄 文檔 {i+1}: 長度 {len(content)} 字符")
        if len(content) > 50:  # 顯示前50個字符
            print(f"   內容預覽: {content[:50]}...")
        else:
            print(f"   完整內容: {content}")
        
        if content and len(content) > 5:  # 降低最小長度要求
            valid_documents.append(doc)
        else:
            print(f"   ⚠️ 文檔 {i+1} 被過濾（內容太短或為空）")
    
    if not valid_documents:
        print("❌ 所有文檔都被過濾了，可能的原因：")
        print("   1. PDF 文檔可能是掃描版本，無法提取文字")
        print("   2. 文檔內容格式不正確")
        print("   3. 文檔內容太短")
        raise ValueError(f"{dataset_name} 沒有找到有效的文檔內容")
    
    print(f"✅ 有效文檔數量：{len(valid_documents)}")

    # 切割文本
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,  # 增加chunk大小
        chunk_overlap=100,  # 增加重疊
        length_function=len,
        separators=["\n\n", "\n", "。", ".", " ", ""]
    )
    docs_split = splitter.split_documents(valid_documents)
    
    if not docs_split:
        raise ValueError(f"{dataset_name} 文檔切割後沒有內容")
    
    print(f"🔪 文檔切割完成，共 {len(docs_split)} 個片段")

    # 建立向量資料庫
    try:
        embedding = HuggingFaceEmbeddings(
            model_name="BAAI/bge-small-en-v1.5",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        # 確保目錄存在
        if os.path.isabs(vector_path):
            vector_path_full = vector_path
        else:
            vector_path_full = os.path.join(BASE_DIR, vector_path)
        
        os.makedirs(vector_path_full, exist_ok=True)
        
        # 建立向量資料庫
        vectorstore = Chroma.from_documents(
            documents=docs_split, 
            embedding=embedding, 
            persist_directory=vector_path_full
        )
        
        print(f"✅ [{dataset_name}] 向量資料庫建立成功 ➜ {vector_path_full}")
        return vectorstore
        
    except Exception as e:
        raise ValueError(f"向量資料庫建立失敗：{e}")

if __name__ == "__main__":
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        db_config = json.load(f)

    for dataset_name, entry in db_config.items():
        try:
            path = entry["path"]
            vector_path = entry["vector_path"]
            source_column = entry.get("source_column")
            print(f"正在建立：{dataset_name} → {path}")
            build_vector_db(path, dataset_name, vector_path, source_column)
        except Exception as e:
            print(f"❌ [{dataset_name}] 建立失敗：{e}")

#!/usr/bin/env python3
"""
建立國小1200基礎單字向量資料庫
處理 CSV 檔案並建立 ChromaDB 向量資料庫，供作文引導系統使用
"""
import os
import pandas as pd
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document
from langchain_community.vectorstores import Chroma

# 專案根目錄
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "國小英文教材/基礎1200單字/國小1200基礎單字每日學習表.csv")
VECTOR_DB_PATH = os.path.join(BASE_DIR, "chroma_db/國小1200單字")

def parse_elementary_vocab_csv(csv_path):
    """
    解析國小1200單字 CSV 檔案
    CSV 格式：每行包含主題分組和多對中英文單字
    """
    print(f"📁 正在讀取 CSV 檔案：{csv_path}")
    
    # 讀取 CSV
    df = pd.read_csv(csv_path, encoding="utf-8")
    print(f"✅ CSV 載入成功，共 {len(df)} 行")
    print(f"📊 欄位: {list(df.columns)}")
    
    documents = []
    theme_count = 0
    word_count = 0
    
    current_theme = None
    
    # 遍歷每一行
    for idx, row in df.iterrows():
        # 獲取主題分組
        theme = str(row.get('主題分組', '')).strip()
        
        # 如果這一行有主題名稱（例如：主題一：人物）
        if theme and theme != 'nan' and theme.startswith('主題'):
            current_theme = theme
            theme_count += 1
            print(f"  📚 發現主題：{current_theme}")
            continue
        
        # 處理單字行
        # CSV 格式：主題分組,中文1,英文2,中文2,英文3,中文3,...
        for i in range(1, 13, 2):  # 遍歷列（1-12，每2列為一對）
            try:
                # 獲取中文和英文欄位名稱（例如：中文1, 英文2）
                if i == 1:
                    en_col = f'英文{i+1}'
                    zh_col = f'中文{i}'
                else:
                    en_col = f'英文{i}'
                    zh_col = f'中文{i-1}'
                
                # 檢查欄位是否存在
                if en_col not in df.columns or zh_col not in df.columns:
                    continue
                
                english_word = str(row.get(en_col, '')).strip()
                chinese_word = str(row.get(zh_col, '')).strip()
                
                # 過濾無效數據
                if (english_word and chinese_word and 
                    english_word != 'nan' and chinese_word != 'nan' and
                    len(english_word) > 0 and len(chinese_word) > 0):
                    
                    # 創建雙向文檔（英文->中文 和 中文->英文）
                    # 這樣可以用中文或英文查詢都能找到
                    
                    # 文檔1：英文單字內容，包含中文翻譯和主題
                    content_en = f"{english_word} ({chinese_word})"
                    doc_en = Document(
                        page_content=content_en,
                        metadata={
                            "english": english_word,
                            "chinese": chinese_word,
                            "theme": current_theme or "未分類",
                            "type": "vocabulary",
                            "search_type": "english"
                        }
                    )
                    documents.append(doc_en)
                    
                    # 文檔2：中文內容，包含英文單字
                    content_zh = f"{chinese_word} ({english_word})"
                    doc_zh = Document(
                        page_content=content_zh,
                        metadata={
                            "english": english_word,
                            "chinese": chinese_word,
                            "theme": current_theme or "未分類",
                            "type": "vocabulary",
                            "search_type": "chinese"
                        }
                    )
                    documents.append(doc_zh)
                    
                    word_count += 1
                    
            except Exception as e:
                print(f"  ⚠️ 處理第 {idx} 行第 {i} 組時發生錯誤：{e}")
                continue
    
    print(f"\n✅ 解析完成！")
    print(f"  📚 主題數量：{theme_count}")
    print(f"  📝 單字數量：{word_count}")
    print(f"  📄 文檔數量：{len(documents)} (包含雙向索引)")
    
    return documents

def build_vocabulary_database():
    """建立國小1200單字向量資料庫"""
    try:
        # 檢查 CSV 檔案是否存在
        if not os.path.exists(CSV_PATH):
            raise FileNotFoundError(f"找不到 CSV 檔案：{CSV_PATH}")
        
        # 解析 CSV 獲取文檔
        documents = parse_elementary_vocab_csv(CSV_PATH)
        
        if not documents:
            raise ValueError("沒有從 CSV 中提取到任何單字")
        
        print(f"\n🔧 開始建立向量資料庫...")
        
        # 初始化 Embedding 模型
        embedding = HuggingFaceEmbeddings(
            model_name="BAAI/bge-small-en-v1.5",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        # 確保目錄存在
        os.makedirs(VECTOR_DB_PATH, exist_ok=True)
        
        # 建立向量資料庫
        # 注意：這些單字很短，不需要再做文本分割
        vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=embedding,
            persist_directory=VECTOR_DB_PATH
        )
        
        print(f"✅ 向量資料庫建立成功！")
        print(f"📁 儲存位置：{VECTOR_DB_PATH}")
        
        # 測試查詢
        print(f"\n🧪 測試查詢功能...")
        test_queries = ["dog", "狗", "food", "學校"]
        for query in test_queries:
            results = vectorstore.similarity_search(query, k=3)
            print(f"\n查詢「{query}」的結果：")
            for i, doc in enumerate(results, 1):
                print(f"  {i}. {doc.page_content} (主題: {doc.metadata.get('theme', 'N/A')})")
        
        return vectorstore
        
    except Exception as e:
        print(f"❌ 建立資料庫失敗：{e}")
        raise

if __name__ == "__main__":
    print("=" * 60)
    print("國小1200基礎單字向量資料庫建立工具")
    print("=" * 60)
    print()
    
    build_vocabulary_database()
    
    print("\n" + "=" * 60)
    print("✅ 完成！")
    print("=" * 60)

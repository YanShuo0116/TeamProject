import os
import json
import pandas as pd
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document
from langchain_chroma import Chroma
from src.utils import get_loader

# ✅ 改成相對路徑
CONFIG_PATH = "config/database_config.json"

def build_vector_db(path_to_file, dataset_name, vector_path, source_column=None):
    if not os.path.exists(path_to_file):
        raise FileNotFoundError(f"找不到教材檔案：{path_to_file}")

    ext = os.path.splitext(path_to_file)[1].lower()

    # 📌 特別處理雙欄 CSV：中英互為查詢來源與答案
    if ext == ".csv":
        df = pd.read_csv(path_to_file, encoding="utf-8")
        if "中文" in df.columns and "英文" in df.columns:
            documents = []
            for _, row in df.iterrows():
                zh = str(row["中文"]).strip()
                en = str(row["英文"]).strip()
                if zh and en:
                    documents.append(Document(page_content=zh, metadata={"label": en}))
                    documents.append(Document(page_content=en, metadata={"label": zh}))
        else:
            if not source_column or source_column not in df.columns:
                raise ValueError(f"{dataset_name} 的 CSV 缺少必要欄位（中文 & 英文），也未提供有效的 source_column。")
            documents = [
                Document(page_content=str(row[source_column]).strip()) 
                for _, row in df.iterrows()
                if str(row[source_column]).strip()
            ]
    else:
        # 🧠 非 CSV：用 loader 處理 PDF、TXT...
        loader = get_loader(path_to_file, source_column=source_column)
        documents = loader.load()

    if not documents:
        raise ValueError(f"{dataset_name} 無法從 {path_to_file} 載入任何內容")

    # ✂️ 切割文本
    splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)
    docs_split = splitter.split_documents(documents)

    # 🔍 建立向量資料庫
    embedding = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    Chroma.from_documents(docs_split, embedding=embedding, persist_directory=vector_path)

    print(f"✅ [{dataset_name}] 資料庫已建立 ➜ {vector_path}")

if __name__ == "__main__":
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        db_config = json.load(f)

    for dataset_name, entry in db_config.items():
        try:
            path = entry["path"]
            vector_path = entry["vector_path"]
            source_column = entry.get("source_column")
            print(f" 正在建立：{dataset_name} → {path}")
            build_vector_db(path, dataset_name, vector_path, source_column)
        except Exception as e:
            print(f" ❌ [{dataset_name}] 建立失敗：{e}") 
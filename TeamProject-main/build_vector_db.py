import os
import json
import pandas as pd
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings  # ✅ 新版本
from langchain.docstore.document import Document
from langchain_community.vectorstores import Chroma                # ✅ 新版本
from utils import get_loader

# 專案根目錄
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config", "database_config.json")

def build_vector_db(path_to_file, dataset_name, vector_path, source_column=None):
    full_path = os.path.join(BASE_DIR, path_to_file)  # ✅ 中文路徑也支援
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"找不到教材檔案：{full_path}")

    ext = os.path.splitext(full_path)[1].lower()

    # CSV 特別處理
    if ext == ".csv":
        df = pd.read_csv(full_path, encoding="utf-8")
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
                raise ValueError(f"{dataset_name} 的 CSV 缺少必要欄位，也未提供有效 source_column")
            documents = [
                Document(page_content=str(row[source_column]).strip())
                for _, row in df.iterrows()
                if str(row[source_column]).strip()
            ]
    else:
        # PDF / TXT
        loader = get_loader(full_path, source_column=source_column)
        documents = loader.load()

    if not documents:
        raise ValueError(f"{dataset_name} 無法從 {full_path} 載入任何內容")

    # 切割文本
    splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)
    docs_split = splitter.split_documents(documents)

    # 建立向量資料庫
    embedding = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    vector_path_full = os.path.join(BASE_DIR, vector_path)
    Chroma.from_documents(docs_split, embedding=embedding, persist_directory=vector_path_full)

    print(f"✅ [{dataset_name}] 資料庫已建立 ➜ {vector_path_full}")

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

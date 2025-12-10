import os
import json
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma  # ✅ 統一用這個
from config import settings
from utils import get_loader

class DatabaseManager:
    def __init__(self):
        # 使用正確的相對路徑
        base_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(base_dir, "config", "database_config.json")
        
        with open(config_path, "r", encoding="utf-8") as f:
            self.db_config = json.load(f)

        self.embedding = HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL_NAME,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )

    def build_vector_db(self, db_name: str) -> None:
        if db_name not in self.db_config:
            raise ValueError(f"資料庫設定中找不到：{db_name}")

        config = self.db_config[db_name]
        data_path = config["path"]
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"找不到教材檔案：{data_path}")

        loader = get_loader(data_path)
        print(f"[{db_name}] 正在載入教材：{data_path}")
        documents = loader.load()
        print(f"[{db_name}] 文件數量：{len(documents)}")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        docs = splitter.split_documents(documents)

        vector_path = config["vector_path"]
        Chroma.from_documents(
            documents=docs,
            embedding=self.embedding,
            persist_directory=vector_path
        )
        print(f"[{db_name}] 向量資料庫建立完成：{vector_path}")

    def load_vector_db(self, db_name: str):
        if db_name not in self.db_config:
            raise ValueError(f"資料庫設定中找不到：{db_name}")

        config = self.db_config[db_name]
        vector_path = config["vector_path"]
        return Chroma(
            persist_directory=vector_path,
            embedding_function=self.embedding
        )

    def delete_vector_db(self, db_name: str):
        """刪除指定的向量資料庫（包含 SQLite 檔與資料夾）"""
        if db_name not in self.db_config:
            raise ValueError(f"資料庫設定中找不到：{db_name}")

        vector_path = self.db_config[db_name]["vector_path"]
        if os.path.exists(vector_path):
            for file in os.listdir(vector_path):
                try:
                    os.remove(os.path.join(vector_path, file))
                except Exception as e:
                    print(f"[{db_name}] 刪除失敗：{file}，原因：{e}")
            print(f"[{db_name}] 向量資料庫已刪除：{vector_path}")
        else:
            print(f"[{db_name}] 無此向量資料庫：{vector_path}")

    def list_databases(self) -> list[str]:
        return list(self.db_config.keys())

    def get_multi_retriever(self, db_names: list[str], k: int = 3):
        """載入多個資料庫的 Retriever 並組合"""
        retrievers = []
        for db_name in db_names:
            retriever = self.load_vector_db(db_name).as_retriever(search_kwargs={"k": k})
            retrievers.append((db_name, retriever))
        return retrievers

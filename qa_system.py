import os
import re
from langchain.chains import RetrievalQA
from langchain.schema import BaseRetriever
from langchain.vectorstores.base import VectorStoreRetriever
from langchain_community.vectorstores import Chroma
from langchain.retrievers import EnsembleRetriever
from database_manager import DatabaseManager
from safe_gemini_llm import GeminiLLM
from api_key_manager import get_key  # ✅ 改用 API Key Manager

# ✅ 設定專案根目錄與 config 路徑
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))  # TeamProject-main 下的 qa_system.py
CONFIG_PATH = os.path.join(PROJECT_ROOT, "config", "database_config.json")

class QASystem:
    def __init__(self, db_names: list[str]):
        self.db_names = db_names
        # ✅ 傳入正確的 config 路徑
        self.db_manager = DatabaseManager(CONFIG_PATH)

        # ✅ 從 API Key Manager 取得 Gemini API Key
        api_key = get_key("gemini")
        if not api_key:
            raise ValueError("❌ 沒有設定 Gemini API 金鑰，請先到 API Key Manager 設定")

        self.llm = GeminiLLM(api_key=api_key)

        # 收集所有 retrievers
        self.retrievers: list[VectorStoreRetriever] = []
        for db_name in db_names:
            vectordb: Chroma = self.db_manager.load_vector_db(db_name)
            retriever = vectordb.as_retriever(search_kwargs={"k": 3})
            self.retrievers.append(retriever)

        # 合併 retrievers（如果只有一個就直接用）
        if len(self.retrievers) == 1:
            self.retriever: BaseRetriever = self.retrievers[0]
        else:
            self.retriever = EnsembleRetriever(
                retrievers=self.retrievers,
                weights=[1.0] * len(self.retrievers)
            )

        # 建立 QA Chain
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            retriever=self.retriever,
            return_source_documents=True
        )

    def ask(self, query: str) -> str:
        """
        教育工作者問答，用於學習輔助。
        回答會依據資料庫內容產生完整教學型回覆與資料來源說明。
        """
        # 查詢向量資料庫與生成答案
        result = self.qa_chain(query)
        answer = result["result"].strip()
        source_docs = result["source_documents"]

        if source_docs:
            sources_summary = []
            for doc in source_docs:
                label = doc.metadata.get("label", "")
                sources_summary.append(f"{label}")
            sources_str = "、".join(sources_summary)
            return (
                "根據教材資料庫，以下是針對您的學習問題的解答：\n\n"
                f"{answer}\n\n"
                f"（引用資料：{sources_str}）\n\n"
                "歡迎繼續提問。"
            )
        else:
            return (
                "很抱歉，在現有教材中找不到足夠的直接參考資料，但根據人工智慧模型的知識彙整，提供學習解釋，僅供參考：\n\n"
                f"{answer}\n\n"
                "如果有特定句型、詞彙用法或引申義需要說明，可再做補充詢問。"
            )

from langchain.chains import RetrievalQA
from langchain.schema import BaseRetriever
from langchain.vectorstores.base import VectorStoreRetriever
from langchain_chroma import Chroma
from langchain.retrievers import EnsembleRetriever
from src.database_manager import DatabaseManager
from src.safe_gemini_llm import GeminiLLM
from src.api_key_manager import get_key  # ✅ 改用 API Key Manager
import re

class QASystem:
    def __init__(self, db_names: list[str]):
        self.db_names = db_names
        self.db_manager = DatabaseManager()

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
        # 判斷是否輸入中文
        is_chinese = bool(re.search(r'[\u4e00-\u9fff]', query))

        # 查詢向量資料庫
        docs = self.retriever.invoke(query)

        if not docs:
            print("⚠️ 無教材命中，Gemini 翻譯：")
            prompt = f"請將這個詞翻譯成{'英文' if is_chinese else '繁體中文'}：{query}"
            return self.llm.invoke(prompt)

        print("📘 根據教材回答：")
        for doc in docs:
            content = doc.page_content.strip()
            label = doc.metadata.get("label", "").strip()

            if query == content:
                return f"📄 查詢結果：{label}"

        # fallback：即使命中但沒有完全比對，也給 Gemini 補翻譯
        print("⚠️ 教材中未找到精準翻譯，Gemini 翻譯：")
        prompt = f"請將這個詞翻譯成{'英文' if is_chinese else '繁體中文'}：{query}"
        return self.llm.invoke(prompt)

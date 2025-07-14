import os
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from gemini_llm import GeminiLLM

# 載入 .env 裡的 GEMINI_API_KEY
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

def load_qa_system():
    # 載入嵌入模型
    embedding = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")

    # 載入向量資料庫
    vectordb = Chroma(persist_directory="chroma_db", embedding_function=embedding)
    retriever = vectordb.as_retriever(search_kwargs={"k": 3})

    # 載入 Gemini 模型
    llm = GeminiLLM(api_key=api_key)

    return llm, retriever

if __name__ == "__main__":
    llm, retriever = load_qa_system()

    while True:
        query = input("請輸入問題：")
        if query.lower() in ["exit", "quit", "bye", "掰"]:
            break

        # 檢索教材資料
        docs = retriever.get_relevant_documents(query)
        context = "\n".join([doc.page_content for doc in docs])

        # 組合提示詞
        if context.strip():
            prompt = f"""以下是可能有幫助的教材內容：
{context}

請根據上方內容（若適用），回答以下問題：
{query}"""
        else:
            prompt = f"""找不到與教材內容相關的資料，請直接根據你的知識回答以下問題：
{query}"""

        # Gemini 回答
        print("\nGemini 的回答：")
        print(llm.invoke(prompt))
        print()

import os
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from gemini_llm import GeminiLLM

# 載入 .env 裡的 GEMINI_API_KEY
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# 如果環境變數沒有，嘗試從 api_key.txt 讀取
if not api_key and os.path.exists("api_key.txt"):
    with open("api_key.txt", "r", encoding="utf-8") as f:
        content = f.read().strip()
        if "GEMINI_API_KEY" in content:
            # 支援兩種格式: GEMINI_API_KEY="key" 或 GEMINI_API_KEY=key
            if "=" in content:
                api_key = content.split("=")[1].strip().strip('"')
            else:
                api_key = content.split('"')[1]

print(f"🔑 API Key 狀態: {'✅ 已載入' if api_key else '❌ 未找到'}")

def load_qa_system():
    # 載入嵌入模型
    embedding = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")

    # 載入向量資料庫
    vectordb = Chroma(persist_directory="chroma_db", embedding_function=embedding)
    retriever = vectordb.as_retriever(search_kwargs={"k": 3})

    # 確保有 API key
    current_api_key = api_key
    if not current_api_key:
        print("❌ 錯誤: 找不到 GEMINI_API_KEY")
        print("請確認:")
        print("1. api_key.txt 檔案存在且格式正確")
        print("2. 或設定環境變數: export GEMINI_API_KEY='your_key'")
        raise ValueError("API Key 未設定")
    
    # 載入 Gemini 模型
    llm = GeminiLLM(api_key=current_api_key)

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

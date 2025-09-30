

import os
import shutil
import tempfile
import json
import re

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import google.generativeai as genai

from utils import get_loader
from api_key_manager import get_key

def extract_vocabulary_with_rag(file_path: str) -> list[dict]:
    """
    使用 RAG 技術從單一檔案中提取單字列表。

    Args:
        file_path: 上傳檔案的絕對路徑。

    Returns:
        一個包含單字和翻譯的字典列表，例如 [{'word': 'example', 'translation': '範例'}]。
    """
    temp_db_path = tempfile.mkdtemp()
    
    try:
        # 1. 載入與分割文件
        loader = get_loader(file_path)
        documents = loader.load()
        
        if not documents:
            raise ValueError("無法從檔案中載入任何內容。")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100,
            length_function=len,
            separators=["\n\n", "\n", "。", ".", " ", ""]
        )
        docs_split = splitter.split_documents(documents)

        if not docs_split:
            raise ValueError("檔案內容切割後為空，無法建立索引。")

        # 2. 建立臨時向量資料庫
        embedding = HuggingFaceEmbeddings(
            model_name="BAAI/bge-small-en-v1.5",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        vectorstore = Chroma.from_documents(
            documents=docs_split, 
            embedding=embedding, 
            persist_directory=temp_db_path
        )
        
        # 3. 檢索最相關的段落 (Retrieve)
        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
        retrieval_query = "The most important topics, key concepts, and essential vocabulary in this document"
        retrieved_docs = retriever.get_relevant_documents(retrieval_query)
        
        context_text = "\n---\n".join([doc.page_content for doc in retrieved_docs])

        # 4. 根據檢索到的內容生成單字 (Generate)
        api_key = get_key("gemini")
        if not api_key:
            raise ValueError("Gemini API 金鑰未設定。")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash-lite-preview-06-17')

        prompt = f"""
        You are an expert English teacher assisting a student learning English.
        Based ONLY on the key passages provided below, identify the most suitable vocabulary words for an English language learner.
        Extract between 5-15 words depending on the content richness. Do not force exactly 15 words if the content doesn't contain enough suitable vocabulary.
        For each word, provide its traditional Chinese translation.

        Key Passages:
        ---
        {context_text}
        ---

        Your response MUST be a valid JSON array of objects. Each object must have a 'word' and a 'translation' key.
        Do not include any text outside of the JSON array.
        Do not repeat words or create duplicate entries.

        Example format:
        [
          {{"word": "example", "translation": "範例"}},
          {{"word": "document", "translation": "文件"}}
        ]
        """

        response = model.generate_content(prompt)
        
        # 從回應中提取 JSON 字串
        # 模型有時會在 JSON 前後加上 ```json ... ```
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```|([\s\S]*)', response.text)
        if not json_match:
            raise ValueError(f"模型未返回有效的 JSON 格式。收到的回應: {response.text}")
            
        json_str = json_match.group(1) or json_match.group(2)
        
        # 5. 解析並返回結果
        vocabulary_list = json.loads(json_str)
        return vocabulary_list

    except Exception as e:
        print(f"在 RAG 提取過程中發生錯誤: {e}")
        # 在發生錯誤時也返回一個空列表或重新引發異常，取決於您希望的錯誤處理方式
        return []
    finally:
        # 6. 清理臨時資料庫
        if os.path.exists(temp_db_path):
            shutil.rmtree(temp_db_path)
            print(f"已清理臨時資料庫: {temp_db_path}")

if __name__ == '__main__':
    # 建立一個測試用的假檔案
    test_file_path = "rag_test.txt"
    with open(test_file_path, "w", encoding="utf-8") as f:
        f.write("""
        Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to the natural intelligence displayed by humans and other animals.
        Leading AI textbooks define the field as the study of "intelligent agents": any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals.
        The term "artificial intelligence" had previously been used to describe machines that mimic and display "human" cognitive skills that are associated with the human mind, such as "learning" and "problem-solving".
        This definition has since been rejected by major AI researchers who now describe AI in terms of rationality and acting rationally, which does not limit AI to human-like intelligence.
        AI applications include advanced web search engines (e.g., Google Search), recommendation systems (used by YouTube, Amazon, and Netflix), understanding human speech (such as Siri and Alexa), self-driving cars (e.g., Tesla), automated decision-making, and competing at the highest level in strategic game systems (such as chess and Go).
        As machines become increasingly capable, tasks considered to require "intelligence" are often removed from the definition of AI, a phenomenon known as the AI effect.
        For instance, optical character recognition is frequently excluded from things considered to be AI, having become a routine technology.
        """)

    print(f"正在使用測試檔案 '{test_file_path}' 進行 RAG 單字提取...")
    
    try:
        # 執行提取
        extracted_words = extract_vocabulary_with_rag(test_file_path)

        if extracted_words:
            print("\n✅ RAG 提取成功！")
            print("提取到的單字:")
            for item in extracted_words:
                print(f"- {item['word']}: {item['translation']}")
        else:
            print("\n❌ RAG 提取失敗或未返回任何單字。")

    finally:
        # 清理測試檔案
        if os.path.exists(test_file_path):
            os.remove(test_file_path)
            print(f"\n已刪除測試檔案: {test_file_path}")

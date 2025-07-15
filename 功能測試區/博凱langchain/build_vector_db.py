import os
import csv
from langchain.docstore.document import Document
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# 處理 CSV 格式：將每列轉成「英文: 中文」格式
def load_csv_as_docs(file_path):
    docs = []
    with open(file_path, encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader)  # 跳過標題列
        for row in reader:
            if len(row) >= 2:
                content = f"{row[0].strip()}: {row[1].strip()}"
                docs.append(Document(page_content=content))
    return docs

# 根據檔案副檔名選擇 Loader
def detect_loader(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".txt":
        return TextLoader(file_path, encoding="utf-8").load()
    elif ext == ".pdf":
        return PyPDFLoader(file_path).load()
    elif ext == ".csv":
        return load_csv_as_docs(file_path)
    else:
        raise ValueError(f"不支援的檔案格式：{ext}")

# 主函式：建立向量資料庫
def build_vector_db(path_to_file, db_path="chroma_db"):
    if not os.path.exists(path_to_file):
        raise FileNotFoundError(f"教材檔案未找到：{path_to_file}")

    documents = detect_loader(path_to_file)

    splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)
    docs_split = splitter.split_documents(documents)

    embedding = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")

    Chroma.from_documents(docs_split, embedding=embedding, persist_directory=db_path)
    print(f"✅ 向量資料庫已建立，儲存於：{db_path}")

if __name__ == "__main__":
    # 可連續處理多種教材
    build_vector_db("國小英文教材/elementary_english_material.txt")
    build_vector_db("國小英文教材/基礎1200單字/國小1200基礎單字每日學習表.csv")
    build_vector_db("國小英文教材/基礎1200單字/國小1200基礎單字每日學習表.pdf")
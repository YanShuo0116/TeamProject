import os
from langchain_community.document_loaders import TextLoader, CSVLoader, PyPDFLoader

def get_loader(file_path, source_column=None):  # ← ✅ 加上 source_column
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".txt":
        return TextLoader(file_path, encoding="utf-8")
    
    elif ext == ".csv":
        return CSVLoader(file_path=file_path, encoding="utf-8", source_column=source_column or "中文")
    
    elif ext == ".pdf":
        return PyPDFLoader(file_path)
    
    else:
        raise ValueError(f"❌ 不支援的檔案格式：{ext}")
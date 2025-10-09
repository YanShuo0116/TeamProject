import os
from dotenv import load_dotenv

load_dotenv()

class settings:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    CHUNK_SIZE = 300
    CHUNK_OVERLAP = 50
    EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"
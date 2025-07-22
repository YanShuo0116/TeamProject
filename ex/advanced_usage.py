from src.qa_system import QASystem
from src.safe_gemini_llm import SafeGeminiLLM
from src.database_manager import DatabaseManager

question = "請用單字說明 what is 精神 in English?"
selected_dbs = ["vocabulary_1200", "elementary_english"]

qa = QASystem(selected_dbs)
print("Using Vector DBs:", selected_dbs)
print("Question:", question)
print("Answer:", qa.ask(question))

fallback = SafeGeminiLLM()
print("\nGemini fallback:", fallback.invoke(question))

from src.qa_system import QASystem

qa = QASystem(["elementary_english"])
question = "How do you say 軍人 in English?"
print("Question:", question)
print("Answer:", qa.ask(question))
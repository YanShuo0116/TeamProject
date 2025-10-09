from langchain_core.language_models.llms import LLM
from pydantic import BaseModel
import google.generativeai as genai

class GeminiLLM(LLM, BaseModel):
    api_key: str

    def _call(self, prompt: str, **kwargs) -> str:
        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel("gemini-2.5-pro")  # ✅ 正確名稱
        response = model.generate_content(prompt)
        return response.text.strip()

    @property
    def _llm_type(self) -> str:
        return "gemini-llm"

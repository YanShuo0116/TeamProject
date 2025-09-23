"""
輕量化多 API 協作管理器（整合 src/api_key_manager.py）
"""
import google.generativeai as genai
import time
import logging
from datetime import datetime, timedelta
from typing import Optional
import api_key_manager  # 使用統一的 key 來源


class APIKeyManagerWrapper:
    """包裝 src/api_key_manager.py，管理 key 狀態和統計"""
    def __init__(self):
        self.api_keys = api_key_manager.get_all_keys()
        self.key_stats = {}  # 統計每個 key
        self.failed_keys = set()
        self.last_cleanup = datetime.now()
        self.logger = logging.getLogger(__name__)
        self._initialize_keys()

    def _initialize_keys(self):
        for key in self.api_keys:
            key_id = key[-8:]
            self.key_stats[key_id] = {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'last_used': None,
                'avg_response_time': 0,
                'consecutive_failures': 0
            }

    def get_best_key(self) -> Optional[str]:
        available_keys = [k for k in self.api_keys if k not in self.failed_keys]
        if not available_keys:
            self._reset_failed_keys()
            available_keys = self.api_keys
        if not available_keys:
            return None

        # 選使用次數最少的 key
        key_usage = {k: self.key_stats[k[-8:]]['total_requests'] for k in available_keys}
        return min(key_usage.keys(), key=key_usage.get)

    def mark_key_success(self, key: str, response_time: float):
        key_id = key[-8:]
        stats = self.key_stats[key_id]
        stats['total_requests'] += 1
        stats['successful_requests'] += 1
        stats['last_used'] = datetime.now()
        stats['consecutive_failures'] = 0
        stats['avg_response_time'] = (stats['avg_response_time'] + response_time) / 2 if stats['avg_response_time'] > 0 else response_time

    def mark_key_failure(self, key: str):
        key_id = key[-8:]
        stats = self.key_stats[key_id]
        stats['total_requests'] += 1
        stats['failed_requests'] += 1
        stats['consecutive_failures'] += 1
        if stats['consecutive_failures'] >= 3:
            self.failed_keys.add(key)
            self.logger.warning(f"API key {key_id} 連續失敗，暫時禁用")

    def _reset_failed_keys(self):
        if datetime.now() - self.last_cleanup > timedelta(hours=1):
            self.failed_keys.clear()
            self.last_cleanup = datetime.now()
            self.logger.info("重置失效 API key 列表")

    def get_stats(self) -> dict:
        total_requests = sum(s['total_requests'] for s in self.key_stats.values())
        total_successful = sum(s['successful_requests'] for s in self.key_stats.values())
        return {
            'total_keys': len(self.api_keys),
            'active_keys': len(self.api_keys) - len(self.failed_keys),
            'failed_keys': len(self.failed_keys),
            'total_requests': total_requests,
            'success_rate': (total_successful / total_requests * 100) if total_requests > 0 else 0,
        }


class LightweightGeminiManager:
    """Gemini 管理器，支援自動切換 Key 與重試"""
    def __init__(self, model_name: str = 'gemini-2.5-flash-lite-preview-06-17'):
        self.model_name = model_name
        self.key_manager = APIKeyManagerWrapper()
        self.current_model = None
        self.current_key = None
        self.logger = logging.getLogger(__name__)
        self._initialize_model()

    def _initialize_model(self):
        key = self.key_manager.get_best_key()
        if key:
            try:
                genai.configure(api_key=key)
                self.current_model = genai.GenerativeModel(self.model_name)
                self.current_key = key
                self.logger.info(f"初始化模型成功，使用 key: ...{key[-8:]}")
            except Exception as e:
                self.logger.error(f"初始化模型失敗: {e}")
                self.key_manager.mark_key_failure(key)
                self.current_model = None

    def _switch_key(self):
        new_key = self.key_manager.get_best_key()
        if new_key and new_key != self.current_key:
            try:
                genai.configure(api_key=new_key)
                self.current_model = genai.GenerativeModel(self.model_name)
                self.current_key = new_key
                self.logger.info(f"切換到新的 API key: ...{new_key[-8:]}")
                return True
            except Exception as e:
                self.logger.error(f"切換 API key 失敗: {e}")
                self.key_manager.mark_key_failure(new_key)
        return False

    def generate_content(self, prompt: str, max_retries: int = 3) -> str:
        for attempt in range(max_retries):
            if not self.current_model:
                self._initialize_model()
                if not self.current_model:
                    raise Exception("沒有可用的 API key")
            try:
                start_time = time.time()
                response = self.current_model.generate_content(prompt)
                response_time = time.time() - start_time
                self.key_manager.mark_key_success(self.current_key, response_time)
                return response.text
            except Exception as e:
                self.logger.warning(f"請求失敗 (嘗試 {attempt + 1}/{max_retries}): {e}")
                self.key_manager.mark_key_failure(self.current_key)
                if attempt < max_retries - 1 and self._switch_key():
                    continue
                if attempt == max_retries - 1:
                    raise Exception(f"所有重試都失敗了: {e}")

    def get_stats(self):
        return self.key_manager.get_stats()


# 全局實例
_gemini_manager = None

def get_gemini_manager() -> LightweightGeminiManager:
    global _gemini_manager
    if _gemini_manager is None:
        _gemini_manager = LightweightGeminiManager()
    return _gemini_manager

def generate_content_safe(prompt: str) -> str:
    manager = get_gemini_manager()
    return manager.generate_content(prompt)


# 兼容性包裝類
class SafeGenerativeModel:
    """兼容原有代碼的包裝類"""
    def __init__(self, model_name: str = 'gemini-2.5-flash-lite-preview-06-17'):
        self.manager = LightweightGeminiManager(model_name)
    
    def generate_content(self, prompt: str):
        """兼容原有接口"""
        content = self.manager.generate_content(prompt)
        
        # 返回兼容的響應對象
        class Response:
            def __init__(self, text):
                self.text = text
        
        return Response(content)
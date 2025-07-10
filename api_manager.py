"""
輕量化多 API 協作管理器
功能：負載平衡、錯誤重試、API key 隱藏
"""
import google.generativeai as genai
import random
import time
import logging
from typing import List, Optional
from datetime import datetime, timedelta
import json
import os

class APIKeyManager:
    def __init__(self, config_file: str = "api_config.json"):
        self.config_file = config_file
        self.api_keys = []
        self.key_stats = {}  # 記錄每個 key 的使用統計
        self.failed_keys = set()  # 記錄失效的 key
        self.last_cleanup = datetime.now()
        self.logger = logging.getLogger(__name__)
        
        self._load_config()
        self._initialize_keys()
    
    def _load_config(self):
        """載入配置文件"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    self.api_keys = config.get('api_keys', [])
            else:
                # 如果沒有配置文件，使用環境變數或預設值
                self.api_keys = [
                    os.getenv('GEMINI_API_KEY_1', 'AIzaSyDo3-S0kOSPo9O99cTolLQUv3-x3Ebq3kM'),
                    os.getenv('GEMINI_API_KEY_2', ''),  # 可以添加更多 key
                    os.getenv('GEMINI_API_KEY_3', ''),
                ]
                # 過濾空的 key
                self.api_keys = [key for key in self.api_keys if key.strip()]
                
        except Exception as e:
            self.logger.error(f"載入配置失敗: {e}")
            # 使用預設 key
            self.api_keys = ['AIzaSyDo3-S0kOSPo9O99cTolLQUv3-x3Ebq3kM']
    
    def _initialize_keys(self):
        """初始化 API key 統計"""
        for key in self.api_keys:
            key_id = key[-8:]  # 使用後8位作為識別
            self.key_stats[key_id] = {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'last_used': None,
                'avg_response_time': 0,
                'consecutive_failures': 0
            }
    
    def get_best_key(self) -> Optional[str]:
        """獲取最佳可用的 API key"""
        available_keys = [key for key in self.api_keys if key not in self.failed_keys]
        
        if not available_keys:
            # 如果所有 key 都失效，重置失效列表（可能是臨時問題）
            self._reset_failed_keys()
            available_keys = self.api_keys
        
        if not available_keys:
            return None
        
        # 簡單的負載平衡：選擇使用次數最少的 key
        key_usage = {}
        for key in available_keys:
            key_id = key[-8:]
            key_usage[key] = self.key_stats[key_id]['total_requests']
        
        # 返回使用次數最少的 key
        return min(key_usage.keys(), key=key_usage.get)
    
    def mark_key_success(self, key: str, response_time: float):
        """標記 key 使用成功"""
        key_id = key[-8:]
        stats = self.key_stats[key_id]
        stats['total_requests'] += 1
        stats['successful_requests'] += 1
        stats['last_used'] = datetime.now()
        stats['consecutive_failures'] = 0
        
        # 更新平均響應時間
        if stats['avg_response_time'] == 0:
            stats['avg_response_time'] = response_time
        else:
            stats['avg_response_time'] = (stats['avg_response_time'] + response_time) / 2
    
    def mark_key_failure(self, key: str):
        """標記 key 使用失敗"""
        key_id = key[-8:]
        stats = self.key_stats[key_id]
        stats['total_requests'] += 1
        stats['failed_requests'] += 1
        stats['consecutive_failures'] += 1
        
        # 如果連續失敗超過3次，暫時禁用這個 key
        if stats['consecutive_failures'] >= 3:
            self.failed_keys.add(key)
            self.logger.warning(f"API key {key_id} 連續失敗，暫時禁用")
    
    def _reset_failed_keys(self):
        """重置失效的 key（每小時執行一次）"""
        if datetime.now() - self.last_cleanup > timedelta(hours=1):
            self.failed_keys.clear()
            self.last_cleanup = datetime.now()
            self.logger.info("重置失效 API key 列表")
    
    def get_stats(self) -> dict:
        """獲取統計信息"""
        total_requests = sum(stats['total_requests'] for stats in self.key_stats.values())
        total_successful = sum(stats['successful_requests'] for stats in self.key_stats.values())
        
        return {
            'total_keys': len(self.api_keys),
            'active_keys': len(self.api_keys) - len(self.failed_keys),
            'failed_keys': len(self.failed_keys),
            'total_requests': total_requests,
            'success_rate': (total_successful / total_requests * 100) if total_requests > 0 else 0,
            'key_details': {
                key_id: {
                    'requests': stats['total_requests'],
                    'success_rate': (stats['successful_requests'] / stats['total_requests'] * 100) 
                                  if stats['total_requests'] > 0 else 0,
                    'avg_response_time': round(stats['avg_response_time'], 2),
                    'status': 'active' if f"...{key_id}" not in [k[-8:] for k in self.failed_keys] else 'failed'
                }
                for key_id, stats in self.key_stats.items()
            }
        }

class LightweightGeminiManager:
    def __init__(self, model_name: str = 'gemini-2.5-flash-lite-preview-06-17'):
        self.model_name = model_name
        self.key_manager = APIKeyManager()
        self.current_model = None
        self.logger = logging.getLogger(__name__)
        
        # 初始化第一個可用的模型
        self._initialize_model()
    
    def _initialize_model(self):
        """初始化 Gemini 模型"""
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
        """切換到另一個 API key"""
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
        """
        生成內容，支援自動重試和 key 切換
        """
        for attempt in range(max_retries):
            if not self.current_model:
                self._initialize_model()
                if not self.current_model:
                    raise Exception("沒有可用的 API key")
            
            try:
                start_time = time.time()
                response = self.current_model.generate_content(prompt)
                response_time = time.time() - start_time
                
                # 標記成功
                self.key_manager.mark_key_success(self.current_key, response_time)
                
                return response.text
                
            except Exception as e:
                self.logger.warning(f"請求失敗 (嘗試 {attempt + 1}/{max_retries}): {e}")
                
                # 標記失敗
                self.key_manager.mark_key_failure(self.current_key)
                
                # 如果不是最後一次嘗試，切換 key
                if attempt < max_retries - 1:
                    if self._switch_key():
                        continue
                    else:
                        # 等待一下再重試
                        time.sleep(1)
                
                # 最後一次嘗試失敗
                if attempt == max_retries - 1:
                    raise Exception(f"所有重試都失敗了: {e}")
    
    def get_stats(self) -> dict:
        """獲取管理器統計信息"""
        return self.key_manager.get_stats()

# 全局實例
_gemini_manager = None

def get_gemini_manager() -> LightweightGeminiManager:
    """獲取全局 Gemini 管理器實例"""
    global _gemini_manager
    if _gemini_manager is None:
        _gemini_manager = LightweightGeminiManager()
    return _gemini_manager

def generate_content_safe(prompt: str) -> str:
    """
    安全的內容生成函數，替代原有的 model.generate_content()
    """
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
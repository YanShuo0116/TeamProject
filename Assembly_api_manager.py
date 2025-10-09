"""
AssemblyAI API 金鑰管理器
專為英文口說練習設計，支援3組金鑰負載平衡。
加上完整 debug log，並保留本地 fallback。
"""
import assemblyai as aai
import random
import time
import logging
from typing import Optional
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# 載入 .env 文件
load_dotenv()

class AssemblyAPIKeyManager:
    def __init__(self):
        self.api_keys = []
        self.key_stats = {}  # 記錄每個 key 的使用統計
        self.failed_keys = set()  # 記錄失效的 key
        self.last_cleanup = datetime.now()
        
        self._load_config()
        self._initialize_keys()
    
    def _load_config(self):
        """從 .env 環境變量載入 AssemblyAI 的 API keys"""
        try:
            env_keys = []
            for i in range(1, 4):  # 支援最多3個API key
                key = os.getenv(f'ASSEMBLYAI_API_KEY_{i}')
                if key and key.strip():
                    env_keys.append(key.strip())
            
            if env_keys:
                self.api_keys = env_keys
                print(f"🔑 載入 AssemblyAI API keys: {len(env_keys)} 個")
            else:
                print("⚠️ 在 .env 中未找到 ASSEMBLYAI_API_KEY_1/2/3，請檢查設定。")

            # 載入通用設定
            self.failure_threshold = int(os.getenv('API_FAILURE_THRESHOLD', 3))
            self.reset_interval_hours = int(os.getenv('API_RESET_INTERVAL_HOURS', 1))
                
        except Exception as e:
            print(f"❌ 載入 AssemblyAI 配置失敗: {e}")
            self.api_keys = []

    def _initialize_keys(self):
        """初始化 API key 統計"""
        for key in self.api_keys:
            key_id = key[-6:]  # 使用後6位作為識別
            self.key_stats[key_id] = {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'consecutive_failures': 0
            }
    
    def get_best_key(self) -> Optional[str]:
        """獲取最佳可用的 API key"""
        available_keys = [key for key in self.api_keys if key not in self.failed_keys]
        if not available_keys:
            self._reset_failed_keys()
            available_keys = self.api_keys
        if not available_keys:
            return None
        return random.choice(available_keys)
    
    def mark_key_success(self, key: str):
        key_id = key[-6:]
        if key_id in self.key_stats:
            stats = self.key_stats[key_id]
            stats['total_requests'] += 1
            stats['successful_requests'] += 1
            stats['consecutive_failures'] = 0
    
    def mark_key_failure(self, key: str):
        key_id = key[-6:]
        if key_id in self.key_stats:
            stats = self.key_stats[key_id]
            stats['total_requests'] += 1
            stats['failed_requests'] += 1
            stats['consecutive_failures'] += 1
            
            if stats['consecutive_failures'] >= self.failure_threshold:
                self.failed_keys.add(key)
                print(f"⚠️ AssemblyAI key ...{key_id} 連續失敗，暫時禁用")
    
    def _reset_failed_keys(self):
        if datetime.now() - self.last_cleanup > timedelta(hours=self.reset_interval_hours):
            self.failed_keys.clear()
            self.last_cleanup = datetime.now()
            print("♻️ 重置失效的 AssemblyAI key 列表")

class AssemblyAITranscriber:
    def __init__(self):
        self.key_manager = AssemblyAPIKeyManager()

    def transcribe(self, audio_file_path: str, max_retries: int = 3) -> Optional[aai.Transcript]:
        """英文口說專用轉錄，支援自動重試和 key 切換"""
        if not os.path.exists(audio_file_path):
            print(f"❌ 音檔不存在: {audio_file_path}")
            return None
        else:
            print(f"📂 準備轉錄音檔: {audio_file_path} (大小: {os.path.getsize(audio_file_path)} bytes)")

        for attempt in range(max_retries):
            key = self.key_manager.get_best_key()
            if not key:
                print("❌ 沒有可用的 AssemblyAI API key")
                return None
            
            try:
                aai.settings.api_key = key
                print(f"🚀 嘗試使用 AssemblyAI key ...{key[-6:]} (第 {attempt+1}/{max_retries} 次嘗試)")

                transcriber = aai.Transcriber()
                config = aai.TranscriptionConfig(
                    language_code="en_us",
                    punctuate=False,
                    format_text=False,
                    disfluencies=False,
                    word_boost=["apple", "book", "cat", "dog", "hello", "yes", "no", "red", "blue", "car", "house", "water", "food", "happy", "good"]
                )
                transcript = transcriber.transcribe(audio_file_path, config=config)

                print(f"📩 AssemblyAI 回應狀態: {transcript.status}")
                if transcript.status == aai.TranscriptStatus.error:
                    print(f"❌ AssemblyAI 錯誤訊息: {transcript.error}")
                    raise Exception(transcript.error)
                
                self.key_manager.mark_key_success(key)
                # 空文字也會回傳，但後續在 speech_to_text 會檢查
                return transcript

            except Exception as e:
                print(f"⚠️ 使用 key ...{key[-6:]} 轉錄失敗: {e}")
                self.key_manager.mark_key_failure(key)
                time.sleep(1)
        
        print("❌ 所有 AssemblyAI key 重試均失敗")
        return None

# 全局單例
_assembly_transcriber = None

def get_assembly_transcriber() -> AssemblyAITranscriber:
    """獲取全局 AssemblyAI 轉錄器實例"""
    global _assembly_transcriber
    if _assembly_transcriber is None:
        _assembly_transcriber = AssemblyAITranscriber()
    return _assembly_transcriber

import os
import json

API_KEY_FILE = "api_keys.json"

def load_keys():
    """載入所有 API key"""
    if os.path.exists(API_KEY_FILE):
        with open(API_KEY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_keys(keys):
    """儲存 API key"""
    with open(API_KEY_FILE, "w", encoding="utf-8") as f:
        json.dump(keys, f, indent=2, ensure_ascii=False)

def set_key(name, key_value):
    """新增或更新 API key"""
    keys = load_keys()
    keys[name] = key_value
    save_keys(keys)

def delete_key(name):
    """刪除 API key"""
    keys = load_keys()
    if name in keys:
        del keys[name]
        save_keys(keys)

def get_key(name):
    """取得指定 API key"""
    keys = load_keys()
    return keys.get(name)

def list_keys():
    """列出所有 key 名稱"""
    return list(load_keys().keys())

def get_all_keys():
    """取得所有 key 值（方便管理器使用）"""
    return list(load_keys().values())

# src/api_key_manager.py

import os
import json

API_KEY_FILE = "api_keys.json"

def load_keys():
    if os.path.exists(API_KEY_FILE):
        with open(API_KEY_FILE, "r") as f:
            return json.load(f)
    return {}

def save_keys(keys):
    with open(API_KEY_FILE, "w") as f:
        json.dump(keys, f, indent=2)

def set_key(name, key_value):
    keys = load_keys()
    keys[name] = key_value
    save_keys(keys)

def delete_key(name):
    keys = load_keys()
    if name in keys:
        del keys[name]
        save_keys(keys)

def get_key(name):
    keys = load_keys()
    return keys.get(name)

def list_keys():
    return list(load_keys().keys())

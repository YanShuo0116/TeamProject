#!/usr/bin/env python3
"""
數據庫遷移腳本：創建翻譯記錄表
"""

import sqlite3
import os

def migrate_database():
    db_path = 'instance/learning_platform.db'
    
    if not os.path.exists(db_path):
        print(f"數據庫文件不存在: {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 檢查是否已經有 translation_records 表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='translation_records'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("創建 translation_records 表...")
            cursor.execute("""
                CREATE TABLE translation_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id VARCHAR(64) NOT NULL,
                    user_id INTEGER,
                    word VARCHAR(200) NOT NULL,
                    translation TEXT,
                    explanation TEXT,
                    examples TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'processing',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    completed_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # 創建索引
            cursor.execute("CREATE INDEX idx_translation_session_id ON translation_records(session_id)")
            cursor.execute("CREATE INDEX idx_translation_user_id ON translation_records(user_id)")
            cursor.execute("CREATE INDEX idx_translation_created_at ON translation_records(created_at)")
            
            conn.commit()
            print("translation_records 表創建完成！")
        else:
            print("translation_records 表已存在，無需創建。")
            
    except Exception as e:
        print(f"遷移失敗: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
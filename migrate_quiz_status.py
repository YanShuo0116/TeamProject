#!/usr/bin/env python3
"""
數據庫遷移腳本：為 QuizAttempt 表添加 status 字段
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
        
        # 檢查是否已經有 status 字段
        cursor.execute("PRAGMA table_info(quiz_attempts)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'status' not in columns:
            print("添加 status 字段到 quiz_attempts 表...")
            cursor.execute("ALTER TABLE quiz_attempts ADD COLUMN status VARCHAR(20) DEFAULT 'completed'")
            
            # 更新現有記錄的狀態
            print("更新現有記錄的狀態...")
            cursor.execute("""
                UPDATE quiz_attempts 
                SET status = CASE 
                    WHEN completed_at IS NOT NULL THEN 'completed'
                    ELSE 'abandoned'
                END
            """)
            
            conn.commit()
            print("遷移完成！")
        else:
            print("status 字段已存在，無需遷移。")
            
    except Exception as e:
        print(f"遷移失敗: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
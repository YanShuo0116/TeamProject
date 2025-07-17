#!/usr/bin/env python3
"""
資料庫遷移腳本：為現有用戶添加口音偏好設定
執行此腳本來更新資料庫結構並為現有用戶設定預設口音偏好
"""

import os
import sys
from flask import Flask
from models import db, User

def create_app():
    """創建 Flask 應用程式"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/learning_platform.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app

def migrate_accent_preference():
    """遷移用戶口音偏好設定"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔄 開始遷移用戶口音偏好設定...")
            
            # 檢查是否需要添加新欄位
            try:
                # 嘗試查詢新欄位，如果失敗表示欄位不存在
                from sqlalchemy import text
                db.session.execute(text("SELECT preferred_accent FROM users LIMIT 1"))
                print("✅ preferred_accent 欄位已存在")
            except Exception:
                print("📝 添加 preferred_accent 欄位...")
                # 添加新欄位
                from sqlalchemy import text
                db.session.execute(text("ALTER TABLE users ADD COLUMN preferred_accent VARCHAR(10) DEFAULT 'us'"))
                db.session.commit()
                print("✅ preferred_accent 欄位添加成功")
            
            # 更新所有沒有設定口音偏好的用戶
            users_without_accent = User.query.filter(
                (User.preferred_accent == None) | (User.preferred_accent == '')
            ).all()
            
            if users_without_accent:
                print(f"📊 發現 {len(users_without_accent)} 個用戶需要設定預設口音偏好")
                
                for user in users_without_accent:
                    user.preferred_accent = 'us'  # 預設使用美式口音
                    print(f"   - 用戶 {user.username} 設定為美式口音")
                
                db.session.commit()
                print(f"✅ 已為 {len(users_without_accent)} 個用戶設定預設口音偏好")
            else:
                print("✅ 所有用戶都已有口音偏好設定")
            
            # 驗證遷移結果
            total_users = User.query.count()
            users_with_accent = User.query.filter(User.preferred_accent.isnot(None)).count()
            
            print(f"📊 遷移結果統計:")
            print(f"   - 總用戶數: {total_users}")
            print(f"   - 已設定口音偏好的用戶: {users_with_accent}")
            print(f"   - 遷移成功率: {(users_with_accent/total_users*100):.1f}%" if total_users > 0 else "   - 無用戶資料")
            
            print("🎉 口音偏好設定遷移完成！")
            
        except Exception as e:
            print(f"❌ 遷移失敗: {e}")
            db.session.rollback()
            return False
        
        return True

def verify_migration():
    """驗證遷移結果"""
    app = create_app()
    
    with app.app_context():
        try:
            # 檢查欄位是否存在
            from sqlalchemy import text
            result = db.session.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'preferred_accent' not in columns:
                print("❌ preferred_accent 欄位不存在")
                return False
            
            # 檢查資料完整性
            total_users = User.query.count()
            users_with_valid_accent = User.query.filter(
                User.preferred_accent.in_(['us', 'co.uk'])
            ).count()
            
            print(f"✅ 驗證結果:")
            print(f"   - preferred_accent 欄位存在: ✓")
            print(f"   - 總用戶數: {total_users}")
            print(f"   - 有效口音設定的用戶: {users_with_valid_accent}")
            print(f"   - 資料完整性: {(users_with_valid_accent/total_users*100):.1f}%" if total_users > 0 else "   - 無用戶資料")
            
            return users_with_valid_accent == total_users
            
        except Exception as e:
            print(f"❌ 驗證失敗: {e}")
            return False

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 用戶口音偏好設定遷移工具")
    print("=" * 60)
    
    # 檢查資料庫檔案是否存在
    if not os.path.exists('instance/learning_platform.db'):
        print("❌ 找不到資料庫檔案 instance/learning_platform.db")
        print("請確保在正確的目錄下執行此腳本")
        sys.exit(1)
    
    # 執行遷移
    success = migrate_accent_preference()
    
    if success:
        print("\n" + "=" * 60)
        print("🔍 驗證遷移結果...")
        print("=" * 60)
        
        if verify_migration():
            print("🎉 遷移驗證成功！所有用戶都已正確設定口音偏好。")
        else:
            print("⚠️ 遷移驗證發現問題，請檢查資料庫狀態。")
    else:
        print("❌ 遷移失敗，請檢查錯誤訊息並重試。")
    
    print("\n" + "=" * 60)
    print("遷移完成")
    print("=" * 60)
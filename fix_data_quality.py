#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from app import app, db
from models import Vocabulary
from datetime import datetime

def fix_data_quality():
    """修復資料庫中的資料品質問題"""
    with app.app_context():
        print("🔧 開始修復資料品質問題...")
        
        # 1. 修復英文單字的null值
        print("\n1. 修復英文單字的null值:")
        
        null_words = Vocabulary.query.filter(
            (Vocabulary.word == 'null') | 
            (Vocabulary.word == '') | 
            (Vocabulary.word.is_(None))
        ).all()
        
        fixed_words = 0
        for word in null_words:
            word.word = f"word_{word.id}"
            fixed_words += 1
        
        print(f"  - 修復了 {fixed_words} 個英文單字")
        
        # 2. 修復中文翻譯的null值
        print("\n2. 修復中文翻譯的null值:")
        
        null_chinese = Vocabulary.query.filter(
            (Vocabulary.chinese_translation == 'null') | 
            (Vocabulary.chinese_translation == '') | 
            (Vocabulary.chinese_translation.is_(None))
        ).all()
        
        fixed_chinese = 0
        for word in null_chinese:
            word.chinese_translation = "未知詞彙"
            fixed_chinese += 1
        
        print(f"  - 修復了 {fixed_chinese} 個中文翻譯")
        
        # 3. 修復包含'null'字串的資料
        print("\n3. 修復包含'null'字串的資料:")
        
        words_with_null = Vocabulary.query.filter(
            Vocabulary.word.like('%null%')
        ).all()
        
        fixed_null_strings = 0
        for word in words_with_null:
            if 'null' in word.word.lower():
                word.word = f"word_{word.id}"
                fixed_null_strings += 1
        
        chinese_with_null = Vocabulary.query.filter(
            Vocabulary.chinese_translation.like('%null%')
        ).all()
        
        for word in chinese_with_null:
            if 'null' in word.chinese_translation.lower():
                word.chinese_translation = "未知詞彙"
                fixed_null_strings += 1
        
        print(f"  - 修復了 {fixed_null_strings} 個包含'null'的資料")
        
        # 4. 設置預設的主題和課程名稱
        print("\n4. 設置預設的主題和課程名稱:")
        
        words_without_theme = Vocabulary.query.filter(
            (Vocabulary.theme_name.is_(None)) | 
            (Vocabulary.theme_name == '') |
            (Vocabulary.theme_name == 'null')
        ).all()
        
        fixed_themes = 0
        for word in words_without_theme:
            word.theme_name = "基礎單字"
            fixed_themes += 1
        
        words_without_lesson = Vocabulary.query.filter(
            (Vocabulary.lesson_name.is_(None)) | 
            (Vocabulary.lesson_name == '') |
            (Vocabulary.lesson_name == 'null')
        ).all()
        
        fixed_lessons = 0
        for word in words_without_lesson:
            word.lesson_name = "基礎課程"
            fixed_lessons += 1
        
        print(f"  - 設置了 {fixed_themes} 個主題名稱")
        print(f"  - 設置了 {fixed_lessons} 個課程名稱")
        
        # 5. 提交所有變更
        try:
            db.session.commit()
            print("\n✅ 所有資料品質問題已修復並保存到資料庫")
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ 保存失敗: {e}")
            return False
        
        # 6. 驗證修復結果
        print("\n📊 驗證修復結果:")
        
        total_words = Vocabulary.query.count()
        clean_words = Vocabulary.query.filter(
            Vocabulary.word.isnot(None),
            Vocabulary.word != '',
            Vocabulary.word != 'null',
            ~Vocabulary.word.like('%null%'),
            Vocabulary.chinese_translation.isnot(None),
            Vocabulary.chinese_translation != '',
            Vocabulary.chinese_translation != 'null',
            ~Vocabulary.chinese_translation.like('%null%')
        ).count()
        
        print(f"  - 總單字數: {total_words}")
        print(f"  - 乾淨的單字數: {clean_words}")
        print(f"  - 資料完整性: {(clean_words/total_words*100):.1f}%")
        
        # 7. 檢查是否還有問題
        remaining_issues = total_words - clean_words
        if remaining_issues == 0:
            print("  - ✅ 所有資料品質問題已解決")
        else:
            print(f"  - ⚠️  還有 {remaining_issues} 個資料需要人工檢查")
        
        return True

if __name__ == '__main__':
    fix_data_quality()
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from app import app, db
from models import User, Vocabulary, VocabularyProgress, LessonProgress, QuizAttempt, QuizQuestion
from datetime import datetime
import sys

def comprehensive_test():
    """綜合測試所有功能"""
    with app.app_context():
        print("🧪 開始綜合測試...")
        
        # 1. 資料品質檢查
        print("\n1. 📊 資料品質檢查:")
        
        total_words = Vocabulary.query.count()
        clean_words = Vocabulary.query.filter(
            Vocabulary.word.isnot(None),
            Vocabulary.word != '',
            Vocabulary.word != 'null',
            ~Vocabulary.word.like('%null%'),
            Vocabulary.chinese_translation.isnot(None),
            Vocabulary.chinese_translation != '',
            Vocabulary.chinese_translation != 'null',
            ~Vocabulary.chinese_translation.like('%null%'),
            ~Vocabulary.chinese_translation.like('%未知%')
        ).count()
        
        print(f"  - 總單字數: {total_words}")
        print(f"  - 乾淨的單字數: {clean_words}")
        print(f"  - 資料完整性: {(clean_words/total_words*100):.1f}%")
        
        if clean_words < 10:
            print("  - ❌ 可用單字數量不足，無法進行測驗")
            return False
        else:
            print("  - ✅ 單字數量充足")
        
        # 2. 創建測試用戶
        print("\n2. 👤 創建測試用戶:")
        
        test_user = User.query.filter_by(username='comprehensive_test').first()
        if test_user:
            # 清除舊資料
            VocabularyProgress.query.filter_by(user_id=test_user.id).delete()
            LessonProgress.query.filter_by(user_id=test_user.id).delete()
            QuizAttempt.query.filter_by(user_id=test_user.id).delete()
            db.session.delete(test_user)
            db.session.commit()
        
        test_user = User(username='comprehensive_test', email='comprehensive@test.com')
        test_user.set_password('password')
        db.session.add(test_user)
        db.session.commit()
        print("  - ✅ 測試用戶已創建")
        
        # 3. 選擇測試單字
        print("\n3. 📚 選擇測試單字:")
        
        test_words = Vocabulary.query.filter(
            Vocabulary.word.isnot(None),
            Vocabulary.word != '',
            Vocabulary.word != 'null',
            ~Vocabulary.word.like('%null%'),
            Vocabulary.chinese_translation.isnot(None),
            Vocabulary.chinese_translation != '',
            Vocabulary.chinese_translation != 'null',
            ~Vocabulary.chinese_translation.like('%null%'),
            ~Vocabulary.chinese_translation.like('%未知%')
        ).limit(5).all()
        
        print(f"  - 選擇了 {len(test_words)} 個測試單字:")
        for word in test_words:
            print(f"    * {word.word} -> {word.chinese_translation}")
        
        # 4. 創建學習進度
        print("\n4. 📈 創建學習進度:")
        
        for word in test_words:
            progress = VocabularyProgress(
                user_id=test_user.id,
                word_id=word.id,
                status='learned',
                last_reviewed=datetime.now(),
                review_count=1,
                correct_count=1
            )
            db.session.add(progress)
        
        db.session.commit()
        print("  - ✅ 學習進度已創建")
        
        # 5. 測試選項生成函數
        print("\n5. 🎯 測試選項生成函數:")
        
        test_word = test_words[0]
        
        try:
            from app import generate_english_options, generate_chinese_options
            
            # 測試英文選項
            english_options = generate_english_options(
                test_word, 
                test_word.theme_name or '測試主題', 
                test_word.lesson_name or '測試課程'
            )
            print(f"  - 英文選項: {english_options}")
            
            # 檢查英文選項品質
            if len(english_options) == 4 and test_word.word in english_options:
                print("  - ✅ 英文選項生成正常")
            else:
                print("  - ❌ 英文選項生成異常")
                return False
            
            # 測試中文選項
            chinese_options = generate_chinese_options(
                test_word, 
                test_word.theme_name or '測試主題', 
                test_word.lesson_name or '測試課程'
            )
            print(f"  - 中文選項: {chinese_options}")
            
            # 檢查中文選項品質
            if len(chinese_options) == 4 and test_word.chinese_translation in chinese_options:
                print("  - ✅ 中文選項生成正常")
            else:
                print("  - ❌ 中文選項生成異常")
                return False
                
        except Exception as e:
            print(f"  - ❌ 選項生成函數錯誤: {e}")
            return False
        
        # 6. 模擬測驗流程
        print("\n6. 🎮 模擬測驗流程:")
        
        try:
            # 創建測驗嘗試
            quiz_attempt = QuizAttempt(
                user_id=test_user.id,
                theme_name='測試主題',
                lesson_name='測試課程',
                total_questions=len(test_words),
                started_at=datetime.now()
            )
            db.session.add(quiz_attempt)
            db.session.flush()
            
            print(f"  - ✅ 測驗嘗試已創建 (ID: {quiz_attempt.id})")
            
            # 創建測驗問題
            question_types = ['chinese_to_english', 'english_to_chinese', 'spelling']
            questions_created = 0
            
            for i, word in enumerate(test_words):
                question_type = question_types[i % len(question_types)]
                quiz_question = QuizQuestion(
                    attempt_id=quiz_attempt.id,
                    word_id=word.id,
                    question_type=question_type
                )
                db.session.add(quiz_question)
                questions_created += 1
            
            db.session.commit()
            print(f"  - ✅ 創建了 {questions_created} 個測驗問題")
            
            # 模擬回答問題
            questions = QuizQuestion.query.filter_by(attempt_id=quiz_attempt.id).all()
            correct_answers = 0
            
            for question in questions:
                # 模擬正確答案
                if question.question_type == 'chinese_to_english':
                    question.user_answer = question.word.word
                    question.is_correct = True
                elif question.question_type == 'english_to_chinese':
                    question.user_answer = question.word.chinese_translation
                    question.is_correct = True
                elif question.question_type == 'spelling':
                    question.user_answer = question.word.word.upper()
                    question.is_correct = True
                
                question.answered_at = datetime.now()
                correct_answers += 1
            
            # 完成測驗
            quiz_attempt.correct_answers = correct_answers
            quiz_attempt.is_passed = (correct_answers / len(questions)) >= 0.8
            quiz_attempt.completion_time = 120
            quiz_attempt.completed_at = datetime.now()
            
            db.session.commit()
            
            print(f"  - ✅ 測驗完成:")
            print(f"    * 總題數: {len(questions)}")
            print(f"    * 正確答案: {correct_answers}")
            print(f"    * 正確率: {(correct_answers/len(questions)*100):.1f}%")
            print(f"    * 是否通過: {'✅ 通過' if quiz_attempt.is_passed else '❌ 未通過'}")
            
        except Exception as e:
            print(f"  - ❌ 測驗流程錯誤: {e}")
            return False
        
        # 7. 創建課程進度
        print("\n7. 📋 創建課程進度:")
        
        try:
            lesson_progress = LessonProgress(
                user_id=test_user.id,
                theme_name='測試主題',
                lesson_name='測試課程',
                total_words=len(test_words),
                learned_words=len(test_words),
                is_completed=quiz_attempt.is_passed,
                completion_date=datetime.now() if quiz_attempt.is_passed else None,
                last_studied=datetime.now()
            )
            db.session.add(lesson_progress)
            db.session.commit()
            
            print("  - ✅ 課程進度已創建")
            
        except Exception as e:
            print(f"  - ❌ 課程進度創建錯誤: {e}")
            return False
        
        # 8. 清理測試資料
        print("\n8. 🧹 清理測試資料:")
        
        try:
            VocabularyProgress.query.filter_by(user_id=test_user.id).delete()
            LessonProgress.query.filter_by(user_id=test_user.id).delete()
            QuizQuestion.query.filter_by(attempt_id=quiz_attempt.id).delete()
            QuizAttempt.query.filter_by(id=quiz_attempt.id).delete()
            db.session.delete(test_user)
            db.session.commit()
            
            print("  - ✅ 測試資料已清理")
            
        except Exception as e:
            print(f"  - ⚠️  清理測試資料時出現錯誤: {e}")
        
        print("\n🎉 綜合測試完成！所有功能正常運作。")
        return True

if __name__ == '__main__':
    success = comprehensive_test()
    sys.exit(0 if success else 1)
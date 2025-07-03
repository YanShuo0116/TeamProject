#語音小BUG 再次生成不會覆蓋
from flask import Flask, request, render_template, send_file, jsonify, redirect, url_for, flash, session
from flask_login import LoginManager, current_user, login_required
from pyngrok import ngrok
import traceback
import time
import google.generativeai as genai
from gtts import gTTS
import os
import threading
from flask_cors import CORS
import pandas as pd
from pexelsapi.pexels import Pexels
import random
from datetime import datetime
from auth import auth_bp
from admin import admin_bp
from models import User, VocabularyProgress, LessonProgress, Vocabulary, LearningRecord, QuizAttempt, QuizQuestion, TranslationRecord, Composition

#小小設定一下
lock = threading.Lock()
Us_uk="us"

# 配置API                                                                            #README.MD裡有網址
ngrok.set_auth_token("2ywXahUIQ4BEQlBrwDT4DZ5B7xg_2B3tbiXUwG9YS9oqgcfxm")     # 替換為你的 ngrok 金鑰!!!!!!!!!!!!
genai.configure(api_key='AIzaSyDo3-S0kOSPo9O99cTolLQUv3-x3Ebq3kM')            # 替換為你的 gemini   金鑰!!!!!!!!!  

PEXELS_API_KEY = "6mWeoatNXVXQ6seEFFQwvLmxUms72OENEc1utnp0aCa9g0sqbM2V9ybr" # 替換為你的 Pexels API 金鑰
pexels_api = Pexels(PEXELS_API_KEY)

#選擇模型
model = genai.GenerativeModel('gemini-2.5-flash-lite-preview-06-17')

# 建立 Flask 
app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'your_secret_key'  # 更換為一個安全的密鑰

# 設定資料庫
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///learning_platform.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
from models import db
db.init_app(app)

# 設定 Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# 註冊藍圖
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)

# 錯誤處理
@app.errorhandler(403)
def forbidden(error):
    return render_template('unauthorized.html'), 403

# 作文相關的輔助函數

def get_image_from_pexels(query):
    try:
        search_results = pexels_api.search_photos(query=query, per_page=1)
        if search_results and search_results.get('photos'):
            image_url = search_results['photos'][0]['src']['medium']
            return image_url
        else:
            print(f"No image found for '{query}' on Pexels.")
            return "https://via.placeholder.com/300?text=" + query.replace(" ", "+")
    except Exception as e:
        print(f"Error fetching image from Pexels for '{query}': {e}")
        return "https://via.placeholder.com/300?text=" + query.replace(" ", "+")

@app.route("/word_cards_all")
def word_cards_all():
    df = pd.read_csv('國小英文教材/基礎1200單字/國小1200基礎單字每日學習表.csv')
    
    word_data_structured = []
    current_theme = ""
    
    for index, row in df.iterrows():
        theme_group = str(row['主題分組'])
        
        if theme_group.startswith('主題'):
            current_theme = theme_group.split('：')[0]
            word_data_structured.append({
                'type': 'theme',
                'name': current_theme,
                'days': []
            })
        
        if '：' in theme_group:
            day_name = theme_group.split('：')[-1]
            flashcards = []
            for i in range(1, 8):
                english_col = f'英文{i}'
                chinese_col = f'中文{i}'
                
                if english_col in row and pd.notna(row[english_col]):
                    english_word = row[english_col]
                    chinese_word = row[chinese_col] if chinese_col in row and pd.notna(row[chinese_col]) else ''
                    
                    image_url = get_image_from_pexels(english_word)
                    
                    flashcards.append({
                        'english': english_word,
                        'chinese': chinese_word,
                        'image': image_url
                    })
            
            if word_data_structured and word_data_structured[-1]['type'] == 'theme':
                word_data_structured[-1]['days'].append({
                    'name': day_name,
                    'flashcards': flashcards
                })

    return render_template('word_cards_all.html', word_data=word_data_structured)
def translate_word(word):
    try:
        # 1. 翻譯
        translation_prompt = f"""請按照以下格式提供單字 '{word}' 的翻譯和同義詞以下為你輸出範例,無需輸出＊符號：
Limit

1. 限制 (n./v.)  The maximum amount allowed.  (限制的數量或程度)

2. 邊界 (n.)  The furthest extent or point. (邊緣，界限)

3. 極限 (n.) The point beyond which something cannot continue or operate. (無法超越的點)

同義詞: Restriction, Constraint, Boundary"""
        translation_response = model.generate_content(translation_prompt).text

        # 2. 相關詞語
        explanation_prompt = f"請列出與單字 '{word}' 相關的詞語，包含變形或派生詞(2~5個)請嚴格按照以下格式輸出，格式如下：\nUnnerve\n- Unnerving\n- Unnervingly"
        explanation_response = model.generate_content(explanation_prompt).text

        # 3. 例句
        example_prompt = f"""請提供 2 個使用單字 '{word}' 的簡短例句，並附上繁體中文翻譯。請嚴格按照以下格式輸出，無需輸出＊符號：

例句1的英文句子
翻譯: 例句1的中文翻譯

例句2的英文句子  
翻譯: 例句2的中文翻譯

範例格式：
The speed limit on this road is 50 km/h.
翻譯: 這條道路的限速是每小時50公里。

We need to limit the number of participants in the event.
翻譯: 我們需要限制活動的參加人數。
"""
        example_response = model.generate_content(example_prompt).text

        return translation_response, explanation_response, example_response
    except Exception:
        print(f"Error processing word '{word}': {traceback.format_exc()}")
        return "翻譯失敗", "相關詞語生成失敗", "例句生成失敗"



def generate_audio_file(content, filename_prefix):
    if not content.strip():  # 檢查文本空白
        print(f"警告：文本為空，無法生成音頻：{filename_prefix}")
        return None
    print(f"Generating audio for: {content}") # Debug print
    tts = gTTS(text=content, lang='en' , tld='com' )
    # Create a unique filename based on content hash or just the content itself
    # For simplicity, let's use a sanitized version of the content for the filename
    sanitized_content = "".join(c for c in content if c.isalnum() or c in (' ', '.', '_')).strip()
    filename = f"{filename_prefix}_{sanitized_content}.mp3"
    filepath = os.path.join('audio_files', filename)
    tts.save(filepath)
    return filepath

@app.route("/play-word-audio", methods=["GET"])
def play_word_audio():
    word = request.args.get("word")
    if word:
        audio_filepath = generate_audio_file(word, "word")
        if audio_filepath and os.path.exists(audio_filepath):
            return send_file(audio_filepath)
    return "音檔不存在", 404
def anser_Q(prompt_Q):
    try:
        # 生成回答
        answerQ_prompt = f"""你是專業英文老師，請使用反體中文夾雜英文簡短回答 '{prompt_Q}' 的這個問題 (你不能輸出＊字符號)。如果問題與英文不相關則輸出「請提出英文相關問題」。
        以下為範例:
        輸入:
        有用到Arriving的片語嗎？
        你輸出:
        Q:有用到Arriving的片語嗎？
        A:Arriving at是一個常見的片語，通常用來表示到達某個地點或目的地。例如："I'm arriving at the airport at 3 PM."
        """
        answerQ_response = model.generate_content(answerQ_prompt).text
        return answerQ_response
    except Exception:
        print(f"Error processing question '{prompt_Q}': {traceback.format_exc()}")
        return "抱歉，回答失敗，請稍後再試"

@app.route('/', methods=["GET", "POST"])
def index():

    return render_template('index.html')




@app.route('/new_we', methods=["GET", "POST"])
def we():

    return render_template('new_we.html')

@app.route("/update-accent", methods=["GET"])
def update_accent():
    global Us_uk
    accent = request.args.get('accent')
    if accent in ['us', 'co.uk']:
        Us_uk = accent  # 更新口音
        return jsonify({"status": "success", "accent": Us_uk}), 200
    return jsonify({"status": "error", "message": "Invalid accent"}), 400



@app.route("/translator", methods=["GET"])
def translator():
    return render_template('translator.html')

# 翻譯相關 API
@app.route("/api/translate", methods=["POST"])
def api_translate():
    import uuid
    
    data = request.get_json()
    word = data.get('word', '').strip()
    
    if not word:
        return jsonify({'error': 'Word is required'}), 400
    
    # 生成唯一的session_id
    session_id = str(uuid.uuid4())
    
    # 創建翻譯記錄
    translation_record = TranslationRecord(
        session_id=session_id,
        user_id=current_user.id if current_user.is_authenticated else None,
        word=word,
        status='processing'
    )
    db.session.add(translation_record)
    db.session.commit()
    
    # 啟動背景翻譯任務
    import threading
    thread = threading.Thread(target=process_translation, args=(translation_record.id,))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'session_id': session_id,
        'status': 'processing',
        'message': '翻譯處理中，請稍候...'
    })

@app.route("/api/translation_status/<session_id>", methods=["GET"])
def get_translation_status(session_id):
    translation_record = TranslationRecord.query.filter_by(session_id=session_id).first()
    
    if not translation_record:
        return jsonify({'error': 'Translation not found'}), 404
    
    response_data = {
        'session_id': session_id,
        'word': translation_record.word,
        'status': translation_record.status,
        'created_at': translation_record.created_at.isoformat()
    }
    
    if translation_record.status == 'completed':
        response_data.update({
            'translation': translation_record.translation,
            'explanation': translation_record.explanation,
            'examples': translation_record.examples,
            'completed_at': translation_record.completed_at.isoformat()
        })
    elif translation_record.status == 'failed':
        response_data['error_message'] = '翻譯失敗，請稍後再試'
    
    return jsonify(response_data)

def process_translation(record_id):
    """背景處理翻譯的函數"""
    with app.app_context():  # 添加應用上下文
        try:
            # 使用 session.get 替代 query.get
            translation_record = db.session.get(TranslationRecord, record_id)
            if not translation_record:
                print(f"Translation record {record_id} not found")
                return
            
            print(f"Processing translation for word: {translation_record.word}")
            
            # 執行翻譯
            translation, explanation, examples = translate_word(translation_record.word)
            
            print(f"Translation completed for word: {translation_record.word}")
            
            # 更新記錄
            translation_record.translation = translation
            translation_record.explanation = explanation
            translation_record.examples = examples
            translation_record.status = 'completed'
            translation_record.completed_at = datetime.now()
            
            db.session.commit()
            print(f"Translation record {record_id} updated successfully")
            
        except Exception as e:
            print(f"Translation processing error: {e}")
            print(f"Error traceback: {traceback.format_exc()}")
            try:
                # 使用 session.get 替代 query.get
                translation_record = db.session.get(TranslationRecord, record_id)
                if translation_record:
                    translation_record.status = 'failed'
                    translation_record.completed_at = datetime.now()
                    db.session.commit()
                    print(f"Translation record {record_id} marked as failed")
            except Exception as commit_error:
                print(f"Failed to update error status: {commit_error}")
                db.session.rollback()

# 清理舊翻譯記錄的API（管理員使用）
@app.route("/api/cleanup_translations", methods=["POST"])
def cleanup_translations():
    if not current_user.is_authenticated or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        # 刪除7天前的翻譯記錄
        from datetime import timedelta
        cutoff_date = datetime.now() - timedelta(days=7)
        
        deleted_count = TranslationRecord.query.filter(
            TranslationRecord.created_at < cutoff_date
        ).delete()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'deleted_count': deleted_count,
            'message': f'已清理 {deleted_count} 筆舊翻譯記錄'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'清理失敗: {str(e)}'}), 500

# 自動清理函數（可以設定定時執行）
def auto_cleanup_translations():
    """自動清理超過24小時的翻譯記錄"""
    with app.app_context():  # 添加應用上下文
        try:
            from datetime import timedelta
            cutoff_date = datetime.now() - timedelta(hours=24)
            
            deleted_count = TranslationRecord.query.filter(
                TranslationRecord.created_at < cutoff_date
            ).delete()
            
            db.session.commit()
            print(f"Auto cleanup: deleted {deleted_count} translation records")
            
        except Exception as e:
            print(f"Auto cleanup error: {e}")
            db.session.rollback()

@app.route("/ai-teacher", methods=["GET", "POST"])
def ai_teacher():
    teacher_answer = None
    if request.method == "POST":
        prompt_Q = request.form.get("prompt_Q", "").strip()
        if prompt_Q:
            teacher_answer = anser_Q(prompt_Q)
    return render_template('teach.html', teacher_answer=teacher_answer)

@app.route("/api/themes_and_lessons", methods=["GET"])
def get_themes_and_lessons():
    df = pd.read_csv('國小英文教材/基礎1200單字/國小1200基礎單字每日學習表.csv')
    
    themes_data = []
    current_theme = None

    for index, row in df.iterrows():
        theme_group = str(row['主題分組']).strip()
        
        if theme_group.startswith('主題'):
            if current_theme:
                themes_data.append(current_theme)
            current_theme = {
                'theme_name': theme_group.split('：')[1] if '：' in theme_group else theme_group,
                'lessons': []
            }
        elif current_theme and theme_group and not theme_group.startswith('中文'): # 確保不是單字行
            current_theme['lessons'].append(theme_group)
    
    if current_theme:
        themes_data.append(current_theme)

    return jsonify(themes_data)

@app.route("/elementary_english", methods=["GET"])
def elementary_english():
    return redirect(url_for('vocabulary_learning', category='1200'))

@app.route("/vocabulary_learning/<category>", methods=["GET"])
def vocabulary_learning(category):
    # 這裡可以根據 category 參數來決定載入哪種單字集
    # 目前只處理 '1200'，未來可以擴展
    return render_template('vocabulary_learning.html', category=category)

@app.route("/api/words/<category>", methods=["GET"])
def get_words_by_category(category):
    df = pd.read_csv('國小英文教材/基礎1200單字/國小1200基礎單字每日學習表.csv')

    theme_filter = request.args.get('theme') # e.g., "人物"
    lesson_filter = request.args.get('lesson') # e.g., "人物1"

    word_data_list = []

    for index, row in df.iterrows():
        theme_group = str(row['主題分組']).strip()

        # Skip theme header rows (e.g., "主題一：人物")
        if theme_group.startswith('主題'):
            continue

        # Apply theme filter if provided
        if theme_filter:
            # Check if the current lesson (e.g., "人物1") belongs to the selected theme (e.g., "人物")
            # This assumes lesson names start with the theme name.
            if not theme_group.startswith(theme_filter):
                continue

        # Apply lesson filter if provided
        if lesson_filter:
            # Check if the current lesson exactly matches the selected lesson
            if theme_group != lesson_filter:
                continue

        # Process the words in this row (which is a lesson row)
        # 根據CSV格式：中文1,英文2,中文2,英文3,中文3,英文4,中文4,英文5,中文5,英文6,中文6,英文7
        # 注意：列名有誤導性，實際上 中文X 列包含英文單字，英文X 列包含中文翻譯
        for i in range(1, 7): # Iterate through 6 word pairs
            english_col_name = f'中文{i}' # 實際上包含英文單字
            chinese_col_name = f'英文{i+1}' # 實際上包含中文翻譯

            if english_col_name in row and pd.notna(row[english_col_name]) and chinese_col_name in row and pd.notna(row[chinese_col_name]):
                english_word = str(row[english_col_name]).strip()
                chinese_word = str(row[chinese_col_name]).strip()

                if english_word and chinese_word:
                    image_url = get_image_from_pexels(english_word)
                    
                    # 檢查用戶學習進度
                    progress_status = 'not_learned'
                    if current_user.is_authenticated:
                        vocab = Vocabulary.query.filter_by(word=english_word).first()
                        if vocab:
                            progress = VocabularyProgress.query.filter_by(
                                user_id=current_user.id, 
                                word_id=vocab.id
                            ).first()
                            if progress:
                                progress_status = progress.status
                    
                    word_data_list.append({
                        'english': english_word,
                        'chinese': chinese_word,
                        'image': image_url,
                        'progress_status': progress_status
                    })

    random.shuffle(word_data_list)
    return jsonify(word_data_list)

# 學習進度追蹤 API
@app.route("/api/update_word_progress", methods=["POST"])
def update_word_progress():
    if not current_user.is_authenticated:
        return jsonify({
            'error': 'User not authenticated',
            'message': '請登入帳號以保存學習進度',
            'redirect': '/login'
        }), 401
    
    data = request.get_json()
    word = data.get('word')
    status = data.get('status', 'learned')
    theme = data.get('theme')
    lesson = data.get('lesson')
    
    if not word:
        return jsonify({'error': 'Word is required'}), 400
    
    # 查找或創建單字記錄
    vocab = Vocabulary.query.filter_by(word=word).first()
    if not vocab:
        vocab = Vocabulary(
            word=word,
            theme_name=theme,
            lesson_name=lesson
        )
        db.session.add(vocab)
        db.session.flush()  # 獲取 ID
    
    # 更新或創建學習進度
    progress = VocabularyProgress.query.filter_by(
        user_id=current_user.id,
        word_id=vocab.id
    ).first()
    
    if not progress:
        progress = VocabularyProgress(
            user_id=current_user.id,
            word_id=vocab.id,
            status=status,
            last_reviewed=datetime.now(),
            review_count=1
        )
        db.session.add(progress)
    else:
        progress.status = status
        progress.last_reviewed = datetime.now()
        progress.review_count += 1
        if status == 'learned':
            progress.correct_count += 1
    
    # 更新課程進度
    if theme and lesson:
        lesson_progress = LessonProgress.query.filter_by(
            user_id=current_user.id,
            theme_name=theme,
            lesson_name=lesson
        ).first()
        
        if not lesson_progress:
            # 計算該課程總單字數
            total_words = get_lesson_word_count(theme, lesson)
            lesson_progress = LessonProgress(
                user_id=current_user.id,
                theme_name=theme,
                lesson_name=lesson,
                total_words=total_words,
                learned_words=0,
                last_studied=datetime.now()
            )
            db.session.add(lesson_progress)
        
        # 計算已學習的單字數
        learned_count = VocabularyProgress.query.join(Vocabulary).filter(
            VocabularyProgress.user_id == current_user.id,
            VocabularyProgress.status == 'learned',
            Vocabulary.theme_name == theme,
            Vocabulary.lesson_name == lesson
        ).count()
        
        lesson_progress.learned_words = learned_count
        lesson_progress.last_studied = datetime.now()
        
        # 檢查是否完成課程 (需要學習所有單字並通過測驗)
        # 只有通過測驗才能標記為完成，這裡不自動標記為完成
        # lesson_progress.is_completed 只能通過測驗API來設置
    
    # 記錄學習活動
    learning_record = LearningRecord(
        user_id=current_user.id,
        activity_type='vocabulary',
        content=f'學習單字: {word} ({status})'
    )
    db.session.add(learning_record)
    
    db.session.commit()
    
    return jsonify({'success': True, 'status': status})

def get_lesson_word_count(theme, lesson):
    """計算特定課程的單字總數"""
    df = pd.read_csv('國小英文教材/基礎1200單字/國小1200基礎單字每日學習表.csv')
    count = 0
    
    for index, row in df.iterrows():
        theme_group = str(row['主題分組']).strip()
        
        if theme_group == lesson:
            for i in range(1, 7):
                english_col_name = f'中文{i}'  # 實際上包含英文單字
                chinese_col_name = f'英文{i+1}'  # 實際上包含中文翻譯
                if (english_col_name in row and pd.notna(row[english_col_name]) and 
                    chinese_col_name in row and pd.notna(row[chinese_col_name])):
                    count += 1
    
    return count

@app.route("/api/lesson_progress", methods=["GET"])
def get_lesson_progress():
    if not current_user.is_authenticated:
        return jsonify({
            'error': 'User not authenticated',
            'message': '請登入帳號以查看學習進度',
            'redirect': '/login'
        }), 401
    
    theme = request.args.get('theme')
    lesson = request.args.get('lesson')
    
    if theme and lesson:
        # 獲取特定課程進度
        progress = LessonProgress.query.filter_by(
            user_id=current_user.id,
            theme_name=theme,
            lesson_name=lesson
        ).first()
        
        if progress:
            return jsonify({
                'total_words': progress.total_words,
                'learned_words': progress.learned_words,
                'is_completed': progress.is_completed,
                'completion_date': progress.completion_date.isoformat() if progress.completion_date else None,
                'progress_percentage': (progress.learned_words / progress.total_words * 100) if progress.total_words > 0 else 0
            })
        else:
            total_words = get_lesson_word_count(theme, lesson)
            return jsonify({
                'total_words': total_words,
                'learned_words': 0,
                'is_completed': False,
                'completion_date': None,
                'progress_percentage': 0
            })
    else:
        # 獲取所有課程進度
        all_progress = LessonProgress.query.filter_by(user_id=current_user.id).all()
        progress_data = {}
        
        for progress in all_progress:
            key = f"{progress.theme_name}_{progress.lesson_name}"
            progress_data[key] = {
                'total_words': progress.total_words,
                'learned_words': progress.learned_words,
                'is_completed': progress.is_completed,
                'completion_date': progress.completion_date.isoformat() if progress.completion_date else None,
                'progress_percentage': (progress.learned_words / progress.total_words * 100) if progress.total_words > 0 else 0
            }
        
        return jsonify(progress_data)

@app.route("/api/quiz_status", methods=["GET"])
def get_quiz_status():
    if not current_user.is_authenticated:
        return jsonify({
            'error': 'User not authenticated',
            'message': '請登入帳號以查看測驗狀態',
            'redirect': '/login'
        }), 401
    
    theme = request.args.get('theme')
    lesson = request.args.get('lesson')
    
    if not theme or not lesson:
        return jsonify({'error': 'Theme and lesson are required'}), 400
    
    # 檢查是否有進行中的測驗
    in_progress_quiz = QuizAttempt.query.filter_by(
        user_id=current_user.id,
        theme_name=theme,
        lesson_name=lesson,
        status='in_progress'
    ).first()
    
    # 檢查是否有已完成且通過的測驗
    passed_quiz = QuizAttempt.query.filter_by(
        user_id=current_user.id,
        theme_name=theme,
        lesson_name=lesson,
        status='completed',
        is_passed=True
    ).first()
    
    quiz_status = {
        'has_passed': passed_quiz is not None,
        # 移除了進行中測驗的相關字段，因為不再支持繼續測驗
        # 'has_in_progress': in_progress_quiz is not None,
        # 'in_progress_quiz_id': in_progress_quiz.id if in_progress_quiz else None,
        # 'can_start_quiz': in_progress_quiz is None
    }
    
    return jsonify(quiz_status)

# 測驗相關 API
@app.route("/api/start_quiz", methods=["POST"])
def start_quiz():
    if not current_user.is_authenticated:
        return jsonify({
            'error': 'User not authenticated',
            'message': '測驗前請登入帳號以保存紀錄',
            'redirect': '/login'
        }), 401
    
    data = request.get_json()
    theme = data.get('theme')
    lesson = data.get('lesson')
    
    if not theme or not lesson:
        return jsonify({'error': 'Theme and lesson are required'}), 400
    
    # 檢查是否有未完成的測驗，直接標記為放棄
    existing_quizzes = QuizAttempt.query.filter_by(
        user_id=current_user.id,
        theme_name=theme,
        lesson_name=lesson,
        status='in_progress'
    ).all()
    
    # 將所有進行中的測驗標記為放棄
    for existing_quiz in existing_quizzes:
        existing_quiz.status = 'abandoned'
        existing_quiz.completed_at = datetime.now()
    
    # 獲取該課程的所有已學習單字（排除有問題的資料）
    learned_words = db.session.query(Vocabulary).join(VocabularyProgress).filter(
        VocabularyProgress.user_id == current_user.id,
        VocabularyProgress.status == 'learned',
        Vocabulary.theme_name == theme,
        Vocabulary.lesson_name == lesson,
        Vocabulary.word.isnot(None),
        Vocabulary.word != '',
        Vocabulary.word != 'null',
        ~Vocabulary.word.like('%null%'),
        Vocabulary.chinese_translation.isnot(None),
        Vocabulary.chinese_translation != '',
        Vocabulary.chinese_translation != 'null',
        ~Vocabulary.chinese_translation.like('%null%'),
        ~Vocabulary.chinese_translation.like('%未知%')
    ).all()
    
    if len(learned_words) == 0:
        return jsonify({'error': 'No learned words found for this lesson'}), 400
    
    # 創建測驗嘗試記錄
    quiz_attempt = QuizAttempt(
        user_id=current_user.id,
        theme_name=theme,
        lesson_name=lesson,
        total_questions=len(learned_words),
        status='in_progress',
        started_at=datetime.now()
    )
    db.session.add(quiz_attempt)
    db.session.flush()  # 獲取 ID
    
    # 為每個單字創建隨機題型的問題
    question_types = ['chinese_to_english', 'english_to_chinese', 'spelling']
    
    for word in learned_words:
        question_type = random.choice(question_types)
        quiz_question = QuizQuestion(
            attempt_id=quiz_attempt.id,
            word_id=word.id,
            question_type=question_type
        )
        db.session.add(quiz_question)
    
    db.session.commit()
    
    return jsonify({
        'quiz_id': quiz_attempt.id,
        'total_questions': len(learned_words),
        'message': 'Quiz started successfully'
    })

@app.route("/api/get_quiz_question/<int:quiz_id>/<int:question_index>", methods=["GET"])
def get_quiz_question(quiz_id, question_index):
    if not current_user.is_authenticated:
        return jsonify({
            'error': 'User not authenticated',
            'message': '請登入帳號以繼續測驗',
            'redirect': '/login'
        }), 401
    
    # 獲取測驗嘗試
    quiz_attempt = QuizAttempt.query.filter_by(
        id=quiz_id,
        user_id=current_user.id
    ).first()
    
    if not quiz_attempt:
        return jsonify({'error': 'Quiz not found'}), 404
    
    # 獲取問題
    questions = QuizQuestion.query.filter_by(attempt_id=quiz_id).all()
    
    if question_index >= len(questions):
        return jsonify({'error': 'Question index out of range'}), 400
    
    current_question = questions[question_index]
    word = current_question.word
    
    # 根據題型生成問題內容
    question_data = {
        'question_id': current_question.id,
        'question_index': question_index,
        'total_questions': len(questions),
        'question_type': current_question.question_type,
        'word_id': word.id
    }
    
    if current_question.question_type == 'chinese_to_english':
        # 中文選英文
        question_data.update({
            'question_text': word.chinese_translation,
            'image_url': get_image_from_pexels(word.word),
            'options': generate_english_options(word, quiz_attempt.theme_name, quiz_attempt.lesson_name),
            'correct_answer': word.word
        })
    
    elif current_question.question_type == 'english_to_chinese':
        # 英文選中文
        question_data.update({
            'question_text': word.word,
            'image_url': get_image_from_pexels(word.word),
            'options': generate_chinese_options(word, quiz_attempt.theme_name, quiz_attempt.lesson_name),
            'correct_answer': word.chinese_translation
        })
    
    elif current_question.question_type == 'spelling':
        # 拼字題
        question_data.update({
            'question_text': word.chinese_translation,
            'scrambled_letters': list(word.word.upper()),
            'correct_answer': word.word.upper()
        })
        random.shuffle(question_data['scrambled_letters'])
    
    return jsonify(question_data)

def generate_english_options(correct_word, theme_name, lesson_name):
    """生成英文選項（包含正確答案和3個干擾項）"""
    # 確保正確答案不為空
    if not correct_word.word or correct_word.word.strip() == '' or correct_word.word.lower() == 'null':
        return ['error', 'loading', 'failed', 'retry']
    
    # 獲取同課程的其他單字作為干擾項（排除空值和null值）
    other_words = Vocabulary.query.filter(
        Vocabulary.theme_name == theme_name,
        Vocabulary.lesson_name == lesson_name,
        Vocabulary.id != correct_word.id,
        Vocabulary.word.isnot(None),
        Vocabulary.word != '',
        Vocabulary.word != 'null',
        ~Vocabulary.word.like('%null%')  # 排除包含null的字串
    ).limit(15).all()
    
    options = [correct_word.word]
    
    # 添加3個干擾項
    for word in other_words:
        if len(options) >= 4:
            break
        if (word.word and 
            word.word.strip() != '' and 
            word.word.lower() != 'null' and
            'null' not in word.word.lower() and
            word.word not in options):
            options.append(word.word)
    
    # 如果不夠3個干擾項，從其他課程補充
    if len(options) < 4:
        additional_words = Vocabulary.query.filter(
            Vocabulary.id != correct_word.id,
            Vocabulary.word.isnot(None),
            Vocabulary.word != '',
            Vocabulary.word != 'null',
            ~Vocabulary.word.like('%null%')
        ).limit(30).all()
        
        for word in additional_words:
            if len(options) >= 4:
                break
            if (word.word and 
                word.word.strip() != '' and 
                word.word.lower() != 'null' and
                'null' not in word.word.lower() and
                word.word not in options):
                options.append(word.word)
    
    # 如果還是不夠4個選項，添加預設選項
    default_options = ['apple', 'book', 'cat', 'dog', 'egg', 'fish', 'water', 'house', 'tree', 'sun']
    for default_option in default_options:
        if len(options) >= 4:
            break
        if default_option not in options:
            options.append(default_option)
    
    # 確保至少有4個選項
    while len(options) < 4:
        options.append(f"option_{len(options)}")
    
    random.shuffle(options)
    return options[:4]  # 確保只返回4個選項

def generate_chinese_options(correct_word, theme_name, lesson_name):
    """生成中文選項（包含正確答案和3個干擾項）"""
    # 確保正確答案不為空
    if (not correct_word.chinese_translation or 
        correct_word.chinese_translation.strip() == '' or 
        correct_word.chinese_translation.lower() == 'null' or
        '未知' in correct_word.chinese_translation):
        return ['選項載入錯誤', '請重新載入', '資料異常', '系統錯誤']
    
    # 獲取同課程的其他單字作為干擾項（排除中文翻譯為空的）
    other_words = Vocabulary.query.filter(
        Vocabulary.theme_name == theme_name,
        Vocabulary.lesson_name == lesson_name,
        Vocabulary.id != correct_word.id,
        Vocabulary.chinese_translation.isnot(None),
        Vocabulary.chinese_translation != '',
        Vocabulary.chinese_translation != 'null',
        ~Vocabulary.chinese_translation.like('%null%'),
        ~Vocabulary.chinese_translation.like('%未知%')
    ).limit(15).all()
    
    options = [correct_word.chinese_translation]
    
    # 添加3個干擾項
    for word in other_words:
        if len(options) >= 4:
            break
        if (word.chinese_translation and 
            word.chinese_translation.strip() != '' and 
            word.chinese_translation.lower() != 'null' and
            'null' not in word.chinese_translation.lower() and
            '未知' not in word.chinese_translation and
            word.chinese_translation not in options):
            options.append(word.chinese_translation)
    
    # 如果不夠3個干擾項，從其他課程補充
    if len(options) < 4:
        additional_words = Vocabulary.query.filter(
            Vocabulary.id != correct_word.id,
            Vocabulary.chinese_translation.isnot(None),
            Vocabulary.chinese_translation != '',
            Vocabulary.chinese_translation != 'null',
            ~Vocabulary.chinese_translation.like('%null%'),
            ~Vocabulary.chinese_translation.like('%未知%')
        ).limit(30).all()
        
        for word in additional_words:
            if len(options) >= 4:
                break
            if (word.chinese_translation and 
                word.chinese_translation.strip() != '' and 
                word.chinese_translation.lower() != 'null' and
                'null' not in word.chinese_translation.lower() and
                '未知' not in word.chinese_translation and
                word.chinese_translation not in options):
                options.append(word.chinese_translation)
    
    # 如果還是不夠4個選項，添加預設選項
    default_options = ['人物', '動物', '物品', '動作', '形容詞', '名詞', '顏色', '食物', '家庭', '學校']
    for default_option in default_options:
        if len(options) >= 4:
            break
        if default_option not in options:
            options.append(default_option)
    
    # 確保至少有4個選項
    while len(options) < 4:
        options.append(f"選項{len(options)}")
    
    random.shuffle(options)
    return options[:4]  # 確保只返回4個選項

@app.route("/api/submit_quiz_answer", methods=["POST"])
def submit_quiz_answer():
    if not current_user.is_authenticated:
        return jsonify({
            'error': 'User not authenticated',
            'message': '請登入帳號以提交答案',
            'redirect': '/login'
        }), 401
    
    data = request.get_json()
    question_id = data.get('question_id')
    user_answer = data.get('answer')
    
    if not question_id or user_answer is None:
        return jsonify({'error': 'Question ID and answer are required'}), 400
    
    # 獲取問題
    question = QuizQuestion.query.get(question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    # 檢查答案是否正確
    word = question.word
    is_correct = False
    
    if question.question_type == 'chinese_to_english':
        is_correct = user_answer.lower().strip() == word.word.lower().strip()
    elif question.question_type == 'english_to_chinese':
        is_correct = user_answer.strip() == word.chinese_translation.strip()
    elif question.question_type == 'spelling':
        is_correct = user_answer.upper().strip() == word.word.upper().strip()
    
    # 更新問題記錄
    question.user_answer = user_answer
    question.is_correct = is_correct
    question.answered_at = datetime.now()
    
    db.session.commit()
    
    # 根據題型返回正確的答案格式
    if question.question_type == 'chinese_to_english':
        correct_answer = word.word
    elif question.question_type == 'english_to_chinese':
        correct_answer = word.chinese_translation
    elif question.question_type == 'spelling':
        correct_answer = word.word.upper()  # 拼字題顯示大寫英文單字
    else:
        correct_answer = word.word
    
    return jsonify({
        'is_correct': is_correct,
        'correct_answer': correct_answer
    })

@app.route("/api/complete_quiz/<int:quiz_id>", methods=["POST"])
def complete_quiz(quiz_id):
    if not current_user.is_authenticated:
        return jsonify({
            'error': 'User not authenticated',
            'message': '請登入帳號以完成測驗',
            'redirect': '/login'
        }), 401
    
    # 獲取測驗嘗試
    quiz_attempt = QuizAttempt.query.filter_by(
        id=quiz_id,
        user_id=current_user.id
    ).first()
    
    if not quiz_attempt:
        return jsonify({'error': 'Quiz not found'}), 404
    
    # 檢查測驗狀態
    if quiz_attempt.status != 'in_progress':
        return jsonify({'error': 'Quiz is not in progress'}), 400
    
    # 計算正確答案數
    correct_answers = QuizQuestion.query.filter_by(
        attempt_id=quiz_id,
        is_correct=True
    ).count()
    
    total_questions = QuizQuestion.query.filter_by(attempt_id=quiz_id).count()
    
    # 計算完成時間
    completion_time = int((datetime.now() - quiz_attempt.started_at).total_seconds())
    
    # 判斷是否通過（80%正確率）
    pass_threshold = 0.8
    is_passed = (correct_answers / total_questions) >= pass_threshold
    
    # 更新測驗記錄
    quiz_attempt.correct_answers = correct_answers
    quiz_attempt.is_passed = is_passed
    quiz_attempt.completion_time = completion_time
    quiz_attempt.status = 'completed'
    quiz_attempt.completed_at = datetime.now()
    
    # 只有通過測驗才更新課程進度為完成
    if is_passed:
        lesson_progress = LessonProgress.query.filter_by(
            user_id=current_user.id,
            theme_name=quiz_attempt.theme_name,
            lesson_name=quiz_attempt.lesson_name
        ).first()
        
        if lesson_progress:
            lesson_progress.is_completed = True
            lesson_progress.completion_date = datetime.now()
    else:
        # 如果測驗未通過，確保課程進度不被標記為完成
        lesson_progress = LessonProgress.query.filter_by(
            user_id=current_user.id,
            theme_name=quiz_attempt.theme_name,
            lesson_name=quiz_attempt.lesson_name
        ).first()
        
        if lesson_progress:
            lesson_progress.is_completed = False
            lesson_progress.completion_date = None
    
    db.session.commit()
    
    return jsonify({
        'is_passed': is_passed,
        'correct_answers': correct_answers,
        'total_questions': total_questions,
        'score_percentage': round((correct_answers / total_questions) * 100, 1),
        'completion_time': completion_time,
        'pass_threshold': int(pass_threshold * 100)
    })

# 確保音檔目錄
os.makedirs('audio_files', exist_ok=True)
#作文區
# 預設作文題目
ESSAY_TOPICS = {
    'school': [
        'My School Life', 'My Favorite Subject', 'My Best Teacher', 'School Activities I Enjoy',
        'My Classroom', 'A Typical School Day', 'My Study Habits', 'School Friends',
        'My Favorite School Memory', 'Learning English at School', 'School Lunch Time',
        'My Dream School', 'Homework and Me', 'School Sports Day', 'My School Library',
        'Group Projects at School', 'School Rules', 'My First Day at School', 'School Uniform',
        'After School Activities'
    ],
    'life': [
        'My Daily Routine', 'A Special Day', 'My Weekend', 'My Hobby', 'My Favorite Food',
        'A Memorable Trip', 'My Birthday Party', 'My Summer Vacation', 'My Family Tradition',
        'A Day I Will Never Forget', 'My Favorite Holiday', 'My Morning Routine', 'My Free Time',
        'A Fun Experience', 'My Favorite Place', 'My Best Friend', 'A Happy Memory',
        'My Favorite Season', 'A Rainy Day', 'My Dream Vacation'
    ],
    'growth': [
        'My Growth This Year', 'What I Learned', 'My Goals for the Future', 'A Challenge I Overcame',
        'How I Changed', 'My Dreams and Aspirations', 'A Lesson I Learned', 'My Personal Achievement',
        'What Makes Me Proud', 'My Strengths and Weaknesses', 'A Mistake I Made', 'My Role Model',
        'How I Handle Problems', 'My Future Plans', 'What Success Means to Me', 'My Personal Values',
        'A Time I Helped Someone', 'My Biggest Fear', 'What Motivates Me', 'My Life Philosophy'
    ],
    'social': [
        'Helping Others', 'Environmental Protection', 'Technology in Our Lives', 'The Importance of Friendship',
        'Social Media and Me', 'Community Service', 'Cultural Differences', 'The Value of Honesty',
        'Teamwork', 'Respect for Others', 'The Importance of Family', 'Kindness Matters',
        'Being a Good Citizen', 'The Power of Communication', 'Dealing with Bullying',
        'The Importance of Education', 'Healthy Lifestyle', 'Time Management', 'Being Responsible',
        'The Impact of Music'
    ]
}

def generate_essay_topic(topic):
    """從預設題目中隨機選擇，不使用AI生成"""
    import random
    try:
        if topic in ESSAY_TOPICS:
            return random.choice(ESSAY_TOPICS[topic])
        else:
            # 如果類別不存在，從所有題目中隨機選擇
            all_topics = []
            for topic_list in ESSAY_TOPICS.values():
                all_topics.extend(topic_list)
            return random.choice(all_topics)
    except Exception:
        print(f"Error selecting essay topic for '{topic}': {traceback.format_exc()}")
        return "My Daily Life"
def generate_simple_paragraph_theme(essay_topic):
    """生成簡化的段落主題，不使用AI"""
    return f"""第一段（引言）: 介紹主題「{essay_topic}」並表達你的觀點
第二段（內文一）: 描述第一個重要的想法或經驗
第三段（內文二）: 分享第二個重要的想法或經驗
第四段（內文三）: 說明第三個重要的想法或感受
第五段（結論）: 總結你的想法並重申你的觀點"""

def generate_paragraph_theme(topic, essay_topic, keywords):
    try:
        prompt = f"""請根據作文題目 '{essay_topic}' 和學生想到的關鍵字 '{keywords}'，按照教育部規定的英文作文結構為國中小學生設計段落安排 (你不能輸出＊字符號)。

        段落安排要求：
        - 遵循教育部規定的英文作文結構
        - 適合國中小學生的寫作程度
        - 每段主題要簡單明確
        - 用詞要淺顯易懂
        
        標準段落結構（教育部規定）：
        第1段：引言（Introduction）- 背景介紹 + 主旨陳述
        第2段：內文段落一（Body Paragraph 1）- 第一個論點 + 支持證據
        第3段：內文段落二（Body Paragraph 2）- 第二個論點 + 支持證據  
        第4段：內文段落三（Body Paragraph 3）- 第三個論點 + 支持證據
        第5段：結論（Conclusion）- 總結論點 + 重申立場
        
        請按照以下格式輸出(請嚴格按照以下格式輸出)，每段用簡單的中文說明：
        第一段（引言）: [引言段落的具體內容建議]
        第二段（內文一）: [第一個內文段落的具體內容建議]
        第三段（內文二）: [第二個內文段落的具體內容建議]
        第四段（內文三）: [第三個內文段落的具體內容建議]
        第五段（結論）: [結論段落的具體內容建議]
        """
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating paragraph theme for '{topic}' and '{essay_topic}': {traceback.format_exc()}")
        return "無法生成段落主題，請稍後再試"

def generate_english_keypoints(essay_topic, paragraph_theme):
    """生成英文關鍵點供學生參考"""
    try:
        prompt = f"""請根據作文題目 '{essay_topic}' 和段落主題 '{paragraph_theme}'，為國中小學生提供每段可以使用的英文關鍵詞和短語 (你不能輸出＊字符號)。

        要求：
        - 適合國中小學生的英文程度
        - 提供實用的英文單字和短語
        - 每段提供3-5個相關的英文關鍵詞
        - 用詞要簡單易懂
        
        請按照以下格式輸出英文關鍵詞(請嚴格按照以下格式輸出)：
        第一段: [英文關鍵詞1, 英文關鍵詞2, 英文關鍵詞3]
        第二段: [英文關鍵詞1, 英文關鍵詞2, 英文關鍵詞3]
        第三段: [英文關鍵詞1, 英文關鍵詞2, 英文關鍵詞3]
        第四段: [英文關鍵詞1, 英文關鍵詞2, 英文關鍵詞3]
        第五段: [英文關鍵詞1, 英文關鍵詞2, 英文關鍵詞3]
        
        例如：beautiful, cute, friendly, play with, take care of, happy, sad, excited
        """
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating English keypoints for '{essay_topic}' and '{paragraph_theme}': {traceback.format_exc()}")
        return "無法生成英文關鍵點，請稍後再試"

def generate_key_points(topic, essay_topic, paragraph_theme):
    try:
        prompt = f"""請根據作文題目 '{essay_topic}' 和段落主題 '{paragraph_theme}'，為國中小學生提供每段可以使用的英文單字和短句 (你不能輸出＊字符號)。

        要求：
        - 適合國中小學生的英文程度
        - 提供實用的英文單字、短語和簡短句子
        - 每段提供5-8個相關的英文詞彙或短句
        - 用詞要簡單易懂，適合寫作使用
        
        請按照以下格式輸出英文詞彙和短句(請嚴格按照以下格式輸出)：
        第一段: word1, phrase1, short sentence1, word2, phrase2
        第二段: word1, phrase1, short sentence1, word2, phrase2
        第三段: word1, phrase1, short sentence1, word2, phrase2
        第四段: word1, phrase1, short sentence1, word2, phrase2
        第五段: word1, phrase1, short sentence1, word2, phrase2
        
        例如：beautiful, very important, I think that, interesting, make me happy, first of all, in conclusion
        """
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating key points for '{topic}', '{essay_topic}', and '{paragraph_theme}': {traceback.format_exc()}")
        return "無法生成關鍵點，請稍後再試"

def generate_topic_sentence_from_keypoints(essay_topic, user_keypoints):
    """基於用戶輸入的關鍵點生成主題句範本"""
    try:
        if not user_keypoints or len(user_keypoints) == 0:
            return """第一段: I want to talk about {essay_topic}.
第二段: First, I think it is important to mention...
第三段: Another thing I want to share is...
第四段: Moreover, I believe that...
第五段: In conclusion, {essay_topic} means a lot to me.""".format(essay_topic=essay_topic)
        
        prompt = f"""請根據作文題目 '{essay_topic}' 和學生寫的關鍵點，為每段生成簡單的英文主題句範本 (你不能輸出＊字符號)。

學生的關鍵點：
{chr(10).join([f'第{i+1}段: {point}' for i, point in enumerate(user_keypoints) if point.strip()])}

要求：
- 適合國中小學生的英文程度
- 句子要簡單易懂
- 基於學生的關鍵點內容
- 每句話都要完整且有意義

請按照以下格式輸出(請嚴格按照以下格式輸出)：
第一段: [簡單的英文主題句]
第二段: [簡單的英文主題句]
第三段: [簡單的英文主題句]
第四段: [簡單的英文主題句]
第五段: [簡單的英文主題句]"""
        
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating topic sentences from keypoints: {traceback.format_exc()}")
        return f"""第一段: I want to talk about {essay_topic}.
第二段: First, I think it is important to mention...
第三段: Another thing I want to share is...
第四段: Moreover, I believe that...
第五段: In conclusion, {essay_topic} means a lot to me."""

def generate_topic_sentence(topic, essay_topic, paragraph_theme, keywords):
    try:
        prompt = f"""請根據作文題目 '{essay_topic}'、段落主題 '{paragraph_theme}' 和關鍵字 '{keywords}'，為國中小學生生成每段的英文開頭句範例 (你不能輸出＊字符號)。

        要求：
        - 適合國中小學生的英文程度
        - 句子要簡單易懂
        - 用詞要基礎，避免太難的單字
        - 句型要簡單明確
        - 這些只是範例，學生可以參考或自己創作
        
        請按照以下格式輸出，提供每段的英文開頭句範例(請嚴格按照以下格式輸出)：
        第一段: [簡單的英文開頭句範例]
        第二段: [簡單的英文開頭句範例]
        第三段: [簡單的英文開頭句範例]
        第四段: [簡單的英文開頭句範例]
        第五段: [簡單的英文開頭句範例]
        
        範例格式：
        - I have a pet dog. (我有一隻寵物狗)
        - My dog is very cute. (我的狗很可愛)
        - He likes to play with me. (他喜歡和我玩)
        """
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating topic sentence for '{topic}', '{essay_topic}', '{paragraph_theme}', and '{keywords}': {traceback.format_exc()}")
        return "無法生成主題句，請稍後再試"
def save_composition_to_db(user_id, title, content, ai_feedback=None):
    """儲存作文到資料庫"""
    try:
        composition = Composition(
            user_id=user_id,
            title=title,
            content=content,
            ai_feedback=ai_feedback
        )
        db.session.add(composition)
        db.session.commit()
        
        # 記錄學習活動
        learning_record = LearningRecord(
            user_id=user_id,
            activity_type='composition',
            content=f'完成作文: {title}'
        )
        db.session.add(learning_record)
        db.session.commit()
        
        return composition.id
    except Exception as e:
        print(f"Error saving composition: {e}")
        db.session.rollback()
        return None

def get_user_compositions(user_id, limit=10):
    """獲取用戶的作文歷史"""
    try:
        compositions = Composition.query.filter_by(user_id=user_id)\
                                      .order_by(Composition.timestamp.desc())\
                                      .limit(limit).all()
        return compositions
    except Exception as e:
        print(f"Error getting user compositions: {e}")
        return []

def compose_essay_from_sentences(topic_sentences):
    """從主題句組合成完整作文"""
    try:
        if not topic_sentences or len(topic_sentences) != 5:
            return "無法生成作文，請確保完成所有五個段落的主題句"
        
        # 使用 AI 將主題句擴展成完整段落
        prompt = f"""請將以下五個主題句擴展成一篇完整的國中小學生程度英文作文 (你不能輸出＊字符號):

第一段主題句: {topic_sentences[0]}
第二段主題句: {topic_sentences[1]}
第三段主題句: {topic_sentences[2]}
第四段主題句: {topic_sentences[3]}
第五段主題句: {topic_sentences[4]}

要求：
- 適合國中小學生的英文程度
- 用詞簡單，句型基礎
- 每個主題句擴展成約50-80字的段落
- 整篇作文要有完整的結構
- 內容要生動有趣，貼近學生生活

請直接輸出完整的英文作文，不需要其他說明。"""
        
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception as e:
        print(f"Error composing essay from sentences: {e}")
        return "無法生成作文，請稍後再試"

def translate_essay_to_chinese(essay):
    """將英文作文翻譯成中文"""
    try:
        prompt = f"""請將以下英文作文翻譯成繁體中文，翻譯要自然流暢，適合國中小學生理解 (你不能輸出＊字符號):

{essay}

要求：
- 使用繁體中文
- 翻譯要自然流暢
- 保持原文的段落結構
- 用詞要適合國中小學生理解

請直接輸出中文翻譯，不需要其他說明。"""
        
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception as e:
        print(f"Error translating essay: {e}")
        return "無法翻譯作文，請稍後再試"
def generate_essay_evaluation(essay):
    try:
        prompt = f"""請針對以下國中小學生的英文作文給予鼓勵性的評價和建議 (你不能輸出＊字符號):

{essay}

評價要求：
- 用繁體中文回應
- 語氣要鼓勵和正面
- 適合國中小學生的理解程度
- 指出作文的優點
- 給出具體的改進建議
- 用詞要親切友善

請按照以下格式回應：
【優點】
[列出作文的優點，給予鼓勵]

【建議】
[給出具體的改進建議，幫助學生進步]

【總評】
[給予正面的總結評語]"""
        
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating essay evaluation: {traceback.format_exc()}")
        return "無法生成作文評價，請稍後再試"
def combine_user_content(user_keypoints, user_topic_sentences):
    """直接組合用戶的關鍵點和主題句，不做AI修改"""
    try:
        # 確保有內容可以組合
        if not user_topic_sentences:
            return "請先完成主題句的編寫"
        
        # 直接將用戶的主題句組合成段落
        essay_paragraphs = []
        
        for i, sentence in enumerate(user_topic_sentences):
            if sentence.strip():
                # 每個主題句作為一個段落
                paragraph = sentence.strip()
                
                # 如果有對應的關鍵點，可以簡單地添加到句子後面
                if i < len(user_keypoints) and user_keypoints[i].strip():
                    # 簡單地將關鍵點作為補充說明
                    keypoint = user_keypoints[i].strip()
                    # 這裡不做複雜的AI處理，只是簡單組合
                    if not sentence.endswith('.'):
                        paragraph += '.'
                    paragraph += f" {keypoint}."
                
                essay_paragraphs.append(paragraph)
        
        # 將段落組合成完整作文
        essay = '\n\n'.join(essay_paragraphs)
        return essay
        
    except Exception as e:
        print(f"Error combining user content: {e}")
        return "無法組合作文內容，請稍後再試"

def generate_simple_evaluation(essay):
    """生成簡單的鼓勵性評價"""
    try:
        prompt = f"""請針對以下學生自己寫的英文作文給予簡短的鼓勵性評價 (你不能輸出＊字符號):

{essay}

評價要求：
- 用繁體中文回應
- 語氣要非常鼓勵和正面
- 重點在於肯定學生的努力
- 簡短有力，不超過100字
- 強調學生的創意和想法

請給予正面的鼓勵評語。"""
        
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating simple evaluation: {traceback.format_exc()}")
        return "太棒了！你完成了自己的作文，這是很棒的成就！繼續努力，你會越來越進步的！"

def generate_refined_essay(essay):
    try:
        prompt = f"""請幫助國中小學生改進以下英文作文，讓它變得更好 (你不能輸出＊字符號):

{essay}

改進要求：
- 保持適合國中小學生的英文程度
- 修正文法錯誤
- 讓句子更流暢
- 用詞更準確但不要太難
- 保持原文的意思和結構
- 讓作文更生動有趣

請直接輸出改進後的英文作文，不需要其他說明。"""
        
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating refined essay: {traceback.format_exc()}")
        return "無法生成潤飾後的作文，請稍後再試"
@app.route("/composition", methods=["GET", "POST"])
@login_required
def composition():
    """作文功能主頁面 - 需要登入"""
    # 獲取用戶的作文歷史
    user_compositions = get_user_compositions(current_user.id, limit=5)
    return render_template('composition.html', user_compositions=user_compositions)

@app.route("/composition/new", methods=["GET", "POST"])
@login_required
def new_composition():
    """創建新作文"""
    if request.method == "POST":
        # 處理作文創建請求
        data = request.get_json()
        action = data.get('action')
        
        if action == 'generate_topic':
            topic_category = data.get('topic_category')
            essay_topic = generate_essay_topic(topic_category)
            session['composition_data'] = {
                'topic_category': topic_category,
                'essay_topic': essay_topic,
                'step': 1
            }
            return jsonify({'success': True, 'essay_topic': essay_topic})
        
        elif action == 'set_custom_topic':
            custom_topic = data.get('custom_topic')
            session['composition_data'] = {
                'topic_category': 'custom',
                'essay_topic': custom_topic,
                'step': 1
            }
            return jsonify({'success': True, 'essay_topic': custom_topic})
        
        elif action == 'generate_paragraph_themes':
            composition_data = session.get('composition_data', {})
            keywords = data.get('keywords', '')
            paragraph_theme = generate_paragraph_theme(
                composition_data.get('topic_category'),
                composition_data.get('essay_topic'),
                keywords
            )
            composition_data.update({
                'keywords': keywords,
                'paragraph_theme': paragraph_theme,
                'step': 2
            })
            session['composition_data'] = composition_data
            return jsonify({
                'success': True, 
                'paragraph_theme': paragraph_theme
            })
        
        elif action == 'generate_key_points':
            composition_data = session.get('composition_data', {})
            key_points = generate_key_points(
                composition_data.get('topic_category'),
                composition_data.get('essay_topic'),
                composition_data.get('paragraph_theme')
            )
            composition_data.update({
                'key_points': key_points,
                'step': 3
            })
            session['composition_data'] = composition_data
            return jsonify({'success': True, 'key_points': key_points})
        
        elif action == 'generate_topic_sentences':
            composition_data = session.get('composition_data', {})
            user_keypoints = data.get('user_keypoints', [])
            topic_sentences = generate_topic_sentence_from_keypoints(
                composition_data.get('essay_topic'),
                user_keypoints
            )
            composition_data.update({
                'topic_sentences': topic_sentences,
                'step': 4
            })
            session['composition_data'] = composition_data
            return jsonify({'success': True, 'topic_sentences': topic_sentences})
        
        elif action == 'combine_essay':
            composition_data = session.get('composition_data', {})
            user_keypoints = data.get('user_keypoints', [])
            user_topic_sentences = data.get('user_topic_sentences', [])
            
            # 直接組合用戶的內容，不再由AI修改
            essay = combine_user_content(user_keypoints, user_topic_sentences)
            translation = translate_essay_to_chinese(essay)
            evaluation = generate_simple_evaluation(essay)
            
            # 儲存到資料庫
            composition_id = save_composition_to_db(
                current_user.id,
                composition_data.get('essay_topic', '未命名作文'),
                essay,
                evaluation
            )
            
            if composition_id:
                # 清除 session 資料
                session.pop('composition_data', None)
                return jsonify({
                    'success': True,
                    'essay': essay,
                    'translation': translation,
                    'evaluation': evaluation,
                    'composition_id': composition_id
                })
            else:
                return jsonify({'success': False, 'error': '儲存作文失敗'})
        
        elif action == 'finalize_essay':
            composition_data = session.get('composition_data', {})
            user_topic_sentences = data.get('user_topic_sentences', [])
            
            # 生成完整作文
            essay = compose_essay_from_sentences(user_topic_sentences)
            translation = translate_essay_to_chinese(essay)
            evaluation = generate_essay_evaluation(essay)
            
            # 儲存到資料庫
            composition_id = save_composition_to_db(
                current_user.id,
                composition_data.get('essay_topic', '未命名作文'),
                essay,
                evaluation
            )
            
            if composition_id:
                # 清除 session 資料
                session.pop('composition_data', None)
                return jsonify({
                    'success': True,
                    'essay': essay,
                    'translation': translation,
                    'evaluation': evaluation,
                    'composition_id': composition_id
                })
            else:
                return jsonify({'success': False, 'error': '儲存作文失敗'})
        
        elif action == 'get_feedback':
            essay = data.get('essay')
            translation = translate_essay_to_chinese(essay)
            evaluation = generate_simple_evaluation(essay)
            return jsonify({
                'success': True,
                'translation': translation,
                'evaluation': evaluation
            })
        
        elif action == 'save_essay':
            essay_topic = data.get('essay_topic')
            essay_content = data.get('essay_content')
            translation = data.get('translation', '')
            evaluation = data.get('evaluation', '')
            
            if not essay_topic or not essay_content:
                return jsonify({'success': False, 'error': '作文題目和內容不能為空'})
            
            # 儲存到資料庫
            composition_id = save_composition_to_db(
                current_user.id,
                essay_topic,
                essay_content,
                evaluation
            )
            
            if composition_id:
                return jsonify({
                    'success': True,
                    'composition_id': composition_id,
                    'message': '作文儲存成功'
                })
            else:
                return jsonify({'success': False, 'error': '儲存作文失敗'})
        
        elif action == 'refine_essay':
            essay = data.get('essay')
            refined_essay = generate_refined_essay(essay)
            refined_translation = translate_essay_to_chinese(refined_essay)
            return jsonify({
                'success': True, 
                'refined_essay': refined_essay,
                'refined_translation': refined_translation
            })
    
    # GET 請求 - 顯示新作文創建頁面
    composition_data = session.get('composition_data', {})
    return render_template('composition_new.html', composition_data=composition_data)

@app.route("/composition/view/<int:composition_id>")
@login_required
def view_composition(composition_id):
    """查看特定作文"""
    composition = Composition.query.filter_by(
        id=composition_id,
        user_id=current_user.id
    ).first()
    
    if not composition:
        flash('作文不存在或無權限查看', 'error')
        return redirect(url_for('composition'))
    
    return render_template('composition_view.html', composition=composition)

@app.route("/composition/delete/<int:composition_id>", methods=["POST"])
@login_required
def delete_composition(composition_id):
    """刪除作文"""
    composition = Composition.query.filter_by(
        id=composition_id,
        user_id=current_user.id
    ).first()
    
    if not composition:
        return jsonify({'success': False, 'error': '作文不存在或無權限刪除'})
    
    try:
        db.session.delete(composition)
        db.session.commit()
        return jsonify({'success': True, 'message': '作文已刪除'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': '刪除失敗'})


def start_ngrok():
    public_url = ngrok.connect(8000)  # 指向 Flask 的埠號
    print(f"公開 URL: {public_url}")
    return public_url

if __name__ == "__main__":
    # 啟動 ngrok 以提供公開網址
    start_ngrok()
    
    # 啟動定時清理任務
    import threading
    import time
    
    def cleanup_scheduler():
        while True:
            time.sleep(3600)  # 每小時執行一次
            auto_cleanup_translations()
    
    cleanup_thread = threading.Thread(target=cleanup_scheduler)
    cleanup_thread.daemon = True
    cleanup_thread.start()

    # 啟動 Flask
    app.run(host='0.0.0.0', port=8000)
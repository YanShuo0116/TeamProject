#語音小BUG 再次生成不會覆蓋
from flask import Flask, request, render_template, send_file, jsonify, redirect, url_for, flash
from flask_login import LoginManager, current_user
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
from models import User, VocabularyProgress, LessonProgress, Vocabulary, LearningRecord, QuizAttempt, QuizQuestion

#小小設定一下
lock = threading.Lock()
Us_uk="us"

# 配置API                                                                            #README.MD裡有網址
ngrok.set_auth_token("2ywXahUIQ4BEQlBrwDT4DZ5B7xg_2B3tbiXUwG9YS9oqgcfxm")     # 替換為你的 ngrok 金鑰!!!!!!!!!!!!
genai.configure(api_key='AIzaSyAWsd4l5j35qjTEnag79enNkMdYp64djDY')            # 替換為你的 gemini   金鑰!!!!!!!!!  

PEXELS_API_KEY = "6mWeoatNXVXQ6seEFFQwvLmxUms72OENEc1utnp0aCa9g0sqbM2V9ybr" # 替換為你的 Pexels API 金鑰
pexels_api = Pexels(PEXELS_API_KEY)

#選擇模型
model = genai.GenerativeModel('gemini-1.5-flash')

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

#作文資料紀錄
composition_data = {}

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
        explanation_prompt = f"請列出與單字 '{word}' 相關的詞語，包含變形或派生詞(2~5個)，格式如下：\nUnnerve\n- Unnerving\n- Unnervingly"
        explanation_response = model.generate_content(explanation_prompt).text

        # 3. 例句
        example_prompt = f"""請提供 2 個使用單字 '{word}' 的簡短例句，並附上<繁體中文>翻譯,以下為你輸出範例(例句1翻譯和例句2中間空一行 總共只能有五行),無需輸出＊符號。
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



@app.route("/translator", methods=["GET", "POST"])
def translator():
    translation, explanation, examples = None, None, None
    if request.method == "POST":
        word = request.form.get("word", "").strip()
        if word:
            with lock:
                time.sleep(0.5)  
                translation, explanation, examples = translate_word(word)
    
    return render_template('translator.html', translation=translation, explanation=explanation, examples=examples)




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
        return jsonify({'error': 'User not authenticated'}), 401
    
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
        
        # 檢查是否完成課程 (需要學習所有單字)
        if learned_count >= lesson_progress.total_words and lesson_progress.total_words > 0:
            lesson_progress.is_completed = True
            if not lesson_progress.completion_date:
                lesson_progress.completion_date = datetime.now()
    
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
        return jsonify({'error': 'User not authenticated'}), 401
    
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

# 測驗相關 API
@app.route("/api/start_quiz", methods=["POST"])
def start_quiz():
    if not current_user.is_authenticated:
        return jsonify({'error': 'User not authenticated'}), 401
    
    data = request.get_json()
    theme = data.get('theme')
    lesson = data.get('lesson')
    
    if not theme or not lesson:
        return jsonify({'error': 'Theme and lesson are required'}), 400
    
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
        return jsonify({'error': 'User not authenticated'}), 401
    
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
        return jsonify({'error': 'User not authenticated'}), 401
    
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
        return jsonify({'error': 'User not authenticated'}), 401
    
    # 獲取測驗嘗試
    quiz_attempt = QuizAttempt.query.filter_by(
        id=quiz_id,
        user_id=current_user.id
    ).first()
    
    if not quiz_attempt:
        return jsonify({'error': 'Quiz not found'}), 404
    
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
def generate_essay_topic(topic):
    try:
        prompt = f"請根據以下領域 '{topic}' 生成一個適合高中程度的英文作文題目 (你不能輸出＊字符號)，只返回題目本身不需要額外文字。"
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating essay topic for '{topic}': {traceback.format_exc()}")
        return "無法生成題目，請稍後再試"
def generate_paragraph_theme(topic, essay_topic, keywords):
    try:
        prompt = f"""請根據以下領域 '{topic}'、作文題目 '{essay_topic}' 和關鍵字'{keywords}'，生成五個適合高中程度並符合以下段落敘述
        （第1段： 介紹背景&引言，講述問題的重要性和爭議
          第2段： 提出觀點一，列舉相關例子和證據支持該觀點
          第3段： 提出觀點二，列舉相關例子和證據支持該觀點
          第4段： 比較不同觀點的優缺點，提出自己所支持的觀點和理由
          第5段： 總結觀點，重申問題的重要性和解決方式）
        
        的英文50字單字內段落主題 (你不能輸出＊字符號），按照以下格式輸出:
        第一段: [段落主題1]
        第二段: [段落主題2]
        第三段: [段落主題3]
        第四段: [段落主題4]
        第五段: [段落主題5]
        """
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating paragraph theme for '{topic}' and '{essay_topic}': {traceback.format_exc()}")
        return "無法生成段落主題，請稍後再試"

def generate_key_points(topic, essay_topic, paragraph_theme):
    try:
        prompt = f"""請根據以下領域 '{topic}'、作文題目 '{essay_topic}' 和段落主題'{paragraph_theme}'，針對每一個段落主題生成適合高中程度的英文文章關鍵點１０字上下(你不能輸出＊字符號)，按照以下格式輸出:
        第一段: 請寫出由第一段主題延伸的關鍵點
        第二段: 請寫出由第二段主題延伸的關鍵點
        第三段: 請寫出由第三段主題延伸的關鍵點
        第四段: 請寫出由第四段主題延伸的關鍵點
        第五段: 請寫出由第五段主題延伸的關鍵點
        """
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
        print(f"Error generating key points for '{topic}', '{essay_topic}', and '{paragraph_theme}': {traceback.format_exc()}")
        return "無法生成關鍵點，請稍後再試"

def generate_topic_sentence(topic, essay_topic, paragraph_theme, keywords):
    try:
         prompt = f"""請根據以下領域 '{topic}'、作文題目 '{essay_topic}' 、段落主題'{paragraph_theme}' 和關鍵字'{keywords}'，針對每一個段落主題和關鍵字生成一個適合高中程度的英文主題句 (你不能輸出＊字符號)，按照以下格式輸出:
        第一段: 請根據第一段的關鍵字寫出主題句 [主題句1]
        第二段: 請根據第二段的關鍵字寫出主題句 [主題句2]
        第三段: 請根據第三段的關鍵字寫出主題句 [主題句3]
        第四段: 請根據第四段的關鍵字寫出主題句 [主題句4]
        第五段: 請根據第五段的關鍵字寫出主題句 [主題句5]
        """
         response = model.generate_content(prompt).text.strip()
         return response
    except Exception:
        print(f"Error generating topic sentence for '{topic}', '{essay_topic}', '{paragraph_theme}', and '{keywords}': {traceback.format_exc()}")
        return "無法生成主題句，請稍後再試"
def save_composition_data(step, data):
    global composition_data
    composition_data[step] = data
def compose_essay():
    try:
        essay_parts = []
        for step in sorted(composition_data.keys()):
            if step in composition_data and 'topic_sentence' in composition_data[step]:
                if isinstance(composition_data[step]['topic_sentence'], dict):
                    for key in sorted(composition_data[step]['topic_sentence'].keys()):
                         essay_parts.append(composition_data[step]['topic_sentence'][key])
                else:
                   essay_parts.append(composition_data[step]['topic_sentence'])
        return "\n".join(essay_parts)
    except Exception:
        print(f"Error composing essay: {traceback.format_exc()}")
        return "無法生成作文，請稍後再試"
def generate_essay_evaluation(essay):
    try:
        prompt = f"""請針對以下高中英文作文給予評價(你不能輸出＊字符號)並給出優點及缺點:
        {essay}
        """
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
         print(f"Error generating essay evaluation: {traceback.format_exc()}")
         return "無法生成作文評價，請稍後再試"
def generate_refined_essay(essay):
    try:
        prompt = f"""請針對以下高中英文作文進行潤飾，使其更流暢且更適合高中生程度(你不能輸出＊字符號):
        {essay}
        """
        response = model.generate_content(prompt).text.strip()
        return response
    except Exception:
         print(f"Error generating refined essay: {traceback.format_exc()}")
         return "無法生成潤飾後的作文，請稍後再試"
@app.route("/composition", methods=["GET", "POST"])
def composition():
    global composition_data
    step = request.args.get("step", "1")
    essay_topic = None
    paragraph_theme = None
    key_points = None
    topic_sentence = None
    essay = None
    evaluation = None
    refined_essay = None
    if request.method == "POST":
        data = request.form.to_dict()
        print(f"接收到的表單數據: {data}")
        if step == '1':
            topic = data.get('topic')
            essay_topic = data.get('essay_topic')
            if not essay_topic:
               essay_topic= generate_essay_topic(topic)
            save_composition_data(step, {"topic":topic,"essay_topic": essay_topic})
            
            
            return render_template('composition.html', step=step, essay_topic=essay_topic)
        elif step == '2':
            topic = composition_data.get('1').get('topic')
            essay_topic = composition_data.get('1').get('essay_topic')
            keywords = data.get('keywords')
            paragraph_theme= generate_paragraph_theme(topic, essay_topic,keywords)
            save_composition_data(step, {"paragraph_theme": paragraph_theme, "keywords": keywords})
           
            return render_template('composition.html', step=step, paragraph_theme=paragraph_theme, keywords=keywords)
        elif step == '3':
             topic = composition_data.get('1').get('topic')
             essay_topic = composition_data.get('1').get('essay_topic')
             paragraph_theme = composition_data.get('2').get('paragraph_theme')
             key_points = generate_key_points(topic, essay_topic, paragraph_theme)
             save_composition_data(step, {"key_points": key_points})
           
             return render_template('composition.html', step=step, key_points=key_points, paragraph_theme=paragraph_theme)
        elif step == '4':
            topic = composition_data.get('1').get('topic')
            essay_topic = composition_data.get('1').get('essay_topic')
            paragraph_theme = composition_data.get('2').get('paragraph_theme')
            keywords = composition_data.get('2').get('keywords')
            key_points = composition_data.get('3').get('key_points')
            topic_sentence = generate_topic_sentence(topic, essay_topic, paragraph_theme, keywords)
            save_composition_data(step,{"topic_sentence":topic_sentence})
            return render_template('composition.html', step=step, topic_sentence=topic_sentence, key_points=key_points, paragraph_theme = paragraph_theme)
        elif step == '5':
            essay = compose_essay()
            evaluation = generate_essay_evaluation(essay)
            refined_essay= generate_refined_essay(essay)
            return render_template('composition.html', step=step, essay=essay, evaluation=evaluation, refined_essay = refined_essay)
    
    return render_template('composition.html', step=step, essay_topic=essay_topic, paragraph_theme=paragraph_theme, key_points=key_points, topic_sentence=topic_sentence, essay = essay, evaluation=evaluation, refined_essay = refined_essay)


def start_ngrok():
    public_url = ngrok.connect(8000)  # 指向 Flask 的埠號
    print(f"公開 URL: {public_url}")
    return public_url

if __name__ == "__main__":
    # 啟動 ngrok 以提供公開網址
    start_ngrok()

    # 啟動 Flask
    app.run(host='0.0.0.0', port=8000)
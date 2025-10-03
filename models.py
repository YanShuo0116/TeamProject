from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

db = SQLAlchemy()

# Function to get current time in UTC+8
def get_utc8_now():
    return datetime.now(timezone(timedelta(hours=8)))

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user') # 'user' or 'admin'
    preferred_accent = db.Column(db.String(10), nullable=False, default='us') # 'us' or 'co.uk'
    created_at = db.Column(db.DateTime, default=get_utc8_now)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class LearningRecord(db.Model):
    __tablename__ = 'learning_records'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    activity_type = db.Column(db.String(50), nullable=False) # e.g., 'translation', 'composition', 'vocabulary'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=get_utc8_now)
    user = db.relationship('User', backref=db.backref('learning_records', lazy=True))

class Composition(db.Model):
    __tablename__ = 'compositions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    ai_feedback = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=get_utc8_now)
    user = db.relationship('User', backref=db.backref('compositions', lazy=True))

class Vocabulary(db.Model):
    __tablename__ = 'vocabulary'
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(100), unique=True, nullable=False)
    chinese_translation = db.Column(db.String(200), nullable=True)
    part_of_speech = db.Column(db.String(50), nullable=True)
    theme_name = db.Column(db.String(100), nullable=True)
    lesson_name = db.Column(db.String(100), nullable=True)

class VocabularyProgress(db.Model):
    __tablename__ = 'vocabulary_progress'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    word_id = db.Column(db.Integer, db.ForeignKey('vocabulary.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='not_learned') # e.g., 'not_learned', 'learning', 'learned'
    last_reviewed = db.Column(db.DateTime, nullable=True)
    review_count = db.Column(db.Integer, default=0)
    correct_count = db.Column(db.Integer, default=0)
    user = db.relationship('User', backref=db.backref('vocabulary_progress', lazy=True))
    word = db.relationship('Vocabulary', backref=db.backref('progress_records', lazy=True))

# 新增學習單元進度追蹤
class LessonProgress(db.Model):
    __tablename__ = 'lesson_progress'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    theme_name = db.Column(db.String(100), nullable=False)
    lesson_name = db.Column(db.String(100), nullable=False)
    total_words = db.Column(db.Integer, nullable=False, default=0)
    learned_words = db.Column(db.Integer, nullable=False, default=0)
    is_completed = db.Column(db.Boolean, nullable=False, default=False)
    completion_date = db.Column(db.DateTime, nullable=True)
    last_studied = db.Column(db.DateTime, default=get_utc8_now)
    user = db.relationship('User', backref=db.backref('lesson_progress', lazy=True))

class SystemSetting(db.Model):
    __tablename__ = 'system_settings'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(200), nullable=False)

class AdminLog(db.Model):
    __tablename__ = 'admin_logs'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=get_utc8_now)
    admin = db.relationship('User', backref=db.backref('admin_logs', lazy=True))

class TranslationRecord(db.Model):
    __tablename__ = 'translation_records'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), nullable=False, index=True)  # 用於識別翻譯請求
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # 可選，支援未登入用戶
    word = db.Column(db.String(200), nullable=False)
    translation = db.Column(db.Text, nullable=True)
    explanation = db.Column(db.Text, nullable=True)
    examples = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='processing')  # 'processing', 'completed', 'failed'
    created_at = db.Column(db.DateTime, default=get_utc8_now)
    completed_at = db.Column(db.DateTime, nullable=True)
    user = db.relationship('User', backref=db.backref('translation_records', lazy=True))

class QuizAttempt(db.Model):
    __tablename__ = 'quiz_attempts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    theme_name = db.Column(db.String(100), nullable=False)
    lesson_name = db.Column(db.String(100), nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    correct_answers = db.Column(db.Integer, nullable=False, default=0)
    is_passed = db.Column(db.Boolean, nullable=False, default=False)
    completion_time = db.Column(db.Integer, nullable=True)  # 完成時間（秒）
    status = db.Column(db.String(20), nullable=False, default='in_progress')  # 'in_progress', 'completed', 'abandoned'
    started_at = db.Column(db.DateTime, default=get_utc8_now)
    completed_at = db.Column(db.DateTime, nullable=True)
    user = db.relationship('User', backref=db.backref('quiz_attempts', lazy=True))

class QuizQuestion(db.Model):
    __tablename__ = 'quiz_questions'
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('quiz_attempts.id'), nullable=False)
    word_id = db.Column(db.Integer, db.ForeignKey('vocabulary.id'), nullable=False)
    question_type = db.Column(db.String(50), nullable=False)  # 'chinese_to_english', 'english_to_chinese', 'spelling'
    user_answer = db.Column(db.Text, nullable=True)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    answered_at = db.Column(db.DateTime, nullable=True)
    attempt = db.relationship('QuizAttempt', backref=db.backref('questions', lazy=True))
    word = db.relationship('Vocabulary', backref=db.backref('quiz_questions', lazy=True))

# 口說練習相關模型
class SpeakingSession(db.Model):
    """口說練習會話記錄"""
    __tablename__ = 'speaking_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    topic_id = db.Column(db.Integer, nullable=False)
    topic_title = db.Column(db.String(200), nullable=False)
    cefr_level = db.Column(db.String(10), nullable=False)
    scenario_index = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default='active')  # active, completed, abandoned
    started_at = db.Column(db.DateTime, default=get_utc8_now)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # 關聯
    user = db.relationship('User', backref=db.backref('speaking_practices', lazy=True))


class CustomVocabularyBook(db.Model):
    __tablename__ = 'custom_vocabulary_books'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=get_utc8_now)

    user = db.relationship('User', backref=db.backref('custom_vocabulary_books', lazy=True))
    words = db.relationship('CustomVocabulary', backref='book', lazy='dynamic', cascade="all, delete-orphan")

class CustomVocabulary(db.Model):
    __tablename__ = 'custom_vocabularies'
    id = db.Column(db.Integer, primary_key=True)
    english_word = db.Column(db.String(150), nullable=False)
    chinese_translation = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, default=get_utc8_now)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('custom_vocabulary_books.id'), nullable=False)

    user = db.relationship('User', backref=db.backref('custom_vocabularies', lazy=True))

class SpeakingExchange(db.Model):
    """口說練習對話交換記錄"""
    __tablename__ = 'speaking_exchanges'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('speaking_sessions.id'), nullable=False)
    exchange_order = db.Column(db.Integer, nullable=False)  # 對話順序
    
    # AI生成的問題
    ai_question = db.Column(db.Text, nullable=False)
    ai_situation = db.Column(db.Text, nullable=True)
    ai_guidance = db.Column(db.Text, nullable=True)
    ai_keywords = db.Column(db.Text, nullable=True)  # JSON格式存儲關鍵詞
    
    # 用戶回答
    user_response_text = db.Column(db.Text, nullable=True)
    user_audio_filename = db.Column(db.String(255), nullable=True)
    
    # AI評估
    ai_feedback = db.Column(db.Text, nullable=True)  # JSON格式存儲評估結果
    ai_improved_answer = db.Column(db.Text, nullable=True)
    
    # 評分
    grammar_score = db.Column(db.Integer, nullable=True)
    vocabulary_score = db.Column(db.Integer, nullable=True)
    fluency_score = db.Column(db.Integer, nullable=True)
    relevance_score = db.Column(db.Integer, nullable=True)
    overall_score = db.Column(db.Integer, nullable=True)
    
    # 時間戳
    created_at = db.Column(db.DateTime, default=get_utc8_now)
    responded_at = db.Column(db.DateTime, nullable=True)
    evaluated_at = db.Column(db.DateTime, nullable=True)

class SpeakingProgress(db.Model):
    """口說練習進度追蹤"""
    __tablename__ = 'speaking_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    topic_id = db.Column(db.Integer, nullable=False)
    cefr_level = db.Column(db.String(10), nullable=False)
    
    # 統計數據
    total_sessions = db.Column(db.Integer, nullable=False, default=0)
    completed_sessions = db.Column(db.Integer, nullable=False, default=0)
    total_exchanges = db.Column(db.Integer, nullable=False, default=0)
    
    # 平均分數
    avg_grammar_score = db.Column(db.Float, nullable=True)
    avg_vocabulary_score = db.Column(db.Float, nullable=True)
    avg_fluency_score = db.Column(db.Float, nullable=True)
    avg_relevance_score = db.Column(db.Float, nullable=True)
    avg_overall_score = db.Column(db.Float, nullable=True)
    
    # 最佳分數
    best_overall_score = db.Column(db.Integer, nullable=True)
    best_session_date = db.Column(db.DateTime, nullable=True)
    
    # 時間戳
    first_attempt = db.Column(db.DateTime, default=get_utc8_now)
    last_attempt = db.Column(db.DateTime, default=get_utc8_now)
    
    # 關聯
    user = db.relationship('User', backref=db.backref('speaking_progress', lazy=True))

# === New Models for Custom Quizzes ===
class CustomQuizAttempt(db.Model):
    __tablename__ = 'custom_quiz_attempts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('custom_vocabulary_books.id'), nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    correct_answers = db.Column(db.Integer, nullable=False, default=0)
    is_passed = db.Column(db.Boolean, nullable=False, default=False)
    completion_time = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='in_progress')
    started_at = db.Column(db.DateTime, default=get_utc8_now)
    completed_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref=db.backref('custom_quiz_attempts', lazy=True))
    book = db.relationship('CustomVocabularyBook', backref=db.backref('quiz_attempts', lazy=True))

class CustomQuizQuestion(db.Model):
    __tablename__ = 'custom_quiz_questions'
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('custom_quiz_attempts.id'), nullable=False)
    word_id = db.Column(db.Integer, db.ForeignKey('custom_vocabularies.id'), nullable=False)
    question_type = db.Column(db.String(50), nullable=False)
    user_answer = db.Column(db.Text, nullable=True)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    answered_at = db.Column(db.DateTime, nullable=True)

    attempt = db.relationship('CustomQuizAttempt', backref=db.backref('questions', lazy=True))
    word = db.relationship('CustomVocabulary', backref=db.backref('quiz_questions', lazy=True))
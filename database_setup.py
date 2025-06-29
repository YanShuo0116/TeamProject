
import os
import pandas as pd
from app import app, db
from models import User, Vocabulary, SystemSetting

# Constants
DATABASE_FILE = 'learning_platform.db'
VOCABULARY_CSV = '國小英文教材/基礎1200單字/國小1200基礎單字每日學習表.csv'

def create_database():
    """Creates the database and all tables."""
    with app.app_context():
        db.create_all()

def create_admin_user():
    """Creates a default admin user."""
    with app.app_context():
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', email='admin@example.com', role='admin')
            admin.set_password('admin')
            db.session.add(admin)
            db.session.commit()
            print("Admin user created.")
        else:
            print("Admin user already exists.")

def import_vocabulary():
    """Imports vocabulary from a CSV file."""
    if not os.path.exists(VOCABULARY_CSV):
        print(f"Vocabulary file not found at: {VOCABULARY_CSV}")
        return

    with app.app_context():
        if Vocabulary.query.first():
            print("Vocabulary already imported.")
            return

        df = pd.read_csv(VOCABULARY_CSV)
        for index, row in df.iterrows():
            for i in range(1, 8):
                english_col = f'英文{i}'
                chinese_col = f'中文{i}'

                if english_col in row and pd.notna(row[english_col]):
                    word_to_add = row[english_col]
                    existing_word = Vocabulary.query.filter_by(word=word_to_add).first()
                    if not existing_word:
                        word = Vocabulary(
                            word=word_to_add,
                            chinese_translation=row[chinese_col] if chinese_col in row and pd.notna(row[chinese_col]) else ''
                        )
                        db.session.add(word)
        db.session.commit()
        print("Vocabulary imported.")

def set_default_settings():
    """Sets default system settings."""
    with app.app_context():
        settings = {
            'site_name': 'My English Learning Platform',
            'welcome_message': 'Welcome to your English learning journey!'
        }
        for key, value in settings.items():
            if not SystemSetting.query.filter_by(key=key).first():
                setting = SystemSetting(key=key, value=value)
                db.session.add(setting)
        db.session.commit()
        print("Default settings created.")

if __name__ == '__main__':
    if os.path.exists(DATABASE_FILE):
        print(f"Database file '{DATABASE_FILE}' already exists.")
        print("To re-initialize, please delete the file and run this script again.")
    else:
        print("Initializing database...")
        create_database()
        create_admin_user()
        import_vocabulary()
        set_default_settings()
        print("Database initialization complete.")


from flask import Blueprint, render_template, abort
from flask_login import login_required, current_user
from functools import wraps
from models import db, User, Composition, LearningRecord, Vocabulary

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def admin_required(f):
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if current_user.role != 'admin':
            abort(403)
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    total_users = User.query.count()
    total_compositions = Composition.query.count()
    total_learning_records = LearningRecord.query.count()
    total_vocabulary = Vocabulary.query.count()

    stats = {
        'total_users': total_users,
        'total_compositions': total_compositions,
        'total_learning_records': total_learning_records,
        'total_vocabulary': total_vocabulary
    }
    return render_template('admin_dashboard.html', stats=stats)

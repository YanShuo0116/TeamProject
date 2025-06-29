from flask import Blueprint, render_template, abort, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from functools import wraps
from models import db, User, Composition, LearningRecord, Vocabulary, VocabularyProgress, LessonProgress, AdminLog
from datetime import datetime, timedelta
from sqlalchemy import func

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
    # Basic statistics
    total_users = User.query.count()
    total_compositions = Composition.query.count()
    total_learning_records = LearningRecord.query.count()
    total_vocabulary = Vocabulary.query.count()
    
    # Learning progress statistics
    total_lesson_progress = LessonProgress.query.count()
    completed_lessons = LessonProgress.query.filter_by(is_completed=True).count()
    
    # Active users in the last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    active_users_week = User.query.join(LearningRecord).filter(
        LearningRecord.timestamp >= week_ago
    ).distinct().count()
    
    # Most popular learning activities
    popular_activities = db.session.query(
        LearningRecord.activity_type,
        func.count(LearningRecord.id).label('count')
    ).group_by(LearningRecord.activity_type).order_by(
        func.count(LearningRecord.id).desc()
    ).limit(5).all()
    
    # Recent learning records
    recent_records = LearningRecord.query.order_by(
        LearningRecord.timestamp.desc()
    ).limit(10).all()

    stats = {
        'total_users': total_users,
        'total_compositions': total_compositions,
        'total_learning_records': total_learning_records,
        'total_vocabulary': total_vocabulary,
        'total_lesson_progress': total_lesson_progress,
        'completed_lessons': completed_lessons,
        'active_users_week': active_users_week,
        'popular_activities': popular_activities,
        'recent_records': recent_records
    }
    
    # Log admin action
    log_admin_action("Viewed admin dashboard")
    
    return render_template('admin_dashboard.html', stats=stats)

@admin_bp.route('/users')
@admin_required
def users():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    users = User.query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    log_admin_action(f"Viewed users list (page {page})")
    
    return render_template('admin_users.html', users=users)

@admin_bp.route('/user/<int:user_id>')
@admin_required
def user_detail(user_id):
    user = db.session.get(User, user_id)
    if not user:
        abort(404)
    
    # User learning statistics
    learning_records = LearningRecord.query.filter_by(user_id=user_id).order_by(
        LearningRecord.timestamp.desc()
    ).limit(20).all()
    
    lesson_progress = LessonProgress.query.filter_by(user_id=user_id).all()
    vocabulary_progress = VocabularyProgress.query.filter_by(user_id=user_id).count()
    
    user_stats = {
        'total_learning_records': len(learning_records),
        'total_lesson_progress': len(lesson_progress),
        'completed_lessons': len([lp for lp in lesson_progress if lp.is_completed]),
        'vocabulary_progress': vocabulary_progress
    }
    
    log_admin_action(f"Viewed user details: {user.username}")
    
    return render_template('admin_user_detail.html', 
                         user=user, 
                         user_stats=user_stats,
                         learning_records=learning_records,
                         lesson_progress=lesson_progress)

@admin_bp.route('/analytics')
@admin_required
def analytics():
    # Learning activity trends (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_activity = db.session.query(
        func.date(LearningRecord.timestamp).label('date'),
        func.count(LearningRecord.id).label('count')
    ).filter(
        LearningRecord.timestamp >= thirty_days_ago
    ).group_by(
        func.date(LearningRecord.timestamp)
    ).order_by('date').all()
    
    # User registration trends
    daily_registrations = db.session.query(
        func.date(User.created_at).label('date'),
        func.count(User.id).label('count')
    ).filter(
        User.created_at >= thirty_days_ago
    ).group_by(
        func.date(User.created_at)
    ).order_by('date').all()
    
    # Lesson completion statistics
    lesson_completion_stats = db.session.query(
        LessonProgress.theme_name,
        LessonProgress.lesson_name,
        func.count(LessonProgress.id).label('total_attempts'),
        func.sum(func.cast(LessonProgress.is_completed, db.Integer)).label('completed')
    ).group_by(
        LessonProgress.theme_name,
        LessonProgress.lesson_name
    ).all()
    
    log_admin_action("Viewed analytics report")
    
    return render_template('admin_analytics.html',
                         daily_activity=daily_activity,
                         daily_registrations=daily_registrations,
                         lesson_completion_stats=lesson_completion_stats)

@admin_bp.route('/settings', methods=['GET', 'POST'])
@admin_required
def settings():
    if request.method == 'POST':
        # Handle settings updates
        action = request.form.get('action')
        
        if action == 'reset_user_progress':
            user_id = request.form.get('user_id')
            if user_id:
                VocabularyProgress.query.filter_by(user_id=user_id).delete()
                LessonProgress.query.filter_by(user_id=user_id).delete()
                db.session.commit()
                log_admin_action(f"Reset progress for user {user_id}")
                flash('User progress has been reset', 'success')
        
        elif action == 'delete_user':
            user_id = request.form.get('user_id')
            user = db.session.get(User, user_id)
            if user and user.role != 'admin':
                # Delete related records
                VocabularyProgress.query.filter_by(user_id=user_id).delete()
                LessonProgress.query.filter_by(user_id=user_id).delete()
                LearningRecord.query.filter_by(user_id=user_id).delete()
                Composition.query.filter_by(user_id=user_id).delete()
                db.session.delete(user)
                db.session.commit()
                log_admin_action(f"Deleted user: {user.username}")
                flash('User has been deleted', 'success')
        
        return redirect(url_for('admin.settings'))
    
    # Get all users
    users = User.query.all()
    
    log_admin_action("Viewed system settings")
    
    return render_template('admin_settings.html', users=users)

@admin_bp.route('/logs')
@admin_required
def logs():
    page = request.args.get('page', 1, type=int)
    per_page = 50
    
    logs = AdminLog.query.order_by(AdminLog.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return render_template('admin_logs.html', logs=logs)

def log_admin_action(action):
    """Log admin actions"""
    admin_log = AdminLog(
        admin_id=current_user.id,
        action=action,
        timestamp=datetime.utcnow()
    )
    db.session.add(admin_log)
    db.session.commit()
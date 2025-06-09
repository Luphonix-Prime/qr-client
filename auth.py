from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash
from app import login_manager, db
from models import User, AuditLog
from datetime import datetime
import logging

auth_bp = Blueprint('auth', __name__)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        remember = bool(request.form.get('remember'))
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password) and user.is_active:
            login_user(user, remember=remember)
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Log the login
            audit_log = AuditLog(
                user_id=user.id,
                action='LOGIN',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                timestamp=datetime.utcnow()
            )
            db.session.add(audit_log)
            db.session.commit()
            
            next_page = request.args.get('next')
            if not next_page or not next_page.startswith('/'):
                next_page = url_for('dashboard')
            
            flash(f'Welcome back, {user.first_name or user.username}!', 'success')
            return redirect(next_page)
        else:
            flash('Invalid username or password.', 'error')
    
    return render_template('login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    # Log the logout
    audit_log = AuditLog(
        user_id=current_user.id,
        action='LOGOUT',
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent'),
        timestamp=datetime.utcnow()
    )
    db.session.add(audit_log)
    db.session.commit()
    
    logout_user()
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('auth.login'))

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    # Only allow registration if no users exist (first admin) or current user is admin
    user_count = User.query.count()
    if user_count > 0 and (not current_user.is_authenticated or not current_user.has_role('Admin')):
        flash('Registration is restricted. Contact your administrator.', 'error')
        return redirect(url_for('auth.login'))
    
    if request.method == 'POST':
        try:
            username = request.form['username']
            email = request.form['email']
            password = request.form['password']
            confirm_password = request.form['confirm_password']
            first_name = request.form.get('first_name', '')
            last_name = request.form.get('last_name', '')
            role = request.form.get('role', 'Factory')
            
            # Validation
            if password != confirm_password:
                flash('Passwords do not match.', 'error')
                return render_template('login.html', show_register=True)
            
            if User.query.filter_by(username=username).first():
                flash('Username already exists.', 'error')
                return render_template('login.html', show_register=True)
            
            if User.query.filter_by(email=email).first():
                flash('Email already registered.', 'error')
                return render_template('login.html', show_register=True)
            
            # Create user
            user = User(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=role if user_count == 0 else 'Factory'  # First user is admin
            )
            user.set_password(password)
            
            # First user gets admin role
            if user_count == 0:
                user.role = 'Admin'
            
            db.session.add(user)
            db.session.commit()
            
            # Log the registration
            audit_log = AuditLog(
                user_id=user.id,
                action='REGISTER',
                new_values=f'{{"username": "{username}", "email": "{email}", "role": "{user.role}"}}',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                timestamp=datetime.utcnow()
            )
            db.session.add(audit_log)
            db.session.commit()
            
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('auth.login'))
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Registration error: {str(e)}")
            flash('Registration failed. Please try again.', 'error')
    
    return render_template('login.html', show_register=True)

@auth_bp.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    if request.method == 'POST':
        current_password = request.form['current_password']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']
        
        if not current_user.check_password(current_password):
            flash('Current password is incorrect.', 'error')
            return redirect(url_for('auth.change_password'))
        
        if new_password != confirm_password:
            flash('New passwords do not match.', 'error')
            return redirect(url_for('auth.change_password'))
        
        current_user.set_password(new_password)
        db.session.commit()
        
        # Log password change
        audit_log = AuditLog(
            user_id=current_user.id,
            action='CHANGE_PASSWORD',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            timestamp=datetime.utcnow()
        )
        db.session.add(audit_log)
        db.session.commit()
        
        flash('Password changed successfully.', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('login.html', show_change_password=True)

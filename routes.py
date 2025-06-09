from flask import render_template, request, redirect, url_for, flash, jsonify, session, send_file
from flask_login import login_required, current_user
from app import app, db
from models import User, Product, QRBatch, QRCode, PrinterConfig, ScannerConfig, MappingLevel, AuditLog, Report
from auth import auth_bp
from utils import generate_qr_codes, export_to_csv, import_from_csv, log_audit
import json
from datetime import datetime, timedelta
import os

# Register auth blueprint
app.register_blueprint(auth_bp, url_prefix='/auth')

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('auth.login'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Dashboard statistics
    stats = {
        'total_products': Product.query.filter_by(is_active=True).count(),
        'total_qr_codes': QRCode.query.count(),
        'active_batches': QRBatch.query.filter_by(status='Pending').count(),
        'recent_print_jobs': db.session.query(db.func.count()).select_from(
            db.session.query(QRCode.id).filter(
                QRCode.created_at >= datetime.utcnow() - timedelta(days=7)
            ).subquery()
        ).scalar() or 0
    }
    
    # Recent activities
    recent_batches = QRBatch.query.order_by(QRBatch.created_at.desc()).limit(5).all()
    recent_products = Product.query.order_by(Product.created_at.desc()).limit(5).all()
    
    return render_template('dashboard.html', 
                         stats=stats, 
                         recent_batches=recent_batches,
                         recent_products=recent_products)

@app.route('/admin')
@login_required
def admin_panel():
    if not current_user.has_role('Admin'):
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('dashboard'))
    
    users = User.query.all()
    system_stats = {
        'total_users': len(users),
        'active_users': len([u for u in users if u.is_active]),
        'total_products': Product.query.count(),
        'total_qr_codes': QRCode.query.count()
    }
    
    return render_template('admin_panel.html', users=users, stats=system_stats)

@app.route('/products')
@login_required
def product_master():
    products = Product.query.filter_by(is_active=True).all()
    return render_template('product_master.html', products=products)

@app.route('/products/new', methods=['GET', 'POST'])
@login_required
def new_product():
    if request.method == 'POST':
        try:
            product = Product(
                sku=request.form['sku'],
                name=request.form['name'],
                description=request.form.get('description', ''),
                category=request.form.get('category', ''),
                unit_price=float(request.form.get('unit_price', 0)),
                weight=float(request.form.get('weight', 0)) if request.form.get('weight') else None,
                dimensions=request.form.get('dimensions', ''),
                batch_size=int(request.form.get('batch_size', 100)),
                created_by=current_user.id
            )
            
            db.session.add(product)
            db.session.commit()
            
            log_audit('CREATE', 'products', product.id, {}, request.form.to_dict())
            flash('Product created successfully!', 'success')
            return redirect(url_for('product_master'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating product: {str(e)}', 'error')
    
    return render_template('product_master.html', products=Product.query.filter_by(is_active=True).all())

@app.route('/qr-generation')
@login_required
def qr_generation():
    products = Product.query.filter_by(is_active=True).all()
    batches = QRBatch.query.order_by(QRBatch.created_at.desc()).limit(20).all()
    return render_template('qr_generation.html', products=products, batches=batches)

@app.route('/generate-qr-batch', methods=['POST'])
@login_required
def generate_qr_batch():
    try:
        product_id = int(request.form['product_id'])
        quantity = int(request.form['quantity'])
        batch_code = request.form['batch_code']
        
        product = Product.query.get_or_404(product_id)
        
        # Create batch
        batch = QRBatch(
            batch_code=batch_code,
            product_id=product_id,
            quantity=quantity,
            created_by=current_user.id
        )
        
        db.session.add(batch)
        db.session.flush()  # Get batch ID
        
        # Generate QR codes
        qr_codes_data = generate_qr_codes(product, batch, quantity)
        
        for qr_data in qr_codes_data:
            qr_code = QRCode(
                code=qr_data['code'],
                data=qr_data['data'],
                product_id=product_id,
                batch_id=batch.id,
                serial_number=qr_data['serial_number'],
                qr_image_path=qr_data['image_path']
            )
            db.session.add(qr_code)
        
        batch.status = 'Generated'
        batch.generated_at = datetime.utcnow()
        
        db.session.commit()
        
        log_audit('GENERATE_QR_BATCH', 'qr_batches', batch.id, {}, {
            'product_id': product_id,
            'quantity': quantity,
            'batch_code': batch_code
        })
        
        flash(f'Successfully generated {quantity} QR codes for batch {batch_code}', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'Error generating QR batch: {str(e)}', 'error')
    
    return redirect(url_for('qr_generation'))

@app.route('/printing')
@login_required
def printing_interface():
    printers = PrinterConfig.query.filter_by(is_active=True).all()
    batches = QRBatch.query.filter_by(status='Generated').all()
    return render_template('printing_interface.html', printers=printers, batches=batches)

@app.route('/mapping')
@login_required
def mapping_dashboard():
    products = Product.query.filter_by(is_active=True).all()
    mappings = MappingLevel.query.order_by(MappingLevel.created_at.desc()).limit(50).all()
    return render_template('mapping_dashboard.html', products=products, mappings=mappings)

@app.route('/device-config')
@login_required
def device_config():
    if not current_user.has_role('Admin'):
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('dashboard'))
    
    printers = PrinterConfig.query.all()
    scanners = ScannerConfig.query.all()
    return render_template('device_config.html', printers=printers, scanners=scanners)

@app.route('/reports')
@login_required
def reports():
    user_reports = Report.query.filter_by(created_by=current_user.id).order_by(Report.created_at.desc()).all()
    return render_template('reports.html', reports=user_reports)

@app.route('/rewinding-guidelines')
@login_required
def rewinding_guidelines():
    return render_template('rewinding_guidelines.html')

# API Routes for AJAX operations
@app.route('/api/products/<int:product_id>')
@login_required
def api_get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify({
        'id': product.id,
        'sku': product.sku,
        'name': product.name,
        'batch_size': product.batch_size
    })

@app.route('/api/qr-batch/<int:batch_id>/status')
@login_required
def api_batch_status(batch_id):
    batch = QRBatch.query.get_or_404(batch_id)
    qr_count = QRCode.query.filter_by(batch_id=batch_id).count()
    
    return jsonify({
        'status': batch.status,
        'quantity': batch.quantity,
        'generated_count': qr_count,
        'created_at': batch.created_at.isoformat(),
        'generated_at': batch.generated_at.isoformat() if batch.generated_at else None
    })

@app.route('/api/print-job', methods=['POST'])
@login_required
def api_create_print_job():
    try:
        data = request.get_json()
        printer_id = data.get('printer_id')
        batch_id = data.get('batch_id')
        quantity = data.get('quantity')
        
        # Validate inputs
        printer = PrinterConfig.query.get_or_404(printer_id)
        batch = QRBatch.query.get_or_404(batch_id)
        
        # Create print job (actual printing would be implemented based on printer type)
        job_id = f"PRINT_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{batch_id}"
        
        # Here you would implement actual printer communication
        # For now, we'll simulate the process
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': f'Print job created for {quantity} QR codes'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/export-csv/<string:export_type>')
@login_required
def api_export_csv(export_type):
    try:
        file_path = export_to_csv(export_type, current_user.id)
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('base.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('base.html'), 500

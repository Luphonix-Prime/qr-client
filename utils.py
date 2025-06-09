import qrcode
import json
import csv
import os
from io import StringIO
from datetime import datetime
from flask import request
from app import db
from models import Product, QRCode, AuditLog, User, QRBatch
from PIL import Image
import uuid

def generate_qr_codes(product, batch, quantity):
    """Generate QR codes for a product batch"""
    qr_codes_data = []
    
    # Create QR codes directory if it doesn't exist
    qr_dir = 'static/qr_codes'
    if not os.path.exists(qr_dir):
        os.makedirs(qr_dir)
    
    for i in range(quantity):
        # Generate unique code
        serial_number = f"{product.sku}-{batch.batch_code}-{str(i+1).zfill(6)}"
        
        # Create QR data
        qr_data = {
            'product_sku': product.sku,
            'product_name': product.name,
            'batch_code': batch.batch_code,
            'serial_number': serial_number,
            'created_at': datetime.utcnow().isoformat(),
            'company': 'QR System',
            'verification_url': f'/verify/{serial_number}'
        }
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(json.dumps(qr_data))
        qr.make(fit=True)
        
        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save image
        filename = f"qr_{serial_number}.png"
        filepath = os.path.join(qr_dir, filename)
        img.save(filepath)
        
        qr_codes_data.append({
            'code': serial_number,
            'data': json.dumps(qr_data),
            'serial_number': serial_number,
            'image_path': filepath
        })
    
    return qr_codes_data

def export_to_csv(export_type, user_id):
    """Export data to CSV"""
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    
    # Create exports directory if it doesn't exist
    export_dir = 'static/exports'
    if not os.path.exists(export_dir):
        os.makedirs(export_dir)
    
    if export_type == 'products':
        filename = f'products_export_{timestamp}.csv'
        filepath = os.path.join(export_dir, filename)
        
        products = Product.query.filter_by(is_active=True).all()
        
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['SKU', 'Name', 'Description', 'Category', 'Unit Price', 'Weight', 'Dimensions', 'Batch Size']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for product in products:
                writer.writerow({
                    'SKU': product.sku,
                    'Name': product.name,
                    'Description': product.description or '',
                    'Category': product.category or '',
                    'Unit Price': float(product.unit_price) if product.unit_price else 0,
                    'Weight': product.weight or 0,
                    'Dimensions': product.dimensions or '',
                    'Batch Size': product.batch_size
                })
    
    elif export_type == 'qr_codes':
        filename = f'qr_codes_export_{timestamp}.csv'
        filepath = os.path.join(export_dir, filename)
        
        qr_codes = QRCode.query.join(Product).all()
        
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['Code', 'Product SKU', 'Product Name', 'Serial Number', 'Status', 'Created At']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for qr in qr_codes:
                writer.writerow({
                    'Code': qr.code,
                    'Product SKU': qr.product.sku,
                    'Product Name': qr.product.name,
                    'Serial Number': qr.serial_number,
                    'Status': qr.status,
                    'Created At': qr.created_at.strftime('%Y-%m-%d %H:%M:%S')
                })
    
    elif export_type == 'batches':
        filename = f'batches_export_{timestamp}.csv'
        filepath = os.path.join(export_dir, filename)
        
        batches = QRBatch.query.join(Product).all()
        
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['Batch Code', 'Product SKU', 'Product Name', 'Quantity', 'Status', 'Created At', 'Generated At']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for batch in batches:
                writer.writerow({
                    'Batch Code': batch.batch_code,
                    'Product SKU': batch.product.sku,
                    'Product Name': batch.product.name,
                    'Quantity': batch.quantity,
                    'Status': batch.status,
                    'Created At': batch.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'Generated At': batch.generated_at.strftime('%Y-%m-%d %H:%M:%S') if batch.generated_at else ''
                })
    
    return filepath

def import_from_csv(file_path, import_type):
    """Import data from CSV"""
    results = {'success': 0, 'errors': []}
    
    try:
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            if import_type == 'products':
                for row_num, row in enumerate(reader, start=2):
                    try:
                        # Check if product already exists
                        existing = Product.query.filter_by(sku=row['SKU']).first()
                        if existing:
                            results['errors'].append(f"Row {row_num}: Product with SKU '{row['SKU']}' already exists")
                            continue
                        
                        product = Product(
                            sku=row['SKU'],
                            name=row['Name'],
                            description=row.get('Description', ''),
                            category=row.get('Category', ''),
                            unit_price=float(row.get('Unit Price', 0)) if row.get('Unit Price') else None,
                            weight=float(row.get('Weight', 0)) if row.get('Weight') else None,
                            dimensions=row.get('Dimensions', ''),
                            batch_size=int(row.get('Batch Size', 100))
                        )
                        
                        db.session.add(product)
                        results['success'] += 1
                        
                    except Exception as e:
                        results['errors'].append(f"Row {row_num}: {str(e)}")
            
            db.session.commit()
            
    except Exception as e:
        db.session.rollback()
        results['errors'].append(f"File processing error: {str(e)}")
    
    return results

def log_audit(action, table_name=None, record_id=None, old_values=None, new_values=None):
    """Log audit trail"""
    try:
        from flask_login import current_user
        
        audit_log = AuditLog(
            user_id=current_user.id if current_user.is_authenticated else None,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            ip_address=request.remote_addr if request else None,
            user_agent=request.headers.get('User-Agent') if request else None,
            timestamp=datetime.utcnow()
        )
        
        db.session.add(audit_log)
        db.session.commit()
        
    except Exception as e:
        print(f"Audit log error: {str(e)}")

def validate_ip_address(ip):
    """Validate IP address format"""
    try:
        parts = ip.split('.')
        if len(parts) != 4:
            return False
        for part in parts:
            if not 0 <= int(part) <= 255:
                return False
        return True
    except:
        return False

def generate_batch_code():
    """Generate unique batch code"""
    timestamp = datetime.utcnow().strftime('%Y%m%d')
    unique_id = str(uuid.uuid4())[:8].upper()
    return f"BATCH_{timestamp}_{unique_id}"

def format_file_size(size_bytes):
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0B"
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    return f"{size_bytes:.1f}{size_names[i]}"

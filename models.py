from datetime import datetime
from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Numeric

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='Factory')  # Admin, Factory, QA
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    products = db.relationship('Product', backref='created_by_user', lazy=True)
    qr_batches = db.relationship('QRBatch', backref='created_by_user', lazy=True)
    
    @property
    def is_active(self):
        return self.active
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def has_role(self, role):
        return self.role == role
    
    def __repr__(self):
        return f'<User {self.username}>'

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))
    unit_price = db.Column(Numeric(10, 2))
    weight = db.Column(db.Float)
    dimensions = db.Column(db.String(100))
    batch_size = db.Column(db.Integer, default=100)
    qr_template = db.Column(db.Text)  # JSON template for QR code data
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    qr_codes = db.relationship('QRCode', backref='product', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Product {self.sku}>'

class QRBatch(db.Model):
    __tablename__ = 'qr_batches'
    
    id = db.Column(db.Integer, primary_key=True)
    batch_code = db.Column(db.String(50), unique=True, nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='Pending')  # Pending, Generated, Printed, Completed
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    generated_at = db.Column(db.DateTime)
    printed_at = db.Column(db.DateTime)
    
    # Relationships
    product = db.relationship('Product', backref='batches')
    qr_codes = db.relationship('QRCode', backref='batch', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<QRBatch {self.batch_code}>'

class QRCode(db.Model):
    __tablename__ = 'qr_codes'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(200), unique=True, nullable=False)
    data = db.Column(db.Text, nullable=False)  # JSON data encoded in QR
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    batch_id = db.Column(db.Integer, db.ForeignKey('qr_batches.id'))
    serial_number = db.Column(db.String(100))
    status = db.Column(db.String(20), default='Generated')  # Generated, Printed, Scanned, Used
    qr_image_path = db.Column(db.String(500))  # Path to QR code image file
    print_count = db.Column(db.Integer, default=0)
    last_scanned = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<QRCode {self.code}>'

class PrinterConfig(db.Model):
    __tablename__ = 'printer_configs'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    port = db.Column(db.Integer, default=9100)
    printer_type = db.Column(db.String(50))  # Thermal, Inkjet, Laser
    paper_size = db.Column(db.String(20))
    dpi = db.Column(db.Integer, default=203)
    is_active = db.Column(db.Boolean, default=True)
    is_default = db.Column(db.Boolean, default=False)
    settings = db.Column(db.Text)  # JSON settings
    last_used = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    print_jobs = db.relationship('PrintJob', backref='printer', lazy=True)
    
    def __repr__(self):
        return f'<PrinterConfig {self.name}>'

class PrintJob(db.Model):
    __tablename__ = 'print_jobs'
    
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.String(50), unique=True, nullable=False)
    printer_id = db.Column(db.Integer, db.ForeignKey('printer_configs.id'), nullable=False)
    batch_id = db.Column(db.Integer, db.ForeignKey('qr_batches.id'))
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='Queued')  # Queued, Printing, Completed, Failed
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    error_message = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<PrintJob {self.job_id}>'

class ScannerConfig(db.Model):
    __tablename__ = 'scanner_configs'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    port = db.Column(db.Integer, default=8080)
    scanner_type = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    settings = db.Column(db.Text)  # JSON settings
    last_used = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ScannerConfig {self.name}>'

class MappingLevel(db.Model):
    __tablename__ = 'mapping_levels'
    
    id = db.Column(db.Integer, primary_key=True)
    level = db.Column(db.Integer, nullable=False)  # 2, 3, or 4 level mapping
    parent_id = db.Column(db.Integer, db.ForeignKey('mapping_levels.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    qr_code_id = db.Column(db.Integer, db.ForeignKey('qr_codes.id'))
    mapping_data = db.Column(db.Text)  # JSON mapping data
    status = db.Column(db.String(20), default='Active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Self-referential relationship for hierarchical mapping
    children = db.relationship('MappingLevel', backref=db.backref('parent', remote_side=[id]))
    
    def __repr__(self):
        return f'<MappingLevel {self.level}>'

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(100), nullable=False)
    table_name = db.Column(db.String(50))
    record_id = db.Column(db.Integer)
    old_values = db.Column(db.Text)  # JSON
    new_values = db.Column(db.Text)  # JSON
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='audit_logs')
    
    def __repr__(self):
        return f'<AuditLog {self.action}>'

class Report(db.Model):
    __tablename__ = 'reports'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    report_type = db.Column(db.String(50), nullable=False)  # Production, Quality, Inventory, etc.
    parameters = db.Column(db.Text)  # JSON parameters
    file_path = db.Column(db.String(500))
    status = db.Column(db.String(20), default='Pending')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    generated_at = db.Column(db.DateTime)
    
    # Relationship
    user = db.relationship('User', backref='reports')
    
    def __repr__(self):
        return f'<Report {self.name}>'

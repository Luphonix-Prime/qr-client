// QR Code Operations JavaScript

class QROperations {
    constructor() {
        this.selectedBatch = null;
        this.qrCodes = [];
        this.scannerActive = false;
        this.initializeOperations();
    }

    initializeOperations() {
        this.setupQRGeneration();
        this.setupBatchOperations();
        this.setupQRScanning();
        this.setupBatchTracking();
    }

    setupQRGeneration() {
        // Generate batch code functionality
        const generateBatchBtn = document.getElementById('generateBatchCode');
        if (generateBatchBtn) {
            generateBatchBtn.addEventListener('click', () => {
                this.generateBatchCode();
            });
        }

        // Product selection handler
        const productSelect = document.getElementById('product_id');
        if (productSelect) {
            productSelect.addEventListener('change', (e) => {
                this.updateProductInfo(e.target.value);
            });
        }

        // Quantity validation
        const quantityInput = document.getElementById('quantity');
        if (quantityInput) {
            quantityInput.addEventListener('input', (e) => {
                this.validateQuantity(e.target.value);
            });
        }
    }

    setupBatchOperations() {
        // Batch selection handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-batch-action]')) {
                const action = e.target.dataset.batchAction;
                const batchId = e.target.dataset.batchId;
                this.handleBatchAction(action, batchId);
            }
        });

        // Batch status monitoring
        this.startBatchStatusMonitoring();
    }

    setupQRScanning() {
        // Initialize QR scanner if available
        if (typeof Html5QrcodeScanner !== 'undefined') {
            this.initializeQRScanner();
        }

        // Manual QR input handler
        const qrInput = document.getElementById('manualQRInput');
        if (qrInput) {
            qrInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.processScannedQR(e.target.value);
                    e.target.value = '';
                }
            });
        }
    }

    setupBatchTracking() {
        // Real-time batch tracking
        this.batchUpdateInterval = setInterval(() => {
            this.updateBatchStatuses();
        }, 30000); // Update every 30 seconds
    }

    generateBatchCode() {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        const batchCode = `BATCH_${dateStr}_${timeStr}_${randomStr}`;
        
        const batchCodeInput = document.getElementById('batch_code');
        if (batchCodeInput) {
            batchCodeInput.value = batchCode;
        }
        
        return batchCode;
    }

    updateProductInfo(productId) {
        if (!productId) {
            this.hideProductInfo();
            return;
        }

        // Make AJAX request to get product details
        window.QRSystem.makeRequest(`/api/products/${productId}`)
            .then(product => {
                this.displayProductInfo(product);
            })
            .catch(error => {
                console.error('Failed to load product info:', error);
                this.hideProductInfo();
            });
    }

    displayProductInfo(product) {
        const productInfo = document.getElementById('productInfo');
        const productDetails = document.getElementById('productDetails');
        const quantityInput = document.getElementById('quantity');
        
        if (productInfo && productDetails) {
            productDetails.innerHTML = `
                <strong>SKU:</strong> ${product.sku}<br>
                <strong>Name:</strong> ${product.name}<br>
                <strong>Default Batch Size:</strong> ${product.batch_size} units
            `;
            
            productInfo.classList.remove('d-none');
        }
        
        if (quantityInput && product.batch_size) {
            quantityInput.value = product.batch_size;
        }
    }

    hideProductInfo() {
        const productInfo = document.getElementById('productInfo');
        if (productInfo) {
            productInfo.classList.add('d-none');
        }
    }

    validateQuantity(quantity) {
        const quantityNum = parseInt(quantity);
        const feedback = document.getElementById('quantityFeedback');
        
        if (quantityNum < 1 || quantityNum > 10000) {
            if (feedback) {
                feedback.textContent = 'Quantity must be between 1 and 10,000';
                feedback.className = 'invalid-feedback d-block';
            }
            return false;
        } else {
            if (feedback) {
                feedback.textContent = '';
                feedback.className = 'invalid-feedback';
            }
            return true;
        }
    }

    handleBatchAction(action, batchId) {
        switch (action) {
            case 'view':
                this.viewBatchDetails(batchId);
                break;
            case 'print':
                this.printBatch(batchId);
                break;
            case 'download':
                this.downloadBatch(batchId);
                break;
            case 'delete':
                this.deleteBatch(batchId);
                break;
            default:
                console.warn('Unknown batch action:', action);
        }
    }

    viewBatchDetails(batchId) {
        window.QRSystem.makeRequest(`/api/qr-batch/${batchId}/status`)
            .then(batch => {
                this.displayBatchModal(batch);
            })
            .catch(error => {
                window.QRSystem.showError('Failed to load batch details');
            });
    }

    displayBatchModal(batch) {
        const modalContent = document.getElementById('batchDetailsContent');
        if (modalContent) {
            modalContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Batch Information</h6>
                        <table class="table table-borderless">
                            <tr><td><strong>Status:</strong></td><td><span class="badge bg-${this.getStatusColor(batch.status)}">${batch.status}</span></td></tr>
                            <tr><td><strong>Quantity:</strong></td><td>${batch.quantity}</td></tr>
                            <tr><td><strong>Generated:</strong></td><td>${batch.generated_count}</td></tr>
                            <tr><td><strong>Created:</strong></td><td>${new Date(batch.created_at).toLocaleString()}</td></tr>
                            ${batch.generated_at ? `<tr><td><strong>Generated At:</strong></td><td>${new Date(batch.generated_at).toLocaleString()}</td></tr>` : ''}
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Progress</h6>
                        <div class="progress mb-3">
                            <div class="progress-bar" role="progressbar" style="width: ${(batch.generated_count / batch.quantity) * 100}%" 
                                 aria-valuenow="${batch.generated_count}" aria-valuemin="0" aria-valuemax="${batch.quantity}">
                                ${Math.round((batch.generated_count / batch.quantity) * 100)}%
                            </div>
                        </div>
                        <div class="text-center">
                            <small class="text-muted">${batch.generated_count} of ${batch.quantity} QR codes generated</small>
                        </div>
                    </div>
                </div>
            `;
            
            const modal = new bootstrap.Modal(document.getElementById('batchDetailsModal'));
            modal.show();
        }
    }

    getStatusColor(status) {
        const colors = {
            'Pending': 'warning',
            'Generated': 'success',
            'Printed': 'info',
            'Completed': 'primary',
            'Failed': 'danger'
        };
        
        return colors[status] || 'secondary';
    }

    printBatch(batchId) {
        // Redirect to printing interface with pre-selected batch
        window.location.href = `/printing?batch_id=${batchId}`;
    }

    downloadBatch(batchId) {
        // Trigger batch download
        const downloadUrl = `/api/download-batch/${batchId}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `batch_${batchId}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    deleteBatch(batchId) {
        if (confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
            window.QRSystem.makeRequest(`/api/qr-batch/${batchId}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (response.success) {
                    window.QRSystem.showSuccess('Batch deleted successfully');
                    // Remove batch from UI
                    const batchElement = document.getElementById(`batch-${batchId}`);
                    if (batchElement) {
                        batchElement.remove();
                    }
                } else {
                    window.QRSystem.showError(response.error || 'Failed to delete batch');
                }
            })
            .catch(error => {
                window.QRSystem.showError('Failed to delete batch');
            });
        }
    }

    initializeQRScanner() {
        const scannerElement = document.getElementById('qr-scanner');
        if (!scannerElement) return;

        this.qrScanner = new Html5QrcodeScanner(
            'qr-scanner',
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            false
        );

        this.qrScanner.render(
            (decodedText, decodedResult) => {
                this.processScannedQR(decodedText);
            },
            (error) => {
                // Handle scan errors silently
                console.debug('QR scan error:', error);
            }
        );
    }

    processScannedQR(qrData) {
        try {
            // Try to parse QR data as JSON
            const qrInfo = JSON.parse(qrData);
            this.handleScannedQRCode(qrInfo);
        } catch (e) {
            // If not JSON, treat as plain text
            this.handleScannedQRCode({ code: qrData });
        }
    }

    handleScannedQRCode(qrInfo) {
        // Verify QR code in database
        window.QRSystem.makeRequest('/api/verify-qr', {
            method: 'POST',
            body: JSON.stringify({ qr_data: qrInfo })
        })
        .then(response => {
            if (response.valid) {
                this.displayQRVerification(response.qr_code, true);
                window.QRSystem.showSuccess('QR code verified successfully');
            } else {
                this.displayQRVerification(qrInfo, false);
                window.QRSystem.showError('QR code not found or invalid');
            }
        })
        .catch(error => {
            window.QRSystem.showError('Failed to verify QR code');
        });
    }

    displayQRVerification(qrData, isValid) {
        const verificationContainer = document.getElementById('qrVerificationResult');
        if (!verificationContainer) return;

        const statusClass = isValid ? 'success' : 'danger';
        const statusIcon = isValid ? 'check-circle' : 'times-circle';

        verificationContainer.innerHTML = `
            <div class="alert alert-${statusClass}">
                <i class="fas fa-${statusIcon} me-2"></i>
                <strong>${isValid ? 'Valid' : 'Invalid'} QR Code</strong>
                <div class="mt-2">
                    <small><strong>Code:</strong> ${qrData.code || 'Unknown'}</small><br>
                    ${qrData.product_name ? `<small><strong>Product:</strong> ${qrData.product_name}</small><br>` : ''}
                    ${qrData.batch_code ? `<small><strong>Batch:</strong> ${qrData.batch_code}</small><br>` : ''}
                    <small><strong>Scanned:</strong> ${new Date().toLocaleString()}</small>
                </div>
            </div>
        `;

        // Add to scan history
        this.addToScanHistory(qrData, isValid);
    }

    addToScanHistory(qrData, isValid) {
        const historyContainer = document.getElementById('scanHistory');
        if (!historyContainer) return;

        const historyItem = document.createElement('div');
        historyItem.className = `border-start border-${isValid ? 'success' : 'danger'} ps-3 mb-2`;
        historyItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${qrData.code || 'Unknown'}</strong>
                    <div class="small text-muted">${new Date().toLocaleString()}</div>
                </div>
                <span class="badge bg-${isValid ? 'success' : 'danger'}">
                    ${isValid ? 'Valid' : 'Invalid'}
                </span>
            </div>
        `;

        historyContainer.insertBefore(historyItem, historyContainer.firstChild);

        // Keep only last 10 items
        while (historyContainer.children.length > 10) {
            historyContainer.removeChild(historyContainer.lastChild);
        }
    }

    updateBatchStatuses() {
        const batchElements = document.querySelectorAll('[data-batch-id]');
        
        batchElements.forEach(element => {
            const batchId = element.dataset.batchId;
            this.updateSingleBatchStatus(batchId);
        });
    }

    updateSingleBatchStatus(batchId) {
        window.QRSystem.makeRequest(`/api/qr-batch/${batchId}/status`)
            .then(batch => {
                this.updateBatchUI(batchId, batch);
            })
            .catch(error => {
                console.debug('Failed to update batch status:', batchId);
            });
    }

    updateBatchUI(batchId, batch) {
        const batchElement = document.getElementById(`batch-${batchId}`);
        if (!batchElement) return;

        // Update status badge
        const statusBadge = batchElement.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = `badge bg-${this.getStatusColor(batch.status)} status-badge`;
            statusBadge.textContent = batch.status;
        }

        // Update progress if applicable
        const progressBar = batchElement.querySelector('.progress-bar');
        if (progressBar) {
            const progress = (batch.generated_count / batch.quantity) * 100;
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${Math.round(progress)}%`;
        }
    }

    exportBatchData(format = 'csv') {
        const selectedBatches = this.getSelectedBatches();
        
        if (selectedBatches.length === 0) {
            window.QRSystem.showError('Please select at least one batch to export');
            return;
        }

        const exportUrl = `/api/export-batches?format=${format}&batches=${selectedBatches.join(',')}`;
        
        // Create temporary download link
        const link = document.createElement('a');
        link.href = exportUrl;
        link.download = `batch_export_${new Date().toISOString().slice(0, 10)}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    getSelectedBatches() {
        const checkboxes = document.querySelectorAll('input[name="batch_ids"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // Cleanup function
    destroy() {
        if (this.batchUpdateInterval) {
            clearInterval(this.batchUpdateInterval);
        }
        
        if (this.qrScanner) {
            this.qrScanner.clear();
        }
    }
}

// Initialize QR Operations when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.qrOperations = new QROperations();
});

// Export for use in other scripts
window.QROperations = QROperations;

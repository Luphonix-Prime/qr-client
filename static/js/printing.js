// Printing Operations JavaScript

class PrintingOperations {
    constructor() {
        this.selectedPrinter = null;
        this.selectedBatch = null;
        this.printJob = null;
        this.previewZoom = 100;
        this.printQueue = [];
        this.initializePrinting();
    }

    initializePrinting() {
        this.setupPrinterManagement();
        this.setupBatchSelection();
        this.setupPrintPreview();
        this.setupPrintQueue();
        this.startPrintStatusMonitoring();
    }

    setupPrinterManagement() {
        // Printer selection handler
        const printerSelect = document.getElementById('printer_select');
        if (printerSelect) {
            printerSelect.addEventListener('change', (e) => {
                this.selectPrinter(e.target.value);
            });
        }

        // Printer test buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="test-printer"]')) {
                const printerId = e.target.dataset.printerId;
                this.testPrinter(printerId);
            }
        });

        // Refresh printers button
        const refreshBtn = document.getElementById('refreshPrinters');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshPrinters();
            });
        }
    }

    setupBatchSelection() {
        // Batch selection handler
        const batchSelect = document.getElementById('batch_select');
        if (batchSelect) {
            batchSelect.addEventListener('change', (e) => {
                this.selectBatch(e.target.value);
            });
        }

        // Print range handler
        const printRange = document.getElementById('print_range');
        if (printRange) {
            printRange.addEventListener('change', (e) => {
                this.toggleCustomRange(e.target.value === 'range');
            });
        }
    }

    setupPrintPreview() {
        // Preview controls
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const zoomResetBtn = document.getElementById('zoomReset');

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomPreview(25));
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomPreview(-25));
        if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => this.resetZoom());

        // Print settings handlers
        const printSettings = document.querySelectorAll('#copies, #quality, #printPreview');
        printSettings.forEach(setting => {
            setting.addEventListener('change', () => {
                this.updatePrintPreview();
            });
        });
    }

    setupPrintQueue() {
        // Start print job button
        const startPrintBtn = document.getElementById('startPrintBtn');
        if (startPrintBtn) {
            startPrintBtn.addEventListener('click', () => {
                this.startPrintJob();
            });
        }

        // Queue management buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="cancel-job"]')) {
                const jobId = e.target.dataset.jobId;
                this.cancelPrintJob(jobId);
            }
            
            if (e.target.matches('[data-action="retry-job"]')) {
                const jobId = e.target.dataset.jobId;
                this.retryPrintJob(jobId);
            }
        });
    }

    selectPrinter(printerId) {
        if (!printerId) {
            this.selectedPrinter = null;
            this.hidePrinterInfo();
            this.updatePrintButton();
            return;
        }

        // Get printer details
        const printerOption = document.querySelector(`#printer_select option[value="${printerId}"]`);
        if (printerOption) {
            this.selectedPrinter = {
                id: printerId,
                name: printerOption.textContent,
                ip: printerOption.dataset.ip,
                type: printerOption.dataset.type,
                paper: printerOption.dataset.paper,
                dpi: printerOption.dataset.dpi
            };

            this.displayPrinterInfo();
            this.updatePrintButton();
            this.updatePrintPreview();
        }
    }

    displayPrinterInfo() {
        const printerInfo = document.getElementById('printerInfo');
        const printerDetails = document.getElementById('printerDetails');

        if (printerInfo && printerDetails && this.selectedPrinter) {
            printerDetails.innerHTML = `
                <strong>IP Address:</strong> ${this.selectedPrinter.ip}<br>
                <strong>Type:</strong> ${this.selectedPrinter.type}<br>
                <strong>Paper Size:</strong> ${this.selectedPrinter.paper}<br>
                <strong>DPI:</strong> ${this.selectedPrinter.dpi}
            `;
            printerInfo.classList.remove('d-none');
        }
    }

    hidePrinterInfo() {
        const printerInfo = document.getElementById('printerInfo');
        if (printerInfo) {
            printerInfo.classList.add('d-none');
        }
    }

    selectBatch(batchId) {
        if (!batchId) {
            this.selectedBatch = null;
            this.hideBatchInfo();
            this.updatePrintButton();
            return;
        }

        // Get batch details
        const batchOption = document.querySelector(`#batch_select option[value="${batchId}"]`);
        if (batchOption) {
            this.selectedBatch = {
                id: batchId,
                code: batchOption.textContent.split(' ')[0],
                quantity: parseInt(batchOption.dataset.quantity),
                product: batchOption.dataset.product,
                sku: batchOption.dataset.sku
            };

            this.displayBatchInfo();
            this.updatePrintButton();
            this.updatePrintPreview();
            this.updateRangeInputs();
        }
    }

    displayBatchInfo() {
        const batchInfo = document.getElementById('batchInfo');
        const batchDetails = document.getElementById('batchDetails');

        if (batchInfo && batchDetails && this.selectedBatch) {
            batchDetails.innerHTML = `
                <strong>Product:</strong> ${this.selectedBatch.sku}<br>
                <strong>Name:</strong> ${this.selectedBatch.product}<br>
                <strong>QR Codes:</strong> ${this.selectedBatch.quantity}
            `;
            batchInfo.classList.remove('d-none');
        }
    }

    hideBatchInfo() {
        const batchInfo = document.getElementById('batchInfo');
        if (batchInfo) {
            batchInfo.classList.add('d-none');
        }
    }

    updateRangeInputs() {
        if (!this.selectedBatch) return;

        const startIndex = document.getElementById('start_index');
        const endIndex = document.getElementById('end_index');

        if (startIndex) startIndex.value = 1;
        if (endIndex) endIndex.value = this.selectedBatch.quantity;
        
        // Set max values
        if (startIndex) startIndex.max = this.selectedBatch.quantity;
        if (endIndex) endIndex.max = this.selectedBatch.quantity;
    }

    toggleCustomRange(show) {
        const customRangeInputs = document.getElementById('customRangeInputs');
        if (customRangeInputs) {
            if (show) {
                customRangeInputs.classList.remove('d-none');
            } else {
                customRangeInputs.classList.add('d-none');
            }
        }
    }

    updatePrintButton() {
        const startBtn = document.getElementById('startPrintBtn');
        if (startBtn) {
            startBtn.disabled = !(this.selectedPrinter && this.selectedBatch);
        }
    }

    updatePrintPreview() {
        if (!this.selectedBatch) {
            this.clearPreview();
            return;
        }

        const previewArea = document.getElementById('printPreviewArea');
        if (!previewArea) return;

        const copies = document.getElementById('copies')?.value || 1;
        const quality = document.getElementById('quality')?.value || 'normal';

        previewArea.innerHTML = this.generatePreviewHTML(copies, quality);
        this.applyZoom();
    }

    generatePreviewHTML(copies, quality) {
        if (!this.selectedBatch) return '';

        const qualityClass = quality === 'high' ? 'high-quality' : quality === 'draft' ? 'draft-quality' : '';
        
        return `
            <div class="print-preview ${qualityClass}" style="background: white; color: black;">
                <div class="text-center mb-3">
                    <h6>Print Preview - ${this.selectedBatch.code}</h6>
                    <small class="text-muted">Copies: ${copies} | Quality: ${quality}</small>
                </div>
                <div class="preview-grid">
                    ${this.generateQRCodePreviews()}
                </div>
                <div class="text-center mt-3">
                    <small class="text-muted">
                        ${this.selectedBatch.quantity} QR codes | 
                        Paper: ${this.selectedPrinter?.paper || 'Unknown'} | 
                        DPI: ${this.selectedPrinter?.dpi || 'Unknown'}
                    </small>
                </div>
            </div>
        `;
    }

    generateQRCodePreviews() {
        const maxPreviews = 9; // Show max 9 QR codes in preview
        const quantity = Math.min(this.selectedBatch.quantity, maxPreviews);
        let previewHTML = '';

        for (let i = 0; i < quantity; i++) {
            previewHTML += `
                <div class="qr-preview-item">
                    <div class="qr-placeholder">
                        <i class="fas fa-qrcode fa-2x"></i>
                    </div>
                    <small>${this.selectedBatch.sku}-${String(i + 1).padStart(3, '0')}</small>
                </div>
            `;
        }

        if (this.selectedBatch.quantity > maxPreviews) {
            previewHTML += `
                <div class="qr-preview-item more-indicator">
                    <div class="qr-placeholder">
                        <i class="fas fa-ellipsis-h fa-2x"></i>
                    </div>
                    <small>+${this.selectedBatch.quantity - maxPreviews} more</small>
                </div>
            `;
        }

        return previewHTML;
    }

    clearPreview() {
        const previewArea = document.getElementById('printPreviewArea');
        if (previewArea) {
            previewArea.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-file-image fa-3x mb-3"></i>
                    <h5>Select a batch and printer to see preview</h5>
                    <p>Preview will show the layout of QR codes as they will be printed</p>
                </div>
            `;
        }
    }

    zoomPreview(delta) {
        this.previewZoom = Math.max(50, Math.min(200, this.previewZoom + delta));
        this.applyZoom();
    }

    resetZoom() {
        this.previewZoom = 100;
        this.applyZoom();
    }

    applyZoom() {
        const previewArea = document.getElementById('printPreviewArea');
        const zoomLevel = document.getElementById('zoomLevel');

        if (previewArea) {
            previewArea.style.transform = `scale(${this.previewZoom / 100})`;
            previewArea.style.transformOrigin = 'top left';
        }

        if (zoomLevel) {
            zoomLevel.textContent = `${this.previewZoom}%`;
        }
    }

    startPrintJob() {
        if (!this.selectedPrinter || !this.selectedBatch) {
            window.QRSystem.showError('Please select both a printer and batch');
            return;
        }

        const printSettings = this.getPrintSettings();
        
        if (!this.validatePrintSettings(printSettings)) {
            return;
        }

        // Create print job
        const jobData = {
            printer_id: this.selectedPrinter.id,
            batch_id: this.selectedBatch.id,
            quantity: printSettings.quantity,
            copies: printSettings.copies,
            quality: printSettings.quality,
            range: printSettings.range
        };

        // Show progress modal
        this.showPrintProgressModal();

        // Submit print job
        window.QRSystem.makeRequest('/api/print-job', {
            method: 'POST',
            body: JSON.stringify(jobData)
        })
        .then(response => {
            if (response.success) {
                this.printJob = response.job_id;
                this.monitorPrintJob(response.job_id);
            } else {
                this.hidePrintProgressModal();
                window.QRSystem.showError(response.error || 'Failed to start print job');
            }
        })
        .catch(error => {
            this.hidePrintProgressModal();
            window.QRSystem.showError('Failed to start print job');
        });
    }

    getPrintSettings() {
        const printRange = document.getElementById('print_range')?.value || 'all';
        let quantity = this.selectedBatch.quantity;
        
        if (printRange === 'range') {
            const startIndex = parseInt(document.getElementById('start_index')?.value || 1);
            const endIndex = parseInt(document.getElementById('end_index')?.value || this.selectedBatch.quantity);
            quantity = endIndex - startIndex + 1;
        }

        return {
            quantity: quantity,
            copies: parseInt(document.getElementById('copies')?.value || 1),
            quality: document.getElementById('quality')?.value || 'normal',
            range: printRange
        };
    }

    validatePrintSettings(settings) {
        if (settings.quantity < 1) {
            window.QRSystem.showError('Invalid print quantity');
            return false;
        }

        if (settings.copies < 1 || settings.copies > 10) {
            window.QRSystem.showError('Copies must be between 1 and 10');
            return false;
        }

        return true;
    }

    showPrintProgressModal() {
        const modal = document.getElementById('printJobModal');
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }

        this.updatePrintProgress(0, 'Initializing print job...');
    }

    hidePrintProgressModal() {
        const modal = document.getElementById('printJobModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    updatePrintProgress(percentage, message) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', percentage);
        }

        if (progressText) {
            progressText.textContent = message;
        }
    }

    monitorPrintJob(jobId) {
        const monitorInterval = setInterval(() => {
            window.QRSystem.makeRequest(`/api/print-job/${jobId}/status`)
                .then(job => {
                    this.updatePrintProgress(job.progress, job.status_message);
                    
                    if (job.status === 'completed') {
                        clearInterval(monitorInterval);
                        this.completePrintJob(job);
                    } else if (job.status === 'failed') {
                        clearInterval(monitorInterval);
                        this.failPrintJob(job);
                    }
                })
                .catch(error => {
                    clearInterval(monitorInterval);
                    this.failPrintJob({ error: 'Failed to monitor print job' });
                });
        }, 1000); // Check every second
    }

    completePrintJob(job) {
        this.updatePrintProgress(100, 'Print job completed successfully!');
        
        setTimeout(() => {
            this.hidePrintProgressModal();
            this.addJobToQueue(job);
            window.QRSystem.showSuccess(`Print job completed: ${job.printed_count} QR codes printed`);
        }, 2000);
    }

    failPrintJob(job) {
        this.updatePrintProgress(0, job.error || 'Print job failed');
        
        setTimeout(() => {
            this.hidePrintProgressModal();
            window.QRSystem.showError(job.error || 'Print job failed');
        }, 3000);
    }

    addJobToQueue(job) {
        const queueContainer = document.getElementById('printQueue');
        if (!queueContainer) return;

        const jobElement = this.createQueueJobElement(job);
        queueContainer.insertBefore(jobElement, queueContainer.firstChild);

        // Remove empty state if present
        const emptyState = queueContainer.querySelector('.text-muted');
        if (emptyState) {
            emptyState.remove();
        }

        // Keep only last 10 jobs in queue display
        while (queueContainer.children.length > 10) {
            queueContainer.removeChild(queueContainer.lastChild);
        }
    }

    createQueueJobElement(job) {
        const jobElement = document.createElement('div');
        jobElement.className = 'card mb-2 print-queue-item';
        jobElement.innerHTML = `
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${job.job_id}</strong><br>
                        <small class="text-muted">${this.selectedBatch.code} - ${job.printed_count || 0} printed</small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-${this.getJobStatusColor(job.status)}">${job.status}</span><br>
                        <small class="text-muted">${new Date().toLocaleTimeString()}</small>
                    </div>
                </div>
            </div>
        `;
        
        return jobElement;
    }

    getJobStatusColor(status) {
        const colors = {
            'queued': 'secondary',
            'printing': 'warning',
            'completed': 'success',
            'failed': 'danger',
            'cancelled': 'dark'
        };
        
        return colors[status] || 'secondary';
    }

    testPrinter(printerId) {
        window.QRSystem.showLoadingState(event.target);
        
        window.QRSystem.makeRequest(`/api/test-printer/${printerId}`, {
            method: 'POST'
        })
        .then(response => {
            if (response.success) {
                window.QRSystem.showSuccess('Printer test completed successfully');
            } else {
                window.QRSystem.showError(response.error || 'Printer test failed');
            }
        })
        .catch(error => {
            window.QRSystem.showError('Failed to test printer');
        })
        .finally(() => {
            window.QRSystem.hideLoadingState(event.target);
        });
    }

    refreshPrinters() {
        window.QRSystem.makeRequest('/api/printers/refresh', {
            method: 'POST'
        })
        .then(response => {
            if (response.success) {
                window.QRSystem.showSuccess('Printers refreshed successfully');
                // Reload the page to update printer list
                window.location.reload();
            } else {
                window.QRSystem.showError('Failed to refresh printers');
            }
        })
        .catch(error => {
            window.QRSystem.showError('Failed to refresh printers');
        });
    }

    cancelPrintJob(jobId) {
        if (confirm('Are you sure you want to cancel this print job?')) {
            window.QRSystem.makeRequest(`/api/print-job/${jobId}/cancel`, {
                method: 'POST'
            })
            .then(response => {
                if (response.success) {
                    window.QRSystem.showSuccess('Print job cancelled');
                    this.updateJobStatus(jobId, 'cancelled');
                } else {
                    window.QRSystem.showError('Failed to cancel print job');
                }
            })
            .catch(error => {
                window.QRSystem.showError('Failed to cancel print job');
            });
        }
    }

    retryPrintJob(jobId) {
        window.QRSystem.makeRequest(`/api/print-job/${jobId}/retry`, {
            method: 'POST'
        })
        .then(response => {
            if (response.success) {
                window.QRSystem.showSuccess('Print job restarted');
                this.updateJobStatus(jobId, 'queued');
            } else {
                window.QRSystem.showError('Failed to retry print job');
            }
        })
        .catch(error => {
            window.QRSystem.showError('Failed to retry print job');
        });
    }

    updateJobStatus(jobId, status) {
        const jobElement = document.querySelector(`[data-job-id="${jobId}"]`);
        if (jobElement) {
            const statusBadge = jobElement.querySelector('.badge');
            if (statusBadge) {
                statusBadge.className = `badge bg-${this.getJobStatusColor(status)}`;
                statusBadge.textContent = status;
            }
        }
    }

    startPrintStatusMonitoring() {
        // Monitor active print jobs every 5 seconds
        this.statusMonitorInterval = setInterval(() => {
            this.updateActivePrintJobs();
        }, 5000);
    }

    updateActivePrintJobs() {
        window.QRSystem.makeRequest('/api/print-jobs/active')
            .then(jobs => {
                jobs.forEach(job => {
                    this.updateJobStatus(job.id, job.status);
                });
            })
            .catch(error => {
                console.debug('Failed to update print job statuses');
            });
    }

    // Cleanup function
    destroy() {
        if (this.statusMonitorInterval) {
            clearInterval(this.statusMonitorInterval);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.printingOperations = new PrintingOperations();
});

// Global functions for template usage
window.updatePrinterInfo = function() {
    if (window.printingOperations) {
        const select = document.getElementById('printer_select');
        window.printingOperations.selectPrinter(select.value);
    }
};

window.updateBatchInfo = function() {
    if (window.printingOperations) {
        const select = document.getElementById('batch_select');
        window.printingOperations.selectBatch(select.value);
    }
};

window.toggleCustomRange = function() {
    if (window.printingOperations) {
        const rangeSelect = document.getElementById('print_range');
        window.printingOperations.toggleCustomRange(rangeSelect.value === 'range');
    }
};

window.startPrintJob = function() {
    if (window.printingOperations) {
        window.printingOperations.startPrintJob();
    }
};

window.zoomIn = function() {
    if (window.printingOperations) {
        window.printingOperations.zoomPreview(25);
    }
};

window.zoomOut = function() {
    if (window.printingOperations) {
        window.printingOperations.zoomPreview(-25);
    }
};

window.zoomReset = function() {
    if (window.printingOperations) {
        window.printingOperations.resetZoom();
    }
};

window.cancelPrintJob = function() {
    const modal = document.getElementById('printJobModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
    }
};

// Export for use in other scripts
window.PrintingOperations = PrintingOperations;

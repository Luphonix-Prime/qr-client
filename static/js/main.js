// Main JavaScript functionality for QR Code Compliance System

document.addEventListener('DOMContentLoaded', function() {
    initializeApplication();
});

function initializeApplication() {
    setupEventListeners();
    initializeTooltips();
    setupFormValidation();
    startPeriodicUpdates();
}

function setupEventListeners() {
    // Global click handlers
    document.addEventListener('click', function(e) {
        // Handle dropdown outside clicks
        if (!e.target.closest('.dropdown')) {
            closeAllDropdowns();
        }
    });

    // Form submission handlers
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmission);
    });

    // File input handlers
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', handleFileSelection);
    });

    // Search input handlers
    const searchInputs = document.querySelectorAll('input[type="search"], .search-input');
    searchInputs.forEach(input => {
        input.addEventListener('input', debounce(handleSearch, 300));
    });

    // Modal event handlers
    setupModalEvents();
}

function initializeTooltips() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function setupFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
                showValidationErrors(form);
            }
            form.classList.add('was-validated');
        });
    });
}

function handleFormSubmission(event) {
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (submitBtn) {
        showLoadingState(submitBtn);
    }
    
    // Add form-specific validation
    if (!validateForm(form)) {
        event.preventDefault();
        hideLoadingState(submitBtn);
        return false;
    }
}

function validateForm(form) {
    let isValid = true;
    const formData = new FormData(form);
    
    // Custom validation rules
    if (form.id === 'qrGenerationForm') {
        const quantity = formData.get('quantity');
        if (quantity && (quantity < 1 || quantity > 10000)) {
            showError('Quantity must be between 1 and 10,000');
            isValid = false;
        }
    }
    
    if (form.id === 'addPrinterForm' || form.id === 'addScannerForm') {
        const ipAddress = formData.get('ip_address');
        if (ipAddress && !validateIPAddress(ipAddress)) {
            showError('Please enter a valid IP address');
            isValid = false;
        }
    }
    
    return isValid;
}

function validateIPAddress(ip) {
    const pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return pattern.test(ip);
}

function handleFileSelection(event) {
    const file = event.target.files[0];
    const fileInfo = event.target.parentNode.querySelector('.file-info');
    
    if (file) {
        const fileSize = formatFileSize(file.size);
        const fileName = file.name;
        
        if (fileInfo) {
            fileInfo.innerHTML = `
                <small class="text-muted">
                    <i class="fas fa-file me-1"></i>
                    ${fileName} (${fileSize})
                </small>
            `;
        }
        
        // Validate file type and size
        if (!validateFile(file, event.target)) {
            event.target.value = '';
            if (fileInfo) fileInfo.innerHTML = '';
        }
    }
}

function validateFile(file, input) {
    const allowedTypes = input.accept ? input.accept.split(',').map(t => t.trim()) : [];
    const maxSize = input.dataset.maxSize ? parseInt(input.dataset.maxSize) : 10 * 1024 * 1024; // 10MB default
    
    if (allowedTypes.length > 0 && !allowedTypes.some(type => file.type.match(type))) {
        showError(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        return false;
    }
    
    if (file.size > maxSize) {
        showError(`File size too large. Maximum size: ${formatFileSize(maxSize)}`);
        return false;
    }
    
    return true;
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const searchContainer = event.target.closest('[data-search-container]');
    
    if (searchContainer) {
        const searchableItems = searchContainer.querySelectorAll('[data-searchable]');
        
        searchableItems.forEach(item => {
            const searchText = item.textContent.toLowerCase();
            if (searchText.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
}

function setupModalEvents() {
    // Clear forms when modals are hidden
    document.addEventListener('hidden.bs.modal', function(event) {
        const modal = event.target;
        const forms = modal.querySelectorAll('form');
        
        forms.forEach(form => {
            form.reset();
            form.classList.remove('was-validated');
        });
    });
    
    // Focus first input when modals are shown
    document.addEventListener('shown.bs.modal', function(event) {
        const modal = event.target;
        const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
        
        if (firstInput) {
            firstInput.focus();
        }
    });
}

function startPeriodicUpdates() {
    // Update timestamps every minute
    setInterval(updateTimestamps, 60000);
    
    // Check for system updates every 5 minutes
    setInterval(checkSystemStatus, 300000);
}

function updateTimestamps() {
    const timestamps = document.querySelectorAll('[data-timestamp]');
    
    timestamps.forEach(element => {
        const timestamp = element.dataset.timestamp;
        const date = new Date(timestamp);
        element.textContent = formatRelativeTime(date);
    });
}

function checkSystemStatus() {
    // This would typically make an AJAX call to check system status
    // For now, we'll just update the UI indicators
    updateSystemStatusIndicators();
}

function updateSystemStatusIndicators() {
    const indicators = document.querySelectorAll('.status-indicator');
    
    indicators.forEach(indicator => {
        // Simulate status check
        const isOnline = Math.random() > 0.1; // 90% uptime simulation
        
        if (isOnline) {
            indicator.classList.remove('bg-danger');
            indicator.classList.add('bg-success');
            indicator.title = 'Online';
        } else {
            indicator.classList.remove('bg-success');
            indicator.classList.add('bg-danger');
            indicator.title = 'Offline';
        }
    });
}

// Utility Functions
function showLoadingState(button) {
    if (!button) return;
    
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
}

function hideLoadingState(button) {
    if (!button) return;
    
    button.disabled = false;
    if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
    }
}

function showError(message) {
    showAlert(message, 'danger');
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showAlert(message, type = 'info') {
    const alertContainer = document.querySelector('.alert-container') || document.body;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.insertBefore(alert, alertContainer.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    
    return icons[type] || 'info-circle';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown-menu.show');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('show');
    });
}

function showValidationErrors(form) {
    const invalidFields = form.querySelectorAll(':invalid');
    
    if (invalidFields.length > 0) {
        invalidFields[0].focus();
        
        const firstError = invalidFields[0].validationMessage;
        showError(firstError);
    }
}

// AJAX Helper Functions
function makeRequest(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    };
    
    const config = { ...defaultOptions, ...options };
    
    return fetch(url, config)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('Request failed:', error);
            showError('An error occurred while processing your request.');
            throw error;
        });
}

function submitFormAjax(form, successCallback) {
    const formData = new FormData(form);
    const url = form.action || window.location.href;
    
    return fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (successCallback) successCallback(data);
            showSuccess(data.message || 'Operation completed successfully');
        } else {
            showError(data.error || 'An error occurred');
        }
        return data;
    })
    .catch(error => {
        console.error('Form submission failed:', error);
        showError('An error occurred while submitting the form.');
        throw error;
    });
}

// Export functions for use in other scripts
window.QRSystem = {
    showLoadingState,
    hideLoadingState,
    showError,
    showSuccess,
    showAlert,
    makeRequest,
    submitFormAjax,
    formatFileSize,
    formatRelativeTime,
    validateIPAddress,
    debounce
};

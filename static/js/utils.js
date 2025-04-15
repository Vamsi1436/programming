/**
 * Utility functions for the Blacknight Internet Solutions client management system
 */

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (info, success, warning, error)
 */
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-white bg-${getBgColor(type)} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Create toast body
    const toastBody = document.createElement('div');
    toastBody.className = 'd-flex';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-body';
    messageDiv.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');
    
    toastBody.appendChild(messageDiv);
    toastBody.appendChild(closeButton);
    toast.appendChild(toastBody);
    
    // Append toast to container
    toastContainer.appendChild(toast);
    
    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
    
    // Helper function to get background color based on type
    function getBgColor(type) {
        switch(type.toLowerCase()) {
            case 'success':
                return 'success';
            case 'warning':
                return 'warning';
            case 'error':
                return 'danger';
            case 'info':
            default:
                return 'info';
        }
    }
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @param {boolean} immediate - Whether to call the function immediately
 * @returns {Function} - The debounced function
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * Setup sort controls for tables
 * @param {string} tableId - The ID of the table
 * @param {Function} loadFunction - The function to call when sort changes
 */
function setupSortControls(tableId, loadFunction) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const headers = table.querySelectorAll('.table-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortBy = header.dataset.sort;
            let sortOrder = 'asc';
            
            // Check if this column is already being sorted
            const currentSortIcon = header.querySelector('.sort-icon');
            if (currentSortIcon.textContent === '↑') {
                sortOrder = 'desc';
                currentSortIcon.textContent = '↓';
            } else {
                currentSortIcon.textContent = '↑';
            }
            
            // Reset other sort icons
            headers.forEach(h => {
                if (h !== header) {
                    h.querySelector('.sort-icon').textContent = '⌄';
                }
            });
            
            loadFunction(sortBy, sortOrder);
        });
    });
}

/**
 * Generate a human-readable ID with a prefix
 * @param {string} prefix - The prefix to use (e.g., "BK")
 * @param {number} length - The number of digits
 * @returns {string} - The generated ID
 */
function generateHumanId(prefix, length = 4) {
    const num = Math.floor(Math.random() * Math.pow(10, length));
    return `${prefix}${num.toString().padStart(length, '0')}`;
}

/**
 * Copy text to clipboard
 * @param {string} text - The text to copy
 */
function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('Copied to clipboard!', 'info');
}

/**
 * Format currency amount
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code
 * @returns {string} - The formatted currency string
 */
function formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Get query parameters from URL
 * @returns {Object} - Object with query parameters
 */
function getQueryParams() {
    const params = {};
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    
    for (const [key, value] of urlParams.entries()) {
        params[key] = value;
    }
    
    return params;
}

/**
 * Set query parameters in URL
 * @param {Object} params - Object with query parameters
 */
function setQueryParams(params) {
    const urlParams = new URLSearchParams();
    
    for (const key in params) {
        if (params[key]) {
            urlParams.set(key, params[key]);
        }
    }
    
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, '', newUrl);
}

/**
 * Create pagination for lists
 * @param {HTMLElement} container - The container for pagination
 * @param {number} currentPage - The current page
 * @param {number} totalPages - The total number of pages
 * @param {Function} onPageChange - The function to call when page changes
 */
function createPagination(container, currentPage, totalPages, onPageChange) {
    if (!container) return;
    
    container.innerHTML = '';
    
    // No pagination needed if only one page
    if (totalPages <= 1) return;
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.setAttribute('aria-label', 'Previous');
    prevLink.innerHTML = '<span aria-hidden="true">&laquo;</span>';
    prevLi.appendChild(prevLink);
    container.appendChild(prevLi);
    
    if (currentPage > 1) {
        prevLink.addEventListener('click', (e) => {
            e.preventDefault();
            onPageChange(currentPage - 1);
        });
    }
    
    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        pageLi.appendChild(pageLink);
        container.appendChild(pageLi);
        
        if (i !== currentPage) {
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                onPageChange(i);
            });
        }
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.setAttribute('aria-label', 'Next');
    nextLink.innerHTML = '<span aria-hidden="true">&raquo;</span>';
    nextLi.appendChild(nextLink);
    container.appendChild(nextLi);
    
    if (currentPage < totalPages) {
        nextLink.addEventListener('click', (e) => {
            e.preventDefault();
            onPageChange(currentPage + 1);
        });
    }
}
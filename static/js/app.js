/**
 * Main application JavaScript for Blacknight Internet Solutions client management system
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize common components
    setActiveNav();
    initCompanyInfo();
    initBootstrapComponents();
    
    // Initialize specific page functionality
    const currentPage = getCurrentPage();
    
    if (currentPage === 'index') {
        initDashboard();
    }
});

/**
 * Get the current page from the URL path
 * @returns {string} - The current page name
 */
function getCurrentPage() {
    const path = window.location.pathname;
    if (path === '/') return 'index';
    return path.substring(1).split('.')[0]; // Remove leading slash and file extension
}

/**
 * Set the active nav item based on the current page
 */
function setActiveNav() {
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    navLinks.forEach(link => {
        // Remove active class from all links
        link.classList.remove('active');
        
        // Add active class to current page link
        const href = link.getAttribute('href');
        if (href === `/${currentPage}` || (href === '/' && currentPage === 'index')) {
            link.classList.add('active');
        }
    });
}

/**
 * Initialize company information display
 */
function initCompanyInfo() {
    // Company information like name, address, etc. could be loaded from an API
    // For now it's hardcoded in the templates
    const currentYear = new Date().getFullYear();
    const copyrightElements = document.querySelectorAll('.copyright-year');
    copyrightElements.forEach(el => {
        el.textContent = currentYear;
    });
}

/**
 * Initialize Bootstrap components
 */
function initBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

/**
 * Initialize the dashboard page
 */
function initDashboard() {
    fetchClientsCount();
    fetchServicesCount();
    fetchSubscriptionsCount();
}

/**
 * Fetch the number of clients
 */
function fetchClientsCount() {
    fetch('/api/clients')
        .then(response => response.json())
        .then(data => {
            const clientsCountElement = document.getElementById('clients-count');
            if (clientsCountElement) {
                clientsCountElement.textContent = data.length;
            }
        })
        .catch(error => {
            console.error('Error fetching clients count:', error);
            showToast('Failed to load clients count. Please refresh the page.', 'error');
        });
}

/**
 * Fetch the number of services
 */
function fetchServicesCount() {
    fetch('/api/services')
        .then(response => response.json())
        .then(data => {
            const servicesCountElement = document.getElementById('services-count');
            if (servicesCountElement) {
                servicesCountElement.textContent = data.length;
            }
        })
        .catch(error => {
            console.error('Error fetching services count:', error);
            showToast('Failed to load services count. Please refresh the page.', 'error');
        });
}

/**
 * Fetch the number of subscriptions
 */
function fetchSubscriptionsCount() {
    fetch('/api/subscriptions')
        .then(response => response.json())
        .then(data => {
            const subscriptionsCountElement = document.getElementById('subscriptions-count');
            if (subscriptionsCountElement) {
                subscriptionsCountElement.textContent = data.length;
            }
        })
        .catch(error => {
            console.error('Error fetching subscriptions count:', error);
            showToast('Failed to load subscriptions count. Please refresh the page.', 'error');
        });
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (info, success, warning, error)
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    // Map type to Bootstrap classes
    const typeClasses = {
        info: 'bg-info text-white',
        success: 'bg-success text-white',
        warning: 'bg-warning text-dark',
        error: 'bg-danger text-white'
    };
    
    // Create toast element
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${typeClasses[type] || typeClasses.info}`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    
    toastElement.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">Blacknight CMS</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toastElement);
    
    // Initialize and show Bootstrap toast
    const toast = new bootstrap.Toast(toastElement, {
        delay: 5000
    });
    toast.show();
    
    // Remove toast from DOM when hidden
    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
}
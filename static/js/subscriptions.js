/**
 * Subscription management functionality for Blacknight Internet Solutions
 */

// Global variables
let currentPage = 1;
let itemsPerPage = 10;
let totalSubscriptions = 0;
let currentSortBy = 'start_date';
let currentSortOrder = 'desc';
let currentSearchQuery = '';
let currentStatusFilter = '';
let currentServiceFilter = '';
let isCardView = false;

document.addEventListener('DOMContentLoaded', function() {
    initSubscriptionsPage();
});

/**
 * Initialize the subscriptions page
 */
function initSubscriptionsPage() {
    // Setup search
    const subscriptionSearchInput = document.getElementById('subscription-search');
    if (subscriptionSearchInput) {
        subscriptionSearchInput.addEventListener('input', debounce(handleSubscriptionSearch, 500));
    }
    
    // Setup status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentStatusFilter = this.value;
            loadSubscriptionsTable(currentSortBy, currentSortOrder, currentSearchQuery);
        });
    }
    
    // Setup service filter
    const serviceFilter = document.getElementById('service-filter');
    if (serviceFilter) {
        // Populate service options
        populateServiceOptions(serviceFilter);
        
        serviceFilter.addEventListener('change', function() {
            currentServiceFilter = this.value;
            loadSubscriptionsTable(currentSortBy, currentSortOrder, currentSearchQuery);
        });
    }
    
    // Setup sort dropdown
    const subscriptionSort = document.getElementById('subscription-sort');
    if (subscriptionSort) {
        subscriptionSort.addEventListener('change', function() {
            const [sortBy, sortOrder] = this.value.split('-');
            loadSubscriptionsTable(sortBy, sortOrder, currentSearchQuery);
        });
    }
    
    // Setup sort controls in table headers
    setupSortControls('subscriptions-table', loadSubscriptionsTable);
    
    // Setup add subscription button
    const addSubscriptionBtn = document.getElementById('add-subscription-btn');
    if (addSubscriptionBtn) {
        addSubscriptionBtn.addEventListener('click', showAddSubscriptionModal);
    }
    
    // Setup save subscription button
    const saveSubscriptionBtn = document.getElementById('save-subscription-btn');
    if (saveSubscriptionBtn) {
        saveSubscriptionBtn.addEventListener('click', handleSubscriptionFormSubmit);
    }
    
    // Setup edit subscription button in view modal
    const editSubscriptionBtn = document.getElementById('view-edit-subscription-btn');
    if (editSubscriptionBtn) {
        editSubscriptionBtn.addEventListener('click', function() {
            const subscriptionId = this.dataset.subscriptionId;
            if (subscriptionId) {
                // Close view modal
                const viewSubscriptionModal = bootstrap.Modal.getInstance(document.getElementById('viewSubscriptionModal'));
                viewSubscriptionModal.hide();
                
                // Open edit modal
                editSubscription(subscriptionId);
            }
        });
    }
    
    // Add event listener for delete confirmation
    const confirmDeleteBtn = document.getElementById('confirm-delete-subscription-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const subscriptionId = this.dataset.subscriptionId;
            if (subscriptionId) {
                deleteSubscription(subscriptionId);
            }
        });
    }
    
    // Setup view switcher
    const tableViewBtn = document.getElementById('table-view-btn');
    const cardViewBtn = document.getElementById('card-view-btn');
    const tableView = document.getElementById('table-view');
    const cardView = document.getElementById('card-view');
    
    if (tableViewBtn && cardViewBtn && tableView && cardView) {
        tableViewBtn.addEventListener('click', function() {
            isCardView = false;
            tableView.style.display = 'block';
            cardView.style.display = 'none';
            tableViewBtn.classList.add('active');
            cardViewBtn.classList.remove('active');
        });
        
        cardViewBtn.addEventListener('click', function() {
            isCardView = true;
            tableView.style.display = 'none';
            cardView.style.display = 'block';
            cardViewBtn.classList.add('active');
            tableViewBtn.classList.remove('active');
            
            // Reload card view
            loadCardView(currentSortBy, currentSortOrder, currentSearchQuery);
        });
    }
    
    // Get query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client');
    const newSubscription = urlParams.get('new') === 'true';
    
    if (clientId && newSubscription) {
        // Pre-select client and open modal
        showAddSubscriptionModal(clientId);
    }
    
    // Initial load
    loadSubscriptionsTable(currentSortBy, currentSortOrder, currentSearchQuery);
}

/**
 * Populate service dropdown options
 * @param {HTMLElement} selectElement - The select element to populate
 */
function populateServiceOptions(selectElement) {
    fetch('/api/services')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load services');
            return response.json();
        })
        .then(services => {
            // Only include active services
            const activeServices = services.filter(service => service.is_active);
            
            // Add options
            activeServices.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = service.name;
                selectElement.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading services:', error);
            showToast('Failed to load service options. Please try again.', 'error');
        });
}

/**
 * Load subscriptions table with sorting and filtering
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc or desc)
 * @param {string} searchQuery - Search query
 */
function loadSubscriptionsTable(sortBy = 'start_date', sortOrder = 'desc', searchQuery = '') {
    currentSortBy = sortBy;
    currentSortOrder = sortOrder;
    currentSearchQuery = searchQuery;
    
    // Show loading indicator
    const tableBody = document.getElementById('subscriptions-table-body');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading subscriptions...</p>
                </td>
            </tr>
        `;
    }
    
    // Build API URL with query parameters
    let apiUrl = `/api/subscriptions?sort_by=${sortBy}&sort_order=${sortOrder}`;
    if (searchQuery) {
        apiUrl += `&search=${encodeURIComponent(searchQuery)}`;
    }
    
    // Fetch subscriptions from API
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load subscriptions');
            return response.json();
        })
        .then(subscriptions => {
            // Filter by status if needed
            if (currentStatusFilter) {
                subscriptions = subscriptions.filter(subscription => subscription.status === currentStatusFilter);
            }
            
            // Filter by service if needed
            if (currentServiceFilter) {
                subscriptions = subscriptions.filter(subscription => subscription.service_id === currentServiceFilter);
            }
            
            // Update counters
            updateSubscriptionCounters(subscriptions);
            
            displaySubscriptions(subscriptions);
            
            // Update card view if active
            if (isCardView) {
                loadCardView(sortBy, sortOrder, searchQuery, subscriptions);
            }
        })
        .catch(error => {
            console.error('Error loading subscriptions:', error);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4 text-danger">
                            <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                            <p>Failed to load subscriptions. Please try again.</p>
                        </td>
                    </tr>
                `;
            }
            showToast('Failed to load subscriptions. Please try again.', 'error');
        });
}

/**
 * Update subscription counters
 * @param {Array} subscriptions - Array of subscription objects
 */
function updateSubscriptionCounters(subscriptions) {
    const totalElement = document.getElementById('total-subscriptions-count');
    const activeElement = document.getElementById('active-subscriptions-count');
    const expiringElement = document.getElementById('expiring-subscriptions-count');
    const inactiveElement = document.getElementById('inactive-subscriptions-count');
    
    if (totalElement) {
        totalElement.textContent = subscriptions.length;
    }
    
    if (activeElement) {
        const activeCount = subscriptions.filter(sub => sub.status === 'Active').length;
        activeElement.textContent = activeCount;
    }
    
    if (expiringElement) {
        // Count subscriptions ending in the next 30 days
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        
        const expiringCount = subscriptions.filter(sub => {
            if (sub.status !== 'Active' || !sub.end_date) return false;
            
            const endDate = new Date(sub.end_date);
            return endDate > today && endDate <= thirtyDaysFromNow;
        }).length;
        
        expiringElement.textContent = expiringCount;
    }
    
    if (inactiveElement) {
        const inactiveCount = subscriptions.filter(sub => 
            sub.status === 'Expired' || sub.status === 'Cancelled'
        ).length;
        inactiveElement.textContent = inactiveCount;
    }
}

/**
 * Display subscriptions in the table
 * @param {Array} subscriptions - Array of subscription objects
 */
function displaySubscriptions(subscriptions) {
    const tableBody = document.getElementById('subscriptions-table-body');
    const filteredSubscriptionsElement = document.getElementById('filtered-subscriptions');
    const paginationElement = document.getElementById('subscriptions-pagination');
    
    if (!tableBody) return;
    
    // Update filtered count
    totalSubscriptions = subscriptions.length;
    if (filteredSubscriptionsElement) {
        filteredSubscriptionsElement.textContent = totalSubscriptions;
    }
    
    // If no subscriptions found
    if (subscriptions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <p class="mb-0 text-muted">No subscriptions found</p>
                    ${currentSearchQuery || currentStatusFilter || currentServiceFilter ? 
                      `<p class="mb-0 text-muted small">Try adjusting your search or filter criteria</p>` : ''}
                </td>
            </tr>
        `;
        if (paginationElement) {
            paginationElement.innerHTML = '';
        }
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(subscriptions.length / itemsPerPage);
    if (currentPage > totalPages) {
        currentPage = 1;
    }
    
    // Get current page data
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedSubscriptions = subscriptions.slice(start, end);
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Add subscription rows
    paginatedSubscriptions.forEach(subscription => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${subscription.subscription_id}</td>
            <td>
                <div>
                    <div class="fw-bold">${subscription.client_name}</div>
                    <div class="small text-muted">${subscription.client_email || ''}</div>
                </div>
            </td>
            <td>
                <div>
                    <div class="fw-bold">${subscription.service_name}</div>
                    <div class="small text-muted">${subscription.service_category || ''}</div>
                </div>
            </td>
            <td>${formatDate(subscription.start_date)}</td>
            <td>${subscription.end_date ? formatDate(subscription.end_date) : '<span class="text-muted">Auto-renew</span>'}</td>
            <td>${formatCurrency(subscription.amount)}</td>
            <td>
                <span class="badge ${getSubscriptionStatusBadgeClass(subscription.status)}">${subscription.status}</span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-outline-primary" onclick="viewSubscription('${subscription.subscription_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-outline-primary" onclick="editSubscription('${subscription.subscription_id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger" onclick="confirmDeleteSubscription('${subscription.subscription_id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Setup pagination
    if (paginationElement) {
        createPagination(paginationElement, currentPage, totalPages, (page) => {
            currentPage = page;
            displaySubscriptions(subscriptions);
        });
    }
}

/**
 * Load card view of subscriptions
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc or desc)
 * @param {string} searchQuery - Search query
 * @param {Array} subscriptions - Optional subscriptions array if already loaded
 */
function loadCardView(sortBy = 'start_date', sortOrder = 'desc', searchQuery = '', subscriptions = null) {
    const cardContainer = document.getElementById('card-view');
    if (!cardContainer) return;
    
    // Show loading indicator if subscriptions not provided
    if (!subscriptions) {
        cardContainer.innerHTML = `
            <div class="col-12 text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading subscriptions...</p>
            </div>
        `;
        
        // Use existing loading function to get subscriptions
        let apiUrl = `/api/subscriptions?sort_by=${sortBy}&sort_order=${sortOrder}`;
        if (searchQuery) {
            apiUrl += `&search=${encodeURIComponent(searchQuery)}`;
        }
        
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) throw new Error('Failed to load subscriptions');
                return response.json();
            })
            .then(fetchedSubscriptions => {
                // Filter by status if needed
                if (currentStatusFilter) {
                    fetchedSubscriptions = fetchedSubscriptions.filter(subscription => subscription.status === currentStatusFilter);
                }
                
                // Filter by service if needed
                if (currentServiceFilter) {
                    fetchedSubscriptions = fetchedSubscriptions.filter(subscription => subscription.service_id === currentServiceFilter);
                }
                
                displayCardView(fetchedSubscriptions);
            })
            .catch(error => {
                console.error('Error loading subscription cards:', error);
                cardContainer.innerHTML = `
                    <div class="col-12 text-center py-4 text-danger">
                        <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                        <p>Failed to load subscriptions. Please try again.</p>
                    </div>
                `;
                showToast('Failed to load subscription cards. Please try again.', 'error');
            });
    } else {
        // Use provided subscriptions array
        displayCardView(subscriptions);
    }
}

/**
 * Display subscriptions in card view
 * @param {Array} subscriptions - Array of subscription objects
 */
function displayCardView(subscriptions) {
    const cardContainer = document.getElementById('card-view');
    if (!cardContainer) return;
    
    // If no subscriptions found
    if (subscriptions.length === 0) {
        cardContainer.innerHTML = `
            <div class="col-12 text-center py-4">
                <p class="mb-0 text-muted">No subscriptions found</p>
                ${currentSearchQuery || currentStatusFilter || currentServiceFilter ? 
                  `<p class="mb-0 text-muted small">Try adjusting your search or filter criteria</p>` : ''}
            </div>
        `;
        return;
    }
    
    // Clear existing content
    cardContainer.innerHTML = '';
    
    // Calculate renewal dates
    const today = new Date();
    
    // Add subscription cards
    subscriptions.forEach(subscription => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        
        // Calculate days until expiry if end date exists
        let daysUntilExpiry = null;
        let isExpiringSoon = false;
        
        if (subscription.end_date) {
            const endDate = new Date(subscription.end_date);
            const timeDiff = endDate - today;
            daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 30;
        }
        
        // Get icon for service category
        const iconClass = getCategoryIconClass(subscription.service_category);
        
        card.innerHTML = `
            <div class="card h-100 subscription-card ${isExpiringSoon ? 'border-warning' : ''}">
                <div class="card-header bg-transparent d-flex justify-content-between align-items-center">
                    <span class="badge ${getSubscriptionStatusBadgeClass(subscription.status)}">${subscription.status}</span>
                    <span class="text-muted">${subscription.subscription_id}</span>
                </div>
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="service-icon me-3 ${iconClass}">
                            <i class="${getCategoryIcon(subscription.service_category)}"></i>
                        </div>
                        <div>
                            <h5 class="card-title mb-0">${subscription.service_name}</h5>
                            <p class="card-text text-muted small">${subscription.service_category || ''}</p>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="fw-bold">Client:</div>
                        <div>${subscription.client_name}</div>
                        <div class="small text-muted">${subscription.client_email || ''}</div>
                    </div>
                    
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <div class="fw-bold">Start Date:</div>
                            <div>${formatDate(subscription.start_date)}</div>
                        </div>
                        <div class="col-6">
                            <div class="fw-bold">End Date:</div>
                            <div>${subscription.end_date ? formatDate(subscription.end_date) : 'Auto-renew'}</div>
                            ${isExpiringSoon ? `<div class="text-warning small">Expires in ${daysUntilExpiry} days</div>` : ''}
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="text-primary fw-bold">${formatCurrency(subscription.amount)}</span>
                        <span class="text-muted">per ${subscription.billing_cycle.toLowerCase()}</span>
                    </div>
                </div>
                <div class="card-footer bg-transparent border-top-0 d-flex justify-content-between">
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="viewSubscription('${subscription.id}')">
                        <i class="fas fa-eye me-1"></i> View
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="editSubscription('${subscription.id}')">
                        <i class="fas fa-edit me-1"></i> Edit
                    </button>
                </div>
            </div>
        `;
        cardContainer.appendChild(card);
    });
}

/**
 * Get the appropriate icon class for a category
 * @param {string} category - The category name
 * @returns {string} - The CSS class
 */
function getCategoryIconClass(category) {
    switch (category) {
        case 'Web Hosting':
            return 'category-hosting';
        case 'Domain Registration':
            return 'category-domain';
        case 'VPS':
            return 'category-vps';
        case 'Dedicated Server':
            return 'category-dedicated';
        case 'Email Hosting':
            return 'category-email';
        case 'Security & SSL':
            return 'category-security';
        default:
            return 'category-hosting';
    }
}

/**
 * Get the appropriate Font Awesome icon for a category
 * @param {string} category - The category name
 * @returns {string} - The icon class
 */
function getCategoryIcon(category) {
    switch (category) {
        case 'Web Hosting':
            return 'fas fa-server';
        case 'Domain Registration':
            return 'fas fa-globe';
        case 'VPS':
            return 'fas fa-hdd';
        case 'Dedicated Server':
            return 'fas fa-database';
        case 'Email Hosting':
            return 'fas fa-envelope';
        case 'Security & SSL':
            return 'fas fa-shield-alt';
        default:
            return 'fas fa-server';
    }
}

/**
 * Get the appropriate Bootstrap badge class for a subscription status
 * @param {string} status - The status value
 * @returns {string} - The CSS class
 */
function getSubscriptionStatusBadgeClass(status) {
    switch (status) {
        case 'Active':
            return 'bg-success';
        case 'Expired':
            return 'bg-secondary';
        case 'Cancelled':
            return 'bg-danger';
        case 'Suspended':
            return 'bg-warning text-dark';
        default:
            return 'bg-secondary';
    }
}

/**
 * Handle subscription search input
 * @param {Event} event - The input event
 */
function handleSubscriptionSearch(event) {
    const searchQuery = event.target.value.trim();
    currentSearchQuery = searchQuery;
    loadSubscriptionsTable(currentSortBy, currentSortOrder, searchQuery);
}

/**
 * Show modal for adding a new subscription
 */
function showAddSubscriptionModal(preSelectedClientId = null) {
    const modal = document.getElementById('subscriptionModal');
    const form = document.getElementById('subscription-form');
    const modalTitle = document.getElementById('subscriptionModalLabel');
    
    if (form) {
        form.reset();
    }
    
    if (modalTitle) {
        modalTitle.textContent = 'Add New Subscription';
    }
    
    // Set today as default start date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').value = today;
    
    // Set default values
    document.getElementById('subscription-id').value = ''; // Clear ID for new subscription
    document.getElementById('subscription-status').value = 'Active';
    document.getElementById('auto-renew').checked = true;
    
    // Clear validation styles
    const inputs = form.querySelectorAll('.form-control, .form-select');
    inputs.forEach(input => {
        input.classList.remove('is-invalid');
    });
    
    // Load clients for dropdown
    loadClientsForDropdown(preSelectedClientId);
    
    // Load services for dropdown
    loadServicesForDropdown();
    
    // Set up service selection change handler
    const serviceSelect = document.getElementById('service-select');
    if (serviceSelect) {
        serviceSelect.addEventListener('change', function() {
            updateSubscriptionAmount(this.value);
        });
    }
    
    // Show the modal
    const subscriptionModal = new bootstrap.Modal(modal);
    subscriptionModal.show();
}

/**
 * Load clients for the dropdown
 * @param {string} preSelectedClientId - Optional client ID to pre-select
 */
function loadClientsForDropdown(preSelectedClientId = null) {
    const clientSelect = document.getElementById('client-select');
    if (!clientSelect) return;
    
    // Clear existing options except the first one
    while (clientSelect.options.length > 1) {
        clientSelect.remove(1);
    }
    
    fetch('/api/clients')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load clients');
            return response.json();
        })
        .then(clients => {
            // Only include active clients
            const activeClients = clients.filter(client => client.status === 'Active');
            
            // Sort by name
            activeClients.sort((a, b) => {
                const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase();
                const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase();
                return nameA.localeCompare(nameB);
            });
            
            // Add options
            activeClients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.first_name} ${client.last_name} (${client.client_id})`;
                if (client.company_name) {
                    option.textContent += ` - ${client.company_name}`;
                }
                clientSelect.appendChild(option);
                
                // Pre-select if specified
                if (preSelectedClientId && client.id === preSelectedClientId) {
                    option.selected = true;
                }
            });
        })
        .catch(error => {
            console.error('Error loading clients:', error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Error loading clients';
            option.disabled = true;
            clientSelect.appendChild(option);
            showToast('Failed to load clients. Please try again.', 'error');
        });
}

/**
 * Load services for the dropdown
 */
function loadServicesForDropdown() {
    const serviceSelect = document.getElementById('service-select');
    if (!serviceSelect) return;
    
    // Clear existing options except the first one
    while (serviceSelect.options.length > 1) {
        serviceSelect.remove(1);
    }
    
    fetch('/api/services')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load services');
            return response.json();
        })
        .then(services => {
            // Only include active services
            const activeServices = services.filter(service => service.is_active);
            
            // Group by category
            const servicesByCategory = {};
            activeServices.forEach(service => {
                const category = service.category || 'Other';
                if (!servicesByCategory[category]) {
                    servicesByCategory[category] = [];
                }
                servicesByCategory[category].push(service);
            });
            
            // Add options with optgroups by category
            for (const [category, categoryServices] of Object.entries(servicesByCategory)) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category;
                
                // Sort services by name within category
                categoryServices.sort((a, b) => a.name.localeCompare(b.name));
                
                categoryServices.forEach(service => {
                    const option = document.createElement('option');
                    option.value = service.id;
                    option.textContent = `${service.name} (${formatCurrency(service.price)}/${service.billing_cycle.toLowerCase()})`;
                    option.dataset.price = service.price;
                    option.dataset.billingCycle = service.billing_cycle;
                    optgroup.appendChild(option);
                });
                
                serviceSelect.appendChild(optgroup);
            }
        })
        .catch(error => {
            console.error('Error loading services:', error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Error loading services';
            option.disabled = true;
            serviceSelect.appendChild(option);
            showToast('Failed to load services. Please try again.', 'error');
        });
}

/**
 * Update subscription amount based on selected service
 * @param {string} serviceId - The selected service ID
 */
function updateSubscriptionAmount(serviceId) {
    if (!serviceId) return;
    
    const serviceSelect = document.getElementById('service-select');
    const amountInput = document.getElementById('subscription-amount');
    const billingCycleSelect = document.getElementById('billing-cycle');
    
    if (!serviceSelect || !amountInput || !billingCycleSelect) return;
    
    // Find the selected option
    const selectedOption = Array.from(serviceSelect.querySelectorAll('option'))
        .find(option => option.value === serviceId);
    
    if (selectedOption) {
        // Set amount and billing cycle from service
        amountInput.value = selectedOption.dataset.price || '';
        billingCycleSelect.value = selectedOption.dataset.billingCycle || 'Monthly';
    }
}

/**
 * View subscription details
 * @param {string} subscriptionId - The subscription ID
 */
function viewSubscription(subscriptionId) {
    if (!subscriptionId) {
        showToast('Invalid subscription ID', 'error');
        return;
    }
    // Fetch subscription data
    fetch(`/api/subscriptions/${subscriptionId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load subscription details');
            return response.json();
        })
        .then(subscription => {
            // Set subscription ID for reference
            const editSubscriptionBtn = document.getElementById('view-edit-subscription-btn');
            if (editSubscriptionBtn) {
                editSubscriptionBtn.dataset.subscriptionId = subscription.id;
            }
            
            // Update view modal elements
            document.getElementById('view-subscription-id').textContent = subscription.subscription_id;
            document.getElementById('view-client-name').textContent = subscription.client_name;
            document.getElementById('view-client-email').textContent = subscription.client_email || 'Not available';
            document.getElementById('view-client-company').textContent = subscription.company_name || 'Not available';
            
            document.getElementById('view-service-name').textContent = subscription.service_name;
            document.getElementById('view-service-category').textContent = subscription.service_category || 'Not categorized';
            
            document.getElementById('view-start-date').textContent = formatDate(subscription.start_date);
            document.getElementById('view-end-date').textContent = subscription.end_date ? formatDate(subscription.end_date) : 'Auto-renew';
            
            // Calculate next renewal date
            if (subscription.status === 'Active') {
                let nextRenewalDate;
                if (subscription.end_date) {
                    // If there's an end date, that's the renewal date
                    nextRenewalDate = formatDate(subscription.end_date);
                } else if (subscription.auto_renew) {
                    // Calculate next renewal based on start date and billing cycle
                    const startDate = new Date(subscription.start_date);
                    const renewalDate = new Date(startDate);
                    
                    switch (subscription.billing_cycle) {
                        case 'Monthly':
                            renewalDate.setMonth(renewalDate.getMonth() + 1);
                            break;
                        case 'Quarterly':
                            renewalDate.setMonth(renewalDate.getMonth() + 3);
                            break;
                        case 'Semi-Annually':
                            renewalDate.setMonth(renewalDate.getMonth() + 6);
                            break;
                        case 'Annually':
                            renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                            break;
                        case 'Biennially':
                            renewalDate.setFullYear(renewalDate.getFullYear() + 2);
                            break;
                    }
                    
                    nextRenewalDate = formatDate(renewalDate.toISOString().split('T')[0]);
                } else {
                    nextRenewalDate = 'Not set to renew';
                }
                
                document.getElementById('view-next-renewal').textContent = nextRenewalDate;
            } else {
                document.getElementById('view-next-renewal').textContent = 'Not active';
            }
            
            document.getElementById('view-amount').textContent = formatCurrency(subscription.amount);
            document.getElementById('view-billing-cycle').textContent = subscription.billing_cycle;
            document.getElementById('view-auto-renew').textContent = subscription.auto_renew ? 'Yes' : 'No';
            
            document.getElementById('view-subscription-status').textContent = subscription.status;
            document.getElementById('view-subscription-status').className = `badge ${getSubscriptionStatusBadgeClass(subscription.status)} status-badge`;
            
            document.getElementById('view-notes').textContent = subscription.notes || 'No notes available.';
            
            // Show the modal
            const viewSubscriptionModal = new bootstrap.Modal(document.getElementById('viewSubscriptionModal'));
            viewSubscriptionModal.show();
        })
        .catch(error => {
            console.error('Error viewing subscription:', error);
            showToast('Failed to load subscription details. Please try again.', 'error');
        });
}

/**
 * Edit subscription
 * @param {string} subscriptionId - The subscription ID
 */
function editSubscription(subscriptionId) {
    fetch(`/api/subscriptions/${subscriptionId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load subscription details');
            return response.json();
        })
        .then(subscription => {
            const form = document.getElementById('subscription-form');
            const modalTitle = document.getElementById('subscriptionModalLabel');
            
            if (form) {
                form.reset();
            }
            
            if (modalTitle) {
                modalTitle.textContent = 'Edit Subscription';
            }
            
            // Set form values
            document.getElementById('subscription-id').value = subscription.id;
            document.getElementById('start-date').value = subscription.start_date;
            document.getElementById('end-date').value = subscription.end_date || '';
            document.getElementById('subscription-amount').value = subscription.amount;
            document.getElementById('billing-cycle').value = subscription.billing_cycle;
            document.getElementById('subscription-status').value = subscription.status;
            document.getElementById('auto-renew').checked = subscription.auto_renew;
            document.getElementById('subscription-notes').value = subscription.notes || '';
            
            // Load clients for dropdown and select the current client
            loadClientsForDropdown(subscription.client_id);
            
            // Load services for dropdown and select the current service
            loadServicesForDropdown();
            
            // Need to wait for dropdowns to be populated
            setTimeout(() => {
                const clientSelect = document.getElementById('client-select');
                const serviceSelect = document.getElementById('service-select');
                
                if (clientSelect) {
                    for (let i = 0; i < clientSelect.options.length; i++) {
                        if (clientSelect.options[i].value === subscription.client_id) {
                            clientSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
                
                if (serviceSelect) {
                    for (let i = 0; i < serviceSelect.options.length; i++) {
                        if (serviceSelect.options[i].value === subscription.service_id) {
                            serviceSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            }, 500);
            
            // Clear validation styles
            const inputs = form.querySelectorAll('.form-control, .form-select');
            inputs.forEach(input => {
                input.classList.remove('is-invalid');
            });
            
            // Show the modal
            const subscriptionModal = new bootstrap.Modal(document.getElementById('subscriptionModal'));
            subscriptionModal.show();
        })
        .catch(error => {
            console.error('Error editing subscription:', error);
            showToast('Failed to load subscription details for editing. Please try again.', 'error');
        });
}

/**
 * Confirm subscription deletion
 * @param {string} subscriptionId - The subscription ID
 */
function confirmDeleteSubscription(subscriptionId) {
    fetch(`/api/subscriptions/${subscriptionId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load subscription details');
            return response.json();
        })
        .then(subscription => {
            const confirmDeleteBtn = document.getElementById('confirm-delete-subscription-btn');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.dataset.subscriptionId = subscription.subscription_id;
            }
            
            // Set modal text
            const deleteModalLabel = document.getElementById('deleteSubscriptionModalLabel');
            if (deleteModalLabel) {
                deleteModalLabel.textContent = `Delete Subscription ${subscription.subscription_id}?`;
            }
            
            // Show the modal
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteSubscriptionModal'));
            deleteModal.show();
        })
        .catch(error => {
            console.error('Error preparing subscription deletion:', error);
            showToast('Failed to prepare subscription for deletion. Please try again.', 'error');
        });
}

/**
 * Delete subscription
 * @param {string} subscriptionId - The subscription ID
 */
function deleteSubscription(subscriptionId) {
    if (!subscriptionId) {
        showToast('Invalid subscription ID', 'error');
        return;
    }
    
    fetch(`/api/subscriptions/${subscriptionId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to delete subscription');
            return response.json();
        })
        .then(data => {
            // Close delete modal
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteSubscriptionModal'));
            deleteModal.hide();
            
            // Show success message
            showToast(data.message || 'Subscription deleted successfully', 'success');
            
            // Reload subscriptions table
            loadSubscriptionsTable(currentSortBy, currentSortOrder, currentSearchQuery);
        })
        .catch(error => {
            console.error('Error deleting subscription:', error);
            showToast('Failed to delete subscription. Please try again.', 'error');
            
            // Close delete modal
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteSubscriptionModal'));
            deleteModal.hide();
        });
}

/**
 * Handle subscription form submission
 * @param {Event} event - The submit event
 */
function handleSubscriptionFormSubmit(event) {
    event.preventDefault();
    
    // Get form values
    const subscriptionId = document.getElementById('subscription-id').value;
    const clientId = document.getElementById('client-select').value;
    const serviceId = document.getElementById('service-select').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const amount = document.getElementById('subscription-amount').value;
    const billingCycle = document.getElementById('billing-cycle').value;
    const status = document.getElementById('subscription-status').value;
    const autoRenew = document.getElementById('auto-renew').checked;
    const notes = document.getElementById('subscription-notes').value;
    
    // Validate form
    const formData = {
        client_id: clientId,
        service_id: serviceId,
        start_date: startDate,
        end_date: endDate,
        amount: amount,
        billing_cycle: billingCycle,
        status: status,
        auto_renew: autoRenew,
        notes: notes
    };
    
    const validationResult = validateSubscriptionForm(formData);
    if (!validationResult.isValid) {
        // Show validation errors
        validationResult.errors.forEach(error => {
            const input = document.getElementById(error.field);
            if (input) {
                input.classList.add('is-invalid');
                const feedback = input.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.textContent = error.message;
                }
            }
        });
        return;
    }
    
    // Clear validation errors
    const inputs = document.querySelectorAll('.form-control, .form-select');
    inputs.forEach(input => {
        input.classList.remove('is-invalid');
    });
    
    // Determine if this is an edit or create operation
    const isEdit = !!subscriptionId;
    const url = isEdit ? `/api/subscriptions/${subscriptionId}` : '/api/subscriptions';
    const method = isEdit ? 'PUT' : 'POST';
    
    // Send API request
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
        .then(response => {
            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 400) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Validation error');
                    });
                }
                throw new Error('Failed to save subscription');
            }
            return response.json();
        })
        .then(data => {
            // Close modal
            const subscriptionModal = bootstrap.Modal.getInstance(document.getElementById('subscriptionModal'));
            subscriptionModal.hide();
            
            // Show success message
            showToast(isEdit ? 'Subscription updated successfully' : 'Subscription created successfully', 'success');
            
            // Reload subscriptions table
            loadSubscriptionsTable(currentSortBy, currentSortOrder, currentSearchQuery);
        })
        .catch(error => {
            console.error('Error saving subscription:', error);
            showToast(error.message || 'Failed to save subscription. Please try again.', 'error');
        });
}

/**
 * Validate subscription form
 * @param {Object} formData - The form data
 * @returns {Object} - Validation result
 */
function validateSubscriptionForm(formData) {
    const errors = [];
    
    // Required fields
    if (!isNotEmpty(formData.client_id)) {
        errors.push({ field: 'client-select', message: 'Please select a client' });
    }
    
    if (!isNotEmpty(formData.service_id)) {
        errors.push({ field: 'service-select', message: 'Please select a service' });
    }
    
    if (!isNotEmpty(formData.start_date)) {
        errors.push({ field: 'start-date', message: 'Start date is required' });
    } else if (!isValidDate(formData.start_date)) {
        errors.push({ field: 'start-date', message: 'Please enter a valid date' });
    }
    
    if (isNotEmpty(formData.end_date) && !isValidDate(formData.end_date)) {
        errors.push({ field: 'end-date', message: 'Please enter a valid date' });
    }
    
    if (isNotEmpty(formData.start_date) && isNotEmpty(formData.end_date)) {
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        if (endDate <= startDate) {
            errors.push({ field: 'end-date', message: 'End date must be after start date' });
        }
    }
    
    if (!isNotEmpty(formData.amount)) {
        errors.push({ field: 'subscription-amount', message: 'Amount is required' });
    } else if (!isValidNumber(formData.amount, 0)) {
        errors.push({ field: 'subscription-amount', message: 'Amount must be a positive number' });
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
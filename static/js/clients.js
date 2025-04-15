/**
 * Client management functionality for Blacknight Internet Solutions
 */

// Global variables
let currentPage = 1;
let itemsPerPage = 10;
let totalClients = 0;
let currentSortBy = 'last_name';
let currentSortOrder = 'asc';
let currentSearchQuery = '';
let currentStatusFilter = '';

document.addEventListener('DOMContentLoaded', function() {
    initClientsPage();
});

/**
 * Initialize the clients page
 */
function initClientsPage() {
    // Setup search
    const clientSearchInput = document.getElementById('client-search');
    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', debounce(handleClientSearch, 500));
    }
    
    // Setup status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentStatusFilter = this.value;
            loadClientsTable(currentSortBy, currentSortOrder, currentSearchQuery);
        });
    }
    
    // Setup sort dropdown
    const clientSort = document.getElementById('client-sort');
    if (clientSort) {
        clientSort.addEventListener('change', function() {
            const [sortBy, sortOrder] = this.value.split('-');
            loadClientsTable(sortBy, sortOrder, currentSearchQuery);
        });
    }
    
    // Setup sort controls in table headers
    setupSortControls('clients-table', loadClientsTable);
    
    // Setup add client button
    const addClientBtn = document.getElementById('add-client-btn');
    if (addClientBtn) {
        addClientBtn.addEventListener('click', showAddClientModal);
    }
    
    // Setup save client button
    const saveClientBtn = document.getElementById('save-client-btn');
    if (saveClientBtn) {
        saveClientBtn.addEventListener('click', handleClientFormSubmit);
    }
    
    // Setup edit client button in view modal
    const editClientBtn = document.getElementById('edit-client-btn');
    if (editClientBtn) {
        editClientBtn.addEventListener('click', function() {
            const clientId = document.getElementById('client-id-display').dataset.clientId;
            if (clientId) {
                // Close view modal
                const viewClientModal = bootstrap.Modal.getInstance(document.getElementById('viewClientModal'));
                viewClientModal.hide();
                
                // Open edit modal
                editClient(clientId);
            }
        });
    }
    
    // Setup edit notes button
    const editNotesBtn = document.getElementById('edit-notes-btn');
    if (editNotesBtn) {
        editNotesBtn.addEventListener('click', function() {
            const notesDisplay = document.getElementById('client-notes-display');
            if (notesDisplay) {
                notesDisplay.readOnly = false;
                notesDisplay.focus();
                this.textContent = 'Save Notes';
                this.classList.remove('btn-primary');
                this.classList.add('btn-success');
                
                // Change button functionality to save
                this.removeEventListener('click', arguments.callee);
                this.addEventListener('click', function() {
                    const clientId = document.getElementById('client-id-display').dataset.clientId;
                    const notes = notesDisplay.value;
                    
                    // Update notes via API
                    fetch(`/api/clients/${clientId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ notes: notes })
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to update notes');
                        return response.json();
                    })
                    .then(data => {
                        notesDisplay.readOnly = true;
                        this.textContent = 'Edit Notes';
                        this.classList.remove('btn-success');
                        this.classList.add('btn-primary');
                        showToast('Notes updated successfully', 'success');
                        
                        // Reset button to edit mode
                        this.removeEventListener('click', arguments.callee);
                        editNotesBtn.addEventListener('click', arguments.callee.caller);
                    })
                    .catch(error => {
                        console.error('Error updating notes:', error);
                        showToast('Failed to update notes. Please try again.', 'error');
                    });
                });
            }
        });
    }
    
    // Add event listener for delete confirmation
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const clientId = this.dataset.clientId;
            if (clientId) {
                deleteClient(clientId);
            }
        });
    }
    
    // Add subscription button
    const addSubscriptionBtn = document.getElementById('add-subscription-btn');
    if (addSubscriptionBtn) {
        addSubscriptionBtn.addEventListener('click', function() {
            const clientId = document.getElementById('client-id-display').dataset.clientId;
            if (clientId) {
                // Redirect to subscriptions page with client pre-selected
                window.location.href = `/subscriptions?client=${clientId}&new=true`;
            }
        });
    }
    
    // Initial load
    loadClientsTable(currentSortBy, currentSortOrder, currentSearchQuery);
}

/**
 * Load clients table with sorting and filtering
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc or desc)
 * @param {string} searchQuery - Search query
 */
function loadClientsTable(sortBy = 'last_name', sortOrder = 'asc', searchQuery = '') {
    currentSortBy = sortBy;
    currentSortOrder = sortOrder;
    currentSearchQuery = searchQuery;
    
    // Show loading indicator
    const tableBody = document.getElementById('clients-table-body');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading clients...</p>
                </td>
            </tr>
        `;
    }
    
    // Build API URL with query parameters
    let apiUrl = `/api/clients?sort_by=${sortBy}&sort_order=${sortOrder}`;
    if (searchQuery) {
        apiUrl += `&search=${encodeURIComponent(searchQuery)}`;
    }
    
    // Fetch clients from API
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load clients');
            return response.json();
        })
        .then(clients => {
            // Filter by status if needed
            if (currentStatusFilter) {
                clients = clients.filter(client => client.status === currentStatusFilter);
            }
            
            displayClients(clients);
        })
        .catch(error => {
            console.error('Error loading clients:', error);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4 text-danger">
                            <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                            <p>Failed to load clients. Please try again.</p>
                        </td>
                    </tr>
                `;
            }
            showToast('Failed to load clients. Please try again.', 'error');
        });
}

/**
 * Display clients in the table
 * @param {Array} clients - Array of client objects
 */
function displayClients(clients) {
    const tableBody = document.getElementById('clients-table-body');
    const totalClientsElement = document.getElementById('total-clients');
    const paginationElement = document.getElementById('clients-pagination');
    
    if (!tableBody) return;
    
    // Update total count
    totalClients = clients.length;
    if (totalClientsElement) {
        totalClientsElement.textContent = totalClients;
    }
    
    // If no clients found
    if (clients.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <p class="mb-0 text-muted">No clients found</p>
                    ${currentSearchQuery ? `<p class="mb-0 text-muted small">Try adjusting your search criteria</p>` : ''}
                </td>
            </tr>
        `;
        if (paginationElement) {
            paginationElement.innerHTML = '';
        }
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(clients.length / itemsPerPage);
    if (currentPage > totalPages) {
        currentPage = 1;
    }
    
    // Get current page data
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedClients = clients.slice(start, end);
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Add client rows
    paginatedClients.forEach(client => {
        const fullName = `${client.first_name} ${client.last_name}`;
        const initials = `${client.first_name.charAt(0)}${client.last_name.charAt(0)}`;
        const randomColor = getClientColor(client.client_id);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.client_id}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="client-avatar me-2" style="background-color: ${randomColor};">
                        ${initials}
                    </div>
                    <div>
                        <div class="fw-bold">${fullName}</div>
                        <div class="small text-muted">${client.company_name || ''}</div>
                    </div>
                </div>
            </td>
            <td>${client.email}</td>
            <td>${client.phone || ''}</td>
            <td>${client.company_name || ''}</td>
            <td>${formatDate(client.date_registered)}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(client.status)}">${client.status}</span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-outline-primary" onclick="viewClient('${client.client_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-outline-primary" onclick="editClient('${client.client_id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger" onclick="confirmDeleteClient('${client.client_id}')">
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
            displayClients(clients);
        });
    }
}

/**
 * Get a consistent color based on client ID
 * @param {string} clientId - The client ID
 * @returns {string} - A CSS color
 */
function getClientColor(clientId) {
    const colors = [
        '#4e73df', // Primary
        '#1cc88a', // Success
        '#f6c23e', // Warning
        '#e74a3b', // Danger
        '#36b9cc', // Info
        '#6f42c1', // Purple
        '#fd7e14', // Orange
        '#20c997', // Teal
        '#6c757d'  // Secondary
    ];
    
    // Use the client ID to get a consistent index
    const charSum = clientId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
}

/**
 * Get the appropriate Bootstrap badge class for a status
 * @param {string} status - The status value
 * @returns {string} - The CSS class
 */
function getStatusBadgeClass(status) {
    switch (status) {
        case 'Active':
            return 'bg-success';
        case 'Inactive':
            return 'bg-secondary';
        case 'Suspended':
            return 'bg-warning text-dark';
        default:
            return 'bg-secondary';
    }
}

/**
 * Handle client search input
 * @param {Event} event - The input event
 */
function handleClientSearch(event) {
    const searchQuery = event.target.value.trim();
    currentSearchQuery = searchQuery;
    loadClientsTable(currentSortBy, currentSortOrder, searchQuery);
}

/**
 * Show modal for adding a new client
 */
function showAddClientModal() {
    const modal = document.getElementById('clientModal');
    const form = document.getElementById('client-form');
    const modalTitle = document.getElementById('clientModalLabel');
    
    if (form) {
        form.reset();
    }
    
    if (modalTitle) {
        modalTitle.textContent = 'Add New Client';
    }
    
    // Set current date as default registration date
    const today = new Date().toISOString().split('T')[0];
    
    // Set default values
    document.getElementById('client-id').value = ''; // Clear ID for new client
    document.getElementById('status').value = 'Active';
    document.getElementById('country').value = 'Ireland';
    
    // Clear validation styles
    const inputs = form.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.classList.remove('is-invalid');
    });
    
    // Show the modal
    const clientModal = new bootstrap.Modal(modal);
    clientModal.show();
}

/**
 * View client details
 * @param {string} clientId - The client ID
 */
function viewClient(clientId) {
    if (!clientId) {
        showToast('Invalid client ID', 'error');
        return;
    }
    // Fetch client data
    fetch(`/api/clients/${clientId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load client details');
            return response.json();
        })
        .then(client => {
            // Update view modal with client details
            const fullName = `${client.first_name} ${client.last_name}`;
            const initials = `${client.first_name.charAt(0)}${client.last_name.charAt(0)}`;
            const randomColor = getClientColor(client.client_id);
            
            // Set client ID for reference
            document.getElementById('client-id-display').dataset.clientId = client.id;
            
            // Update view modal elements
            document.getElementById('client-avatar').textContent = initials;
            document.getElementById('client-avatar').style.backgroundColor = randomColor;
            document.getElementById('client-full-name').textContent = fullName;
            document.getElementById('client-id-display').textContent = client.client_id;
            document.getElementById('client-email-display').textContent = client.email;
            document.getElementById('client-phone-display').textContent = client.phone || 'Not provided';
            document.getElementById('client-company-display').textContent = client.company_name || 'Not provided';
            
            const address = [client.address, client.city, client.country]
                .filter(Boolean)
                .join(', ');
            document.getElementById('client-address-display').textContent = address || 'Not provided';
            
            document.getElementById('client-registered-display').textContent = formatDate(client.date_registered);
            document.getElementById('client-status-display').textContent = client.status;
            document.getElementById('client-notes-display').value = client.notes || '';
            
            // Set badge color
            document.getElementById('client-badge-container').innerHTML = `
                <span class="badge ${getStatusBadgeClass(client.status)}">${client.status}</span>
            `;
            
            // Fetch client subscriptions
            fetchClientSubscriptions(client.id);
            
            // Show the modal
            const viewClientModal = new bootstrap.Modal(document.getElementById('viewClientModal'));
            viewClientModal.show();
        })
        .catch(error => {
            console.error('Error viewing client:', error);
            showToast('Failed to load client details. Please try again.', 'error');
        });
}

/**
 * Fetch subscriptions for a client
 * @param {string} clientId - The client ID
 */
function fetchClientSubscriptions(clientId) {
    fetch(`/api/subscriptions?client_id=${clientId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load client subscriptions');
            return response.json();
        })
        .then(subscriptions => {
            const subscriptionsTable = document.getElementById('client-subscriptions-table');
            
            if (subscriptions.length === 0) {
                subscriptionsTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-3">No subscriptions found</td>
                    </tr>
                `;
                return;
            }
            
            subscriptionsTable.innerHTML = '';
            
            subscriptions.forEach(subscription => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="fw-bold">${subscription.service_name}</div>
                        <div class="small text-muted">${subscription.service_category}</div>
                    </td>
                    <td>${formatDate(subscription.start_date)}</td>
                    <td>${subscription.end_date ? formatDate(subscription.end_date) : 'Auto-renew'}</td>
                    <td>
                        <span class="badge ${getSubscriptionStatusBadgeClass(subscription.status)}">${subscription.status}</span>
                    </td>
                    <td>${formatCurrency(subscription.amount)} / ${subscription.billing_cycle}</td>
                    <td>
                        <a href="/subscriptions?id=${subscription.id}" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    </td>
                `;
                subscriptionsTable.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error fetching client subscriptions:', error);
            const subscriptionsTable = document.getElementById('client-subscriptions-table');
            subscriptionsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-3 text-danger">Failed to load subscriptions</td>
                </tr>
            `;
        });
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
 * Edit client
 * @param {string} clientId - The client ID
 */
function editClient(clientId) {
    fetch(`/api/clients/${clientId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load client details');
            return response.json();
        })
        .then(client => {
            const form = document.getElementById('client-form');
            const modalTitle = document.getElementById('clientModalLabel');
            
            if (form) {
                form.reset();
            }
            
            if (modalTitle) {
                modalTitle.textContent = 'Edit Client';
            }
            
            // Set form values
            document.getElementById('client-id').value = client.id;
            document.getElementById('first-name').value = client.first_name;
            document.getElementById('last-name').value = client.last_name;
            document.getElementById('email').value = client.email;
            document.getElementById('phone').value = client.phone || '';
            document.getElementById('company-name').value = client.company_name || '';
            document.getElementById('address').value = client.address || '';
            document.getElementById('city').value = client.city || '';
            document.getElementById('country').value = client.country || 'Ireland';
            document.getElementById('status').value = client.status;
            document.getElementById('notes').value = client.notes || '';
            
            // Clear validation styles
            const inputs = form.querySelectorAll('.form-control');
            inputs.forEach(input => {
                input.classList.remove('is-invalid');
            });
            
            // Show the modal
            const clientModal = new bootstrap.Modal(document.getElementById('clientModal'));
            clientModal.show();
        })
        .catch(error => {
            console.error('Error editing client:', error);
            showToast('Failed to load client details for editing. Please try again.', 'error');
        });
}

/**
 * Confirm client deletion
 * @param {string} clientId - The client ID
 */
function confirmDeleteClient(clientId) {
    fetch(`/api/clients/${clientId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load client details');
            return response.json();
        })
        .then(client => {
            const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.dataset.clientId = client.id;
            }
            
            // Show the modal
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
            deleteModal.show();
        })
        .catch(error => {
            console.error('Error preparing client deletion:', error);
            showToast('Failed to prepare client for deletion. Please try again.', 'error');
        });
}

/**
 * Delete client
 * @param {string} clientId - The client ID
 */
function deleteClient(clientId) {
    fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 400) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Cannot delete client with active subscriptions');
                    });
                }
                throw new Error('Failed to delete client');
            }
            return response.json();
        })
        .then(data => {
            // Close delete modal
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            deleteModal.hide();
            
            // Show success message
            showToast(data.message || 'Client deleted successfully', 'success');
            
            // Reload clients table
            loadClientsTable(currentSortBy, currentSortOrder, currentSearchQuery);
        })
        .catch(error => {
            console.error('Error deleting client:', error);
            showToast(error.message || 'Failed to delete client. Please try again.', 'error');
            
            // Close delete modal
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            deleteModal.hide();
        });
}

/**
 * Handle client form submission
 * @param {Event} event - The submit event
 */
function handleClientFormSubmit(event) {
    event.preventDefault();
    
    // Get form values
    const clientId = document.getElementById('client-id').value.trim();
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const companyName = document.getElementById('company-name').value;
    const address = document.getElementById('address').value;
    const city = document.getElementById('city').value;
    const country = document.getElementById('country').value;
    const status = document.getElementById('status').value;
    const notes = document.getElementById('notes').value;
    
    // Validate form
    const formData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        company_name: companyName,
        address: address,
        city: city,
        country: country,
        status: status,
        notes: notes
    };
    
    const validationResult = validateClientForm(formData);
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
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.classList.remove('is-invalid');
    });
    
    // Determine if this is an edit or create operation
    const isEdit = !!clientId;
    const url = isEdit ? `/api/clients/${clientId}` : '/api/clients';
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
                throw new Error('Failed to save client');
            }
            return response.json();
        })
        .then(data => {
            // Close modal
            const clientModal = bootstrap.Modal.getInstance(document.getElementById('clientModal'));
            clientModal.hide();
            
            // Show success message
            showToast(isEdit ? 'Client updated successfully' : 'Client created successfully', 'success');
            
            // Reload clients table
            loadClientsTable(currentSortBy, currentSortOrder, currentSearchQuery);
        })
        .catch(error => {
            console.error('Error saving client:', error);
            showToast(error.message || 'Failed to save client. Please try again.', 'error');
        });
}

/**
 * Validate client form
 * @param {Object} formData - The form data
 * @returns {Object} - Validation result
 */
function validateClientForm(formData) {
    const errors = [];
    
    // Required fields
    if (!isNotEmpty(formData.first_name)) {
        errors.push({ field: 'first-name', message: 'First name is required' });
    }
    
    if (!isNotEmpty(formData.last_name)) {
        errors.push({ field: 'last-name', message: 'Last name is required' });
    }
    
    if (!isNotEmpty(formData.email)) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!isValidEmail(formData.email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }
    
    if (!isNotEmpty(formData.phone)) {
        errors.push({ field: 'phone', message: 'Phone number is required' });
    } else if (!isValidPhone(formData.phone)) {
        errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
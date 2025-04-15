/**
 * Service management functionality for Blacknight Internet Solutions
 */

// Global variables
let currentPage = 1;
let itemsPerPage = 10;
let totalServices = 0;
let currentSortBy = 'name';
let currentSortOrder = 'asc';
let currentSearchQuery = '';
let currentCategoryFilter = '';
let currentActiveFilter = '';
let isGridView = false;

document.addEventListener('DOMContentLoaded', function() {
    initServicesPage();
});

/**
 * Initialize the services page
 */
function initServicesPage() {
    // Setup search
    const serviceSearchInput = document.getElementById('service-search');
    if (serviceSearchInput) {
        serviceSearchInput.addEventListener('input', debounce(handleServiceSearch, 500));
    }

    // Setup category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            currentCategoryFilter = this.value;
            loadServicesTable(currentSortBy, currentSortOrder, currentSearchQuery);
        });
    }

    // Setup active filter
    const activeFilter = document.getElementById('active-filter');
    if (activeFilter) {
        activeFilter.addEventListener('change', function() {
            currentActiveFilter = this.value;
            loadServicesTable(currentSortBy, currentSortOrder, currentSearchQuery);
        });
    }

    // Setup sort dropdown
    const serviceSort = document.getElementById('service-sort');
    if (serviceSort) {
        serviceSort.addEventListener('change', function() {
            const [sortBy, sortOrder] = this.value.split('-');
            loadServicesTable(sortBy, sortOrder, currentSearchQuery);
        });
    }

    // Setup sort controls in table headers
    setupSortControls('services-table', loadServicesTable);

    // Setup add service button
    const addServiceBtn = document.getElementById('add-service-btn');
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', showAddServiceModal);
    }

    // Setup save service button
    const saveServiceBtn = document.getElementById('save-service-btn');
    if (saveServiceBtn) {
        saveServiceBtn.addEventListener('click', handleServiceFormSubmit);
    }

    // Setup edit service button in view modal
    const editServiceBtn = document.getElementById('edit-service-btn');
    if (editServiceBtn) {
        editServiceBtn.addEventListener('click', function() {
            const serviceId = document.getElementById('view-service-id').dataset.serviceId;
            if (serviceId) {
                // Close view modal
                const viewServiceModal = bootstrap.Modal.getInstance(document.getElementById('viewServiceModal'));
                viewServiceModal.hide();

                // Open edit modal
                editService(serviceId);
            }
        });
    }

    // Add event listener for delete confirmation
    const confirmDeleteBtn = document.getElementById('confirm-delete-service-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const serviceId = this.dataset.serviceId;
            if (serviceId) {
                deleteService(serviceId);
            }
        });
    }

    // Setup view switcher
    const tableViewBtn = document.getElementById('table-view-btn');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const tableView = document.getElementById('table-view');
    const gridView = document.getElementById('services-grid');

    if (tableViewBtn && gridViewBtn && tableView && gridView) {
        tableViewBtn.addEventListener('click', function() {
            isGridView = false;
            tableView.style.display = 'block';
            gridView.style.display = 'none';
            tableViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
        });

        gridViewBtn.addEventListener('click', function() {
            isGridView = true;
            tableView.style.display = 'none';
            gridView.style.display = 'block';
            gridViewBtn.classList.add('active');
            tableViewBtn.classList.remove('active');

            // Reload grid view
            loadServicesGrid(currentSortBy, currentSortOrder, currentSearchQuery);
        });
    }

    // Initial load
    loadServicesTable(currentSortBy, currentSortOrder, currentSearchQuery);
}

/**
 * Load services table with sorting and filtering
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc or desc)
 * @param {string} searchQuery - Search query
 */
function loadServicesTable(sortBy = 'name', sortOrder = 'asc', searchQuery = '') {
    currentSortBy = sortBy;
    currentSortOrder = sortOrder;
    currentSearchQuery = searchQuery;

    // Show loading indicator
    const tableBody = document.getElementById('services-table-body');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading services...</p>
                </td>
            </tr>
        `;
    }

    // Build API URL with query parameters
    let apiUrl = `/api/services?sort_by=${sortBy}&sort_order=${sortOrder}`;
    if (searchQuery) {
        apiUrl += `&search=${encodeURIComponent(searchQuery)}`;
    }

    // Fetch services from API
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load services');
            return response.json();
        })
        .then(services => {
            // Filter by category if needed
            if (currentCategoryFilter) {
                services = services.filter(service => service.category === currentCategoryFilter);
            }

            // Filter by active status if needed
            if (currentActiveFilter) {
                const isActive = currentActiveFilter === 'true';
                services = services.filter(service => service.is_active === isActive);
            }

            displayServices(services);

            // Update grid view if active
            if (isGridView) {
                loadServicesGrid(sortBy, sortOrder, searchQuery, services);
            }
        })
        .catch(error => {
            console.error('Error loading services:', error);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4 text-danger">
                            <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                            <p>Failed to load services. Please try again.</p>
                        </td>
                    </tr>
                `;
            }
            showToast('Failed to load services. Please try again.', 'error');
        });
}

/**
 * Display services in the table
 * @param {Array} services - Array of service objects
 */
function displayServices(services) {
    const tableBody = document.getElementById('services-table-body');
    const totalServicesElement = document.getElementById('total-services');
    const paginationElement = document.getElementById('services-pagination');

    if (!tableBody) return;

    // Update total count
    totalServices = services.length;
    if (totalServicesElement) {
        totalServicesElement.textContent = totalServices;
    }

    // If no services found
    if (services.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <p class="mb-0 text-muted">No services found</p>
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
    const totalPages = Math.ceil(services.length / itemsPerPage);
    if (currentPage > totalPages) {
        currentPage = 1;
    }

    // Get current page data
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedServices = services.slice(start, end);

    // Clear existing content
    tableBody.innerHTML = '';

    // Add service rows
    paginatedServices.forEach(service => {
        const row = document.createElement('tr');

        // Get icon class based on category
        const iconClass = getCategoryIconClass(service.category);

        // Truncate description to 50 characters with ellipsis
        const shortDescription = service.description ? (service.description.length > 50 ? service.description.substring(0, 50) + '...' : service.description) : '';

        row.innerHTML = `
            <td>${service.service_id}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="service-icon me-2 ${iconClass}">
                        <i class="${getCategoryIcon(service.category)}"></i>
                    </div>
                    <div>
                        <div class="fw-bold">${service.name}</div>
                        <div class="small text-muted">${service.category || ''}</div>
                    </div>
                </div>
            </td>
            <td>${service.category || ''}</td>
            <td>${shortDescription}</td>
            <td>${formatCurrency(service.price)}</td>
            <td>${service.billing_cycle || 'Monthly'}</td>
            <td>
                <span class="badge ${service.is_active ? 'bg-success-soft' : 'bg-danger-soft'}">${service.is_active ? 'Active' : 'Inactive'}</span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-outline-primary" onclick="viewService('${service.service_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-outline-primary" onclick="editService('${service.service_id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger" onclick="confirmDeleteService('${service.service_id}')">
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
            displayServices(services);
        });
    }
}

/**
 * Load services in grid view
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc or desc)
 * @param {string} searchQuery - Search query
 * @param {Array} services - Optional services array if already loaded
 */
function loadServicesGrid(sortBy = 'name', sortOrder = 'asc', searchQuery = '', services = null) {
    const gridContainer = document.getElementById('services-grid');
    if (!gridContainer) return;

    // Show loading indicator if services not provided
    if (!services) {
        gridContainer.innerHTML = `
            <div class="col-12 text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading services...</p>
            </div>
        `;

        // Use existing loading function to get services
        let apiUrl = `/api/services?sort_by=${sortBy}&sort_order=${sortOrder}`;
        if (searchQuery) {
            apiUrl += `&search=${encodeURIComponent(searchQuery)}`;
        }

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) throw new Error('Failed to load services');
                return response.json();
            })
            .then(fetchedServices => {
                // Filter by category if needed
                if (currentCategoryFilter) {
                    fetchedServices = fetchedServices.filter(service => service.category === currentCategoryFilter);
                }

                // Filter by active status if needed
                if (currentActiveFilter) {
                    const isActive = currentActiveFilter === 'true';
                    fetchedServices = fetchedServices.filter(service => service.is_active === isActive);
                }

                displayServicesGrid(fetchedServices);
            })
            .catch(error => {
                console.error('Error loading services grid:', error);
                gridContainer.innerHTML = `
                    <div class="col-12 text-center py-4 text-danger">
                        <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                        <p>Failed to load services. Please try again.</p>
                    </div>
                `;
                showToast('Failed to load services grid. Please try again.', 'error');
            });
    } else {
        // Use provided services array
        displayServicesGrid(services);
    }
}

/**
 * Display services in grid view
 * @param {Array} services - Array of service objects
 */
function displayServicesGrid(services) {
    const gridContainer = document.getElementById('services-grid');
    if (!gridContainer) return;

    // If no services found
    if (services.length === 0) {
        gridContainer.innerHTML = `
            <div class="col-12 text-center py-4">
                <p class="mb-0 text-muted">No services found</p>
                ${currentSearchQuery ? `<p class="mb-0 text-muted small">Try adjusting your search criteria</p>` : ''}
            </div>
        `;
        return;
    }

    // Clear existing content
    gridContainer.innerHTML = '';

    // Add service cards
    services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'col-md-4 col-lg-3';

        // Get icon class based on category
        const iconClass = getCategoryIconClass(service.category);

        // Truncate description to 100 characters with ellipsis
        const shortDescription = service.description ? (service.description.length > 100 ? service.description.substring(0, 100) + '...' : service.description) : '';

        card.innerHTML = `
            <div class="card h-100 subscription-card">
                <div class="card-body text-center">
                    <div class="service-icon mx-auto my-3 ${iconClass}">
                        <i class="${getCategoryIcon(service.category)}"></i>
                    </div>
                    <h5 class="card-title">${service.name}</h5>
                    <div class="badge ${service.is_active ? 'bg-success-soft' : 'bg-danger-soft'} mb-2">${service.is_active ? 'Active' : 'Inactive'}</div>
                    <p class="card-text small text-muted">${shortDescription}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="text-primary fw-bold">${formatCurrency(service.price)}</span>
                        <span class="text-muted small">${service.billing_cycle || 'Monthly'}</span>
                    </div>
                </div>
                <div class="card-footer bg-transparent border-top-0 d-flex justify-content-between">
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="viewService('${service.id}')">
                        <i class="fas fa-eye me-1"></i> View
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="editService('${service.id}')">
                        <i class="fas fa-edit me-1"></i> Edit
                    </button>
                </div>
            </div>
        `;
        gridContainer.appendChild(card);
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
 * Handle service search input
 * @param {Event} event - The input event
 */
function handleServiceSearch(event) {
    const searchQuery = event.target.value.trim();
    currentSearchQuery = searchQuery;
    loadServicesTable(currentSortBy, currentSortOrder, searchQuery);
}

/**
 * Show modal for adding a new service
 */
function showAddServiceModal() {
    const modal = document.getElementById('serviceModal');
    const form = document.getElementById('service-form');
    const modalTitle = document.getElementById('serviceModalLabel');

    if (form) {
        form.reset();
    }

    if (modalTitle) {
        modalTitle.textContent = 'Add New Service';
    }

    // Set default values
    document.getElementById('service-id').value = ''; // Clear ID for new service
    document.getElementById('service-active').checked = true;
    document.getElementById('service-billing-cycle').value = 'Monthly';

    // Clear validation styles
    const inputs = form.querySelectorAll('.form-control, .form-select');
    inputs.forEach(input => {
        input.classList.remove('is-invalid');
    });

    // Show the modal
    const serviceModal = new bootstrap.Modal(modal);
    serviceModal.show();
}

/**
 * View service details
 * @param {string} serviceId - The service ID
 */
function viewService(serviceId) {
    if (!serviceId) {
        showToast('Invalid service ID', 'error');
        return;
    }
    // Fetch service data  
    fetch(`/api/services/${serviceId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load service details');
            return response.json();
        })
        .then(service => {
            // Set service ID for reference
            document.getElementById('view-service-id').textContent = service.service_id;
            document.getElementById('view-service-id').dataset.serviceId = service.id;

            // Update view modal elements
            document.getElementById('view-service-name').textContent = service.name;
            document.getElementById('view-service-category').textContent = service.category || 'Uncategorized';
            document.getElementById('view-service-description').textContent = service.description || 'No description available.';
            document.getElementById('view-service-price').textContent = formatCurrency(service.price);
            document.getElementById('view-service-billing').textContent = `per ${service.billing_cycle.toLowerCase() || 'month'}`;
            document.getElementById('view-service-status').textContent = service.is_active ? 'Active' : 'Inactive';
            document.getElementById('view-service-status').className = service.is_active ? 'badge bg-success-soft mb-3' : 'badge bg-danger-soft mb-3';

            // Set icon
            const iconClass = getCategoryIconClass(service.category);
            const iconElement = document.getElementById('view-service-icon');
            iconElement.className = `service-icon mx-auto ${iconClass}`;
            iconElement.innerHTML = `<i class="${getCategoryIcon(service.category)}"></i>`;

            // Handle features
            const featuresContainer = document.getElementById('view-service-features');
            if (featuresContainer) {
                try {
                    const features = service.features ? JSON.parse(service.features) : {};

                    if (Object.keys(features).length === 0) {
                        featuresContainer.innerHTML = '<p class="text-muted">No features specified</p>';
                    } else {
                        featuresContainer.innerHTML = '';

                        for (const [key, value] of Object.entries(features)) {
                            const featureItem = document.createElement('li');
                            featureItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                            featureItem.innerHTML = `
                                ${key}
                                <span>${value}</span>
                            `;
                            featuresContainer.appendChild(featureItem);
                        }
                    }
                } catch (error) {
                    console.error('Error parsing features:', error);
                    featuresContainer.innerHTML = '<p class="text-danger">Error parsing features data</p>';
                }
            }

            // Fetch subscription count
            fetch('/api/subscriptions')
                .then(response => response.json())
                .then(subscriptions => {
                    const serviceSubscriptions = subscriptions.filter(s => s.service_id === service.id);
                    document.getElementById('view-service-subscriptions-count').textContent = `Current subscribers: ${serviceSubscriptions.length}`;
                })
                .catch(error => {
                    console.error('Error fetching subscription count:', error);
                    document.getElementById('view-service-subscriptions-count').textContent = 'Unable to load subscription count';
                });

            // Show the modal
            const viewServiceModal = new bootstrap.Modal(document.getElementById('viewServiceModal'));
            viewServiceModal.show();
        })
        .catch(error => {
            console.error('Error viewing service:', error);
            showToast('Failed to load service details. Please try again.', 'error');
        });
}

/**
 * Edit service
 * @param {string} serviceId - The service ID
 */
function editService(serviceId) {
    fetch(`/api/services/${serviceId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load service details');
            return response.json();
        })
        .then(service => {
            const form = document.getElementById('service-form');
            const modalTitle = document.getElementById('serviceModalLabel');

            if (form) {
                form.reset();
            }

            if (modalTitle) {
                modalTitle.textContent = 'Edit Service';
            }

            // Set form values
            document.getElementById('service-id').value = service.id;
            document.getElementById('service-name').value = service.name;
            document.getElementById('service-category').value = service.category || '';
            document.getElementById('service-description').value = service.description || '';
            document.getElementById('service-price').value = service.price;
            document.getElementById('service-billing-cycle').value = service.billing_cycle || 'Monthly';
            document.getElementById('service-active').checked = service.is_active;
            document.getElementById('service-features').value = service.features || '';

            // Clear validation styles
            const inputs = form.querySelectorAll('.form-control, .form-select');
            inputs.forEach(input => {
                input.classList.remove('is-invalid');
            });

            // Show the modal
            const serviceModal = new bootstrap.Modal(document.getElementById('serviceModal'));
            serviceModal.show();
        })
        .catch(error => {
            console.error('Error editing service:', error);
            showToast('Failed to load service details for editing. Please try again.', 'error');
        });
}

/**
 * Confirm service deletion
 * @param {string} serviceId - The service ID
 */
function confirmDeleteService(serviceId) {
    fetch(`/api/services/${serviceId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load service details');
            return response.json();
        })
        .then(service => {
            const confirmDeleteBtn = document.getElementById('confirm-delete-service-btn');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.dataset.serviceId = service.id;
            }

            // Set modal text
            const deleteModalLabel = document.getElementById('deleteServiceModalLabel');
            if (deleteModalLabel) {
                deleteModalLabel.textContent = `Delete ${service.name}?`;
            }

            // Show the modal
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteServiceModal'));
            deleteModal.show();
        })
        .catch(error => {
            console.error('Error preparing service deletion:', error);
            showToast('Failed to prepare service for deletion. Please try again.', 'error');
        });
}

/**
 * Delete service
 * @param {string} serviceId - The service ID
 */
function deleteService(serviceId) {
    fetch(`/api/services/${serviceId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 400) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Cannot delete service with active subscriptions');
                    });
                }
                throw new Error('Failed to delete service');
            }
            return response.json();
        })
        .then(data => {
            // Close delete modal
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteServiceModal'));
            deleteModal.hide();

            // Show success message
            showToast(data.message || 'Service deleted successfully', 'success');

            // Reload services table
            loadServicesTable(currentSortBy, currentSortOrder, currentSearchQuery);
        })
        .catch(error => {
            console.error('Error deleting service:', error);
            showToast(error.message || 'Failed to delete service. Please try again.', 'error');

            // Close delete modal
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteServiceModal'));
            deleteModal.hide();
        });
}

/**
 * Handle service form submission
 * @param {Event} event - The submit event
 */
function handleServiceFormSubmit(event) {
    event.preventDefault();

    // Get form values
    const serviceId = document.getElementById('service-id').value.trim();
    const name = document.getElementById('service-name').value;
    const category = document.getElementById('service-category').value;
    const description = document.getElementById('service-description').value;
    const price = document.getElementById('service-price').value;
    const billingCycle = document.getElementById('service-billing-cycle').value;
    const isActive = document.getElementById('service-active').checked;
    const features = document.getElementById('service-features').value;

    // Validate form
    const formData = {
        name: name,
        category: category,
        description: description,
        price: price,
        billing_cycle: billingCycle,
        is_active: isActive,
        features: features
    };

    const validationResult = validateServiceForm(formData);
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
    const isEdit = !!serviceId;
    const url = isEdit ? `/api/services/${serviceId}` : '/api/services';
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
                throw new Error('Failed to save service');
            }
            return response.json();
        })
        .then(data => {
            // Close modal
            const serviceModal = bootstrap.Modal.getInstance(document.getElementById('serviceModal'));
            serviceModal.hide();

            // Show success message
            showToast(isEdit ? 'Service updated successfully' : 'Service created successfully', 'success');

            // Reload services table
            loadServicesTable(currentSortBy, currentSortOrder, currentSearchQuery);
        })
        .catch(error => {
            console.error('Error saving service:', error);
            showToast(error.message || 'Failed to save service. Please try again.', 'error');
        });
}

/**
 * Validate service form
 * @param {Object} formData - The form data
 * @returns {Object} - Validation result
 */
function validateServiceForm(formData) {
    const errors = [];

    // Required fields
    if (!isNotEmpty(formData.name)) {
        errors.push({ field: 'service-name', message: 'Service name is required' });
    }

    if (!isNotEmpty(formData.category)) {
        errors.push({ field: 'service-category', message: 'Category is required' });
    }

    if (!isNotEmpty(formData.description)) {
        errors.push({ field: 'service-description', message: 'Description is required' });
    }

    if (!isNotEmpty(formData.price)) {
        errors.push({ field: 'service-price', message: 'Price is required' });
    } else if (!isValidNumber(formData.price, 0)) {
        errors.push({ field: 'service-price', message: 'Price must be a positive number' });
    }

    // Validate features JSON if provided
    if (isNotEmpty(formData.features)) {
        try {
            JSON.parse(formData.features);
        } catch (e) {
            errors.push({ field: 'service-features', message: 'Features must be valid JSON' });
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
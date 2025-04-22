// State variables
let currentPage = 1;
const itemsPerPage = 10;
let filteredDeployments = [];
let allDeployments = [];
let projectList = [];
let environmentList = [];
let deploymentChart = null;
let trendChart = null;

// DOM Elements
const deploymentContainer = document.getElementById('deploymentsContainer');
const totalDeploymentsEl = document.getElementById('total-deployments');
const successfulDeploymentsEl = document.getElementById('successful-deployments');
const failedDeploymentsEl = document.getElementById('failed-deployments');
const refreshBtn = document.getElementById('refresh-btn');
const applyFiltersBtn = document.getElementById('apply-filters');
const resetFiltersBtn = document.getElementById('reset-filters');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfoEl = document.getElementById('page-info');
const projectFilterEl = document.getElementById('project-filter');
const environmentFilterEl = document.getElementById('environment-filter');
const statusFilterEl = document.getElementById('status-filter');
const dateFilterEl = document.getElementById('date-filter');
const sortSelectEl = document.getElementById('sort-select');
const itemsPerPageEl = document.getElementById('items-per-page');

// Charts
let envChart = null;
let statusChart = null;

// State Management
let deployments = [];
let isLoading = true;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadData();
});

// Setup event listeners
function initEventListeners() {
    if (refreshBtn) refreshBtn.addEventListener('click', loadData);
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
    if (sortSelectEl) sortSelectEl.addEventListener('change', sortDeployments);
    if (itemsPerPageEl) itemsPerPageEl.addEventListener('change', () => {
        itemsPerPage = parseInt(itemsPerPageEl.value);
        renderDeployments();
    });
    
    // Sort buttons in Recent Deployments section
    const sortNewestBtn = document.getElementById('sortNewestBtn');
    const sortOldestBtn = document.getElementById('sortOldestBtn');
    
    if (sortNewestBtn) {
        sortNewestBtn.addEventListener('click', () => {
            filteredDeployments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            renderDeployments();
        });
    }
    
    if (sortOldestBtn) {
        sortOldestBtn.addEventListener('click', () => {
            filteredDeployments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            renderDeployments();
        });
    }
}

// Fetch data from the server
function loadData() {
    showLoading();
    
    fetch('/api/v1/deployments')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            deployments = data;
            filteredDeployments = [...deployments];
            
            // Varsayılan olarak tarihe göre sırala (en yeni en üstte)
            filteredDeployments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            updateUI();
            populateFilters();
            renderCharts();
            hideLoading();
        })
        .catch(error => {
            console.error('Error loading data:', error);
            hideLoading();
            showError('Failed to load deployment data. Please try again.');
        });
}

// Loading state management
function showLoading() {
    isLoading = true;
    const loadingEl = document.getElementById('loadingSpinner');
    const noDataEl = document.getElementById('noDataMessage');
    
    if (loadingEl) loadingEl.style.display = 'block';
    if (noDataEl) noDataEl.style.display = 'none';
    if (deploymentContainer) deploymentContainer.innerHTML = '';
}

function hideLoading() {
    isLoading = false;
    const loadingEl = document.getElementById('loadingSpinner');
    if (loadingEl) loadingEl.style.display = 'none';
}

// Render deployments list
function renderDeployments() {
    if (isLoading || !deploymentContainer) return;
    
    // Sayfaya göre deployment'ları filtrele
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageDeployments = filteredDeployments.slice(startIndex, endIndex);
    
    // Veri yoksa mesaj göster
    if (filteredDeployments.length === 0) {
        const noDataEl = document.getElementById('noDataMessage');
        if (noDataEl) {
            noDataEl.innerHTML = `
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <p class="lead text-muted">API'den veri bulunamadı</p>
                <p class="text-muted">Lütfen Azure DevOps bağlantınızı kontrol edin.</p>
            `;
            noDataEl.style.display = 'block';
        }
        deploymentContainer.innerHTML = '';
        return;
    }
    
    // Geçerli sayfada veri yoksa mesaj göster
    if (pageDeployments.length === 0) {
        const noDataEl = document.getElementById('noDataMessage');
        if (noDataEl) {
            noDataEl.innerHTML = `
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <p class="lead text-muted">Filtrelere uygun veri bulunamadı</p>
                <button class="btn btn-outline-secondary" id="resetFiltersBtn2">
                    <i class="fas fa-undo me-1"></i>Filtreleri Sıfırla
                </button>
            `;
            noDataEl.style.display = 'block';
        }
        deploymentContainer.innerHTML = '';
        return;
    }
    
    // Veri varsa "no data" mesajını gizle
    const noDataEl = document.getElementById('noDataMessage');
    if (noDataEl) noDataEl.style.display = 'none';
    
    let html = '';
    
    pageDeployments.forEach(deployment => {
        // Determine status class and icon
        let statusClass, statusIcon;
        switch ((deployment.status || '').toLowerCase()) {
            case 'succeeded':
            case 'success':
                statusClass = 'bg-success';
                statusIcon = 'fa-check-circle';
                break;
            case 'failed':
            case 'failure':
                statusClass = 'bg-danger';
                statusIcon = 'fa-times-circle';
                break;
            case 'in progress':
            case 'in_progress':
                statusClass = 'bg-warning';
                statusIcon = 'fa-spinner fa-pulse';
                break;
            default:
                statusClass = 'bg-secondary';
                statusIcon = 'fa-question-circle';
        }
        
        // Format date
        const deployDate = moment(deployment.timestamp).format('MMM D, YYYY • h:mm A');
        
        html += `
            <div class="card mb-3 deployment-card" data-id="${deployment.id || ''}">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h5 class="card-title mb-1">${deployment.project_name || deployment.project || ''}</h5>
                            <p class="text-muted small mb-2">${deployment.pipeline_name || deployment.pipeline || ''}</p>
                            <div class="d-flex align-items-center">
                                <span class="badge ${statusClass} me-2 px-3 py-2">
                                    <i class="fas ${statusIcon} me-1"></i>
                                    ${deployment.status || ''}
                                </span>
                                <span class="badge bg-light text-dark border">
                                    <i class="fas fa-server me-1"></i>
                                    ${deployment.environment || ''}
                                </span>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <p class="mb-1 small text-muted">
                                <i class="far fa-calendar-alt me-2"></i>
                                ${deployDate}
                            </p>
                            <p class="mb-1 small text-muted">
                                <i class="far fa-clock me-2"></i>
                                Duration: ${deployment.duration || 'N/A'}
                            </p>
                            <p class="mb-0 small text-muted">
                                <i class="far fa-user me-2"></i>
                                ${deployment.triggered_by || deployment.triggeredBy || 'N/A'}
                            </p>
                        </div>
                        <div class="col-md-2 d-flex align-items-center justify-content-end">
                            <button class="btn btn-outline-primary btn-sm view-details" data-id="${deployment.id || ''}">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    deploymentContainer.innerHTML = html;
    
    // Add event listeners to detail buttons
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', () => showDeploymentDetails(button.dataset.id));
    });
    
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredDeployments.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }
    
    if (currentPage < 1) {
        currentPage = 1;
    }
    
    // Update page info
    const currentCountEl = document.getElementById('currentCount');
    const totalCountEl = document.getElementById('totalCount');
    
    if (currentCountEl && totalCountEl) {
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(startItem + itemsPerPage - 1, filteredDeployments.length);
        
        if (filteredDeployments.length > 0) {
            currentCountEl.textContent = `${startItem}-${endItem}`;
        } else {
            currentCountEl.textContent = '0';
        }
        
        totalCountEl.textContent = filteredDeployments.length;
    }
    
    // Update pagination container
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" id="prevPageBtn" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        // Show only 5 pages around current page
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link page-number" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += `
                <li class="page-item disabled">
                    <a class="page-link" href="#">...</a>
                </li>
            `;
        }
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" id="nextPageBtn" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // Add event listeners
    document.getElementById('prevPageBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            changePage(currentPage - 1);
        }
    });
    
    document.getElementById('nextPageBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            changePage(currentPage + 1);
        }
    });
    
    document.querySelectorAll('.page-number').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(parseInt(link.dataset.page));
        });
    });
}

// Handle page changes
function changePage(newPage) {
    if (newPage < 1 || newPage > Math.ceil(filteredDeployments.length / itemsPerPage)) return;
    
    currentPage = newPage;
    renderDeployments();
    
    // Scroll to top of deployment container
    if (deploymentContainer) {
        deploymentContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

// Update dashboard stats
function updateStats() {
    if (!totalDeploymentsEl || !successfulDeploymentsEl || !failedDeploymentsEl) return;
    
    const successCount = deployments.filter(d => (d.status || '').toLowerCase() === 'succeeded').length;
    const failedCount = deployments.filter(d => (d.status || '').toLowerCase() === 'failed').length;
    
    totalDeploymentsEl.textContent = deployments.length;
    successfulDeploymentsEl.textContent = successCount;
    failedDeploymentsEl.textContent = failedCount;
}

// Update all UI elements
function updateUI() {
    updateStats();
    renderDeployments();
}

// Populate filter dropdowns
function populateFilters() {
    if (!projectFilterEl || !environmentFilterEl) return;
    
    // Extract unique projects
    const projects = [...new Set(deployments.map(d => d.project_name || d.project || ''))].filter(p => p);
    
    // Extract unique environments
    const environments = [...new Set(deployments.map(d => d.environment || ''))].filter(e => e);
    
    // Clear existing options
    projectFilterEl.innerHTML = '<option value="">All Projects</option>';
    environmentFilterEl.innerHTML = '<option value="">All Environments</option>';
    
    // Add project options
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectFilterEl.appendChild(option);
    });
    
    // Add environment options
    environments.forEach(env => {
        const option = document.createElement('option');
        option.value = env;
        option.textContent = env;
        environmentFilterEl.appendChild(option);
    });
}

// Apply selected filters
function applyFilters() {
    if (!projectFilterEl || !environmentFilterEl || !statusFilterEl || !dateFilterEl) return;
    
    const projectFilter = projectFilterEl.value;
    const environmentFilter = environmentFilterEl.value;
    const statusFilter = statusFilterEl.value;
    const dateFilter = dateFilterEl.value;
    
    filteredDeployments = deployments.filter(d => {
        // Project filter
        if (projectFilter && (d.project_name !== projectFilter && d.project !== projectFilter)) {
            return false;
        }
        
        // Environment filter
        if (environmentFilter && d.environment !== environmentFilter) {
            return false;
        }
        
        // Status filter
        if (statusFilter && (d.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
            return false;
        }
        
        // Date filter
        if (dateFilter) {
            const deployDate = new Date(d.timestamp);
            const now = new Date();
            
            switch (dateFilter) {
                case 'today':
                    return deployDate.toDateString() === now.toDateString();
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(now.getDate() - 1);
                    return deployDate.toDateString() === yesterday.toDateString();
                case 'this-week':
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - now.getDay());
                    return deployDate >= weekStart;
                case 'this-month':
                    return deployDate.getMonth() === now.getMonth() && deployDate.getFullYear() === now.getFullYear();
                case 'last-30-days':
                    const thirtyDaysAgo = new Date(now);
                    thirtyDaysAgo.setDate(now.getDate() - 30);
                    return deployDate >= thirtyDaysAgo;
            }
        }
        
        return true;
    });
    
    currentPage = 1;
    renderDeployments();
}

// Reset all filters
function resetFilters() {
    if (!projectFilterEl || !environmentFilterEl || !statusFilterEl || !dateFilterEl) return;
    
    projectFilterEl.value = '';
    environmentFilterEl.value = '';
    statusFilterEl.value = '';
    dateFilterEl.selectedIndex = 0;
    
    filteredDeployments = [...deployments];
    currentPage = 1;
    
    sortDeployments();
}

// Sort deployments
function sortDeployments() {
    if (!sortSelectEl) {
        // Default sorting by date (newest first)
        filteredDeployments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        renderDeployments();
        return;
    }
    
    const sortBy = sortSelectEl.value;
    
    switch (sortBy) {
        case 'date-desc':
            filteredDeployments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            break;
        case 'date-asc':
            filteredDeployments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            break;
        case 'duration-desc':
            filteredDeployments.sort((a, b) => {
                const aDuration = convertDurationToSeconds(a.duration);
                const bDuration = convertDurationToSeconds(b.duration);
                return bDuration - aDuration;
            });
            break;
        case 'duration-asc':
            filteredDeployments.sort((a, b) => {
                const aDuration = convertDurationToSeconds(a.duration);
                const bDuration = convertDurationToSeconds(b.duration);
                return aDuration - bDuration;
            });
            break;
    }
    
    renderDeployments();
}

// Helper to convert duration string to seconds
function convertDurationToSeconds(durationStr) {
    if (!durationStr || durationStr === 'N/A') return 0;
    
    const durationParts = durationStr.match(/(\d+)\s*min\s*(\d+)\s*sec/);
    if (durationParts) {
        return parseInt(durationParts[1]) * 60 + parseInt(durationParts[2]);
    }
    
    return 0;
}

// Show deployment details
function showDeploymentDetails(deploymentId) {
    const deployment = deployments.find(d => d.id === deploymentId);
    
    // If no deployment found or ID is empty, don't show modal
    if (!deployment || !deploymentId) return;
    
    const deploymentDetailsModal = new bootstrap.Modal(document.getElementById('deploymentDetailsModal'));
    
    // Set modal title and details
    document.getElementById('deploymentModalLabel').textContent = `Deployment Details: ${deployment.pipeline_name || deployment.pipeline || ''}`;
    
    // Format the details HTML
    const detailsHTML = `
        <div class="deployment-details">
            <div class="row mb-3">
                <div class="col-md-6">
                    <p><strong>Project:</strong> ${deployment.project_name || deployment.project || ''}</p>
                    <p><strong>Pipeline:</strong> ${deployment.pipeline_name || deployment.pipeline || ''}</p>
                    <p><strong>Environment:</strong> ${deployment.environment || ''}</p>
                    <p><strong>Status:</strong> ${deployment.status || ''}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Date:</strong> ${moment(deployment.timestamp).format('MMM D, YYYY • h:mm A')}</p>
                    <p><strong>Duration:</strong> ${deployment.duration || 'N/A'}</p>
                    <p><strong>Triggered By:</strong> ${deployment.triggered_by || deployment.triggeredBy || 'N/A'}</p>
                    <p><strong>Commit:</strong> ${deployment.commit || 'N/A'}</p>
                </div>
            </div>
            <div class="deployment-steps mt-4">
                <h5>Deployment Steps</h5>
                ${renderDeploymentSteps(deployment.steps || [])}
            </div>
        </div>
    `;
    
    document.getElementById('deploymentModalBody').innerHTML = detailsHTML;
    
    // Show the modal
    deploymentDetailsModal.show();
}

// Render deployment steps
function renderDeploymentSteps(steps) {
    if (!steps || steps.length === 0) {
        return '<p class="text-muted">No steps information available</p>';
    }
    
    let stepsHTML = '<div class="table-responsive"><table class="table table-sm table-striped">';
    stepsHTML += '<thead><tr><th>Step</th><th>Status</th><th>Duration</th></tr></thead><tbody>';
    
    steps.forEach(step => {
        let statusClass;
        switch ((step.status || '').toLowerCase()) {
            case 'succeeded':
            case 'success':
                statusClass = 'text-success';
                break;
            case 'failed':
            case 'failure':
                statusClass = 'text-danger';
                break;
            case 'in progress':
            case 'in_progress':
                statusClass = 'text-warning';
                break;
            default:
                statusClass = 'text-secondary';
        }
        
        stepsHTML += `
            <tr>
                <td>${step.name || ''}</td>
                <td class="${statusClass}">${step.status || ''}</td>
                <td>${step.duration || 'N/A'}</td>
            </tr>
        `;
    });
    
    stepsHTML += '</tbody></table></div>';
    return stepsHTML;
}

// Show error message
function showError(message) {
    // Implement error notification here
    console.error(message);
    
    // Show alert
    const alertHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = alertHTML;
    }
}

// Helper function to format date
function formatDate(dateStr) {
    return moment(dateStr).format('MMM D, YYYY • h:mm A');
}

// Environment distribution chart
function renderEnvChart() {
    const ctx = document.getElementById('env-chart');
    if (!ctx) return;
    
    // Count deployments by environment
    const envCounts = {
        'Development': 0,
        'Test': 0,
        'Production': 0
    };
    
    deployments.forEach(deployment => {
        const env = deployment.environment;
        if (env && envCounts.hasOwnProperty(env)) {
            envCounts[env]++;
        }
    });
    
    // Prepare data for chart
    const labels = Object.keys(envCounts);
    const data = Object.values(envCounts);
    
    // Define colors for environments
    const colors = [
        'rgba(75, 192, 192, 0.7)',  // Teal - Development
        'rgba(255, 206, 86, 0.7)',  // Yellow - Test
        'rgba(54, 162, 235, 0.7)'   // Blue - Production
    ];
    
    // Destroy existing chart if it exists
    if (envChart) envChart.destroy();
    
    envChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Status distribution chart
function renderStatusChart() {
    const ctx = document.getElementById('status-chart');
    if (!ctx) return;
    
    // Count deployments by status
    const statusCounts = {
        'Succeeded': 0,
        'Failed': 0,
        'In Progress': 0
    };
    
    deployments.forEach(deployment => {
        const status = deployment.status;
        if (status) {
            if (status.toLowerCase() === 'succeeded' || status.toLowerCase() === 'success') {
                statusCounts['Succeeded']++;
            } else if (status.toLowerCase() === 'failed' || status.toLowerCase() === 'failure') {
                statusCounts['Failed']++;
            } else if (status.toLowerCase() === 'in progress' || status.toLowerCase() === 'in_progress') {
                statusCounts['In Progress']++;
            }
        }
    });
    
    // Prepare data for chart
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    
    // Define colors based on status
    const colors = [
        'rgba(46, 204, 113, 0.7)',  // Green - Succeeded
        'rgba(231, 76, 60, 0.7)',   // Red - Failed
        'rgba(241, 196, 15, 0.7)'   // Yellow - In Progress
    ];
    
    // Destroy existing chart if it exists
    if (statusChart) statusChart.destroy();
    
    statusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Deployments',
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Render all charts
function renderCharts() {
    renderEnvChart();
    renderStatusChart();
} 
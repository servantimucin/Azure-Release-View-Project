// State variables
let deployments = [];
let filteredDeployments = [];
let currentPage = 1;
let itemsPerPage = 10;
let isLoading = true;

// Initialize on document load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners
    initializeEventListeners();
    
    // Load data from API
    loadData();
});

function initializeEventListeners() {
    // Refresh button
    const refreshBtn = document.querySelector('.btn-light i.fa-sync-alt').parentElement;
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadData);
    }
    
    // Apply filters button
    const applyFiltersBtn = document.querySelector('.btn-azure');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // Reset filters button
    const resetFiltersBtn = document.querySelector('.btn-light.me-2');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Sort select
    const sortSelect = document.querySelector('.form-select-sm');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            if (this.value.includes('Newest')) {
                sortDeploymentsByDate(true);
            } else {
                sortDeploymentsByDate(false);
            }
        });
    }
    
    // Refresh preview button
    const refreshPreviewBtn = document.querySelector('.btn-sm.btn-azure');
    if (refreshPreviewBtn) {
        refreshPreviewBtn.addEventListener('click', renderDeployments);
    }
    
    // Pagination
    const prevBtn = document.querySelector('.btn-sm.btn-outline-secondary.me-2');
    const nextBtn = document.querySelector('.btn-sm.btn-outline-secondary:not(.me-2)');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderDeployments();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(filteredDeployments.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderDeployments();
            }
        });
    }
    
    // Search box
    const searchBox = document.querySelector('.search-box');
    if (searchBox) {
        searchBox.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            if (searchTerm) {
                filteredDeployments = deployments.filter(deployment => {
                    return (
                        (deployment.project_name && deployment.project_name.toLowerCase().includes(searchTerm)) ||
                        (deployment.pipeline_name && deployment.pipeline_name.toLowerCase().includes(searchTerm)) ||
                        (deployment.environment && deployment.environment.toLowerCase().includes(searchTerm)) ||
                        (deployment.status && deployment.status.toLowerCase().includes(searchTerm))
                    );
                });
            } else {
                filteredDeployments = [...deployments];
            }
            currentPage = 1;
            renderDeployments();
        });
    }
}

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
            
            // Sort by date (newest first)
            sortDeploymentsByDate(true);
            
            updateStatistics();
            updateCharts();
            renderDeployments();
            populateFilters();
            hideLoading();
        })
        .catch(error => {
            console.error('Error loading data:', error);
            hideLoading();
            showError('API verilerini yüklerken bir hata oluştu. Lütfen tekrar deneyin.');
        });
}

function showLoading() {
    isLoading = true;
    const deploymentList = document.querySelector('.deployment-list');
    if (deploymentList) {
        deploymentList.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Yükleniyor...</span>
                </div>
                <p class="mt-3 text-muted">Deployment verileri yükleniyor...</p>
            </div>
        `;
    }
}

function hideLoading() {
    isLoading = false;
}

function showError(message) {
    const deploymentList = document.querySelector('.deployment-list');
    if (deploymentList) {
        deploymentList.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle text-danger fa-3x mb-3"></i>
                <p class="text-danger">${message}</p>
                <button class="btn btn-outline-primary mt-3" onclick="loadData()">
                    <i class="fas fa-sync-alt me-1"></i>Tekrar Dene
                </button>
            </div>
        `;
    }
}

function sortDeploymentsByDate(newestFirst) {
    filteredDeployments.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return newestFirst ? dateB - dateA : dateA - dateB;
    });
    renderDeployments();
}

function updateStatistics() {
    // Total deployments
    const totalDeploymentsEl = document.querySelector('.stats-card.total-card h2');
    if (totalDeploymentsEl) {
        totalDeploymentsEl.textContent = deployments.length;
    }
    
    // Count successful deployments
    const successCount = deployments.filter(d => 
        d.status && (d.status.toLowerCase() === 'succeeded' || d.status.toLowerCase() === 'success')
    ).length;
    
    // Count failed deployments
    const failedCount = deployments.filter(d => 
        d.status && (d.status.toLowerCase() === 'failed' || d.status.toLowerCase() === 'failure')
    ).length;
    
    // Update success count
    const successDeploymentsEl = document.querySelector('.stats-card.success-card h2');
    if (successDeploymentsEl) {
        successDeploymentsEl.textContent = successCount;
    }
    
    // Update failed count
    const failedDeploymentsEl = document.querySelector('.stats-card.failed-card h2');
    if (failedDeploymentsEl) {
        failedDeploymentsEl.textContent = failedCount;
    }
}

function populateFilters() {
    // Project dropdown
    const projectSelect = document.querySelector('.col-md-3:nth-child(1) .form-select');
    if (projectSelect) {
        // Clear existing options except the first one
        while (projectSelect.options.length > 1) {
            projectSelect.remove(1);
        }
        
        // Get unique project names
        const projectNames = [...new Set(deployments.map(d => d.project_name))].filter(Boolean);
        
        // Add options
        projectNames.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            projectSelect.appendChild(option);
        });
    }
    
    // Environment dropdown
    const environmentSelect = document.querySelector('.col-md-3:nth-child(2) .form-select');
    if (environmentSelect) {
        // Clear existing options except the first one
        while (environmentSelect.options.length > 1) {
            environmentSelect.remove(1);
        }
        
        // Get unique environments
        const environments = [...new Set(deployments.map(d => d.environment))].filter(Boolean);
        
        // Add options
        environments.forEach(env => {
            const option = document.createElement('option');
            option.value = env;
            option.textContent = env;
            environmentSelect.appendChild(option);
        });
    }
}

function applyFilters() {
    const projectSelect = document.querySelector('.col-md-3:nth-child(1) .form-select');
    const environmentSelect = document.querySelector('.col-md-3:nth-child(2) .form-select');
    const startDateInput = document.querySelector('.col-md-3:nth-child(3) input[type="date"]');
    const endDateInput = document.querySelector('.col-md-3:nth-child(4) input[type="date"]');
    
    const selectedProject = projectSelect ? projectSelect.value : '';
    const selectedEnvironment = environmentSelect ? environmentSelect.value : '';
    const startDate = startDateInput && startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput && endDateInput.value ? new Date(endDateInput.value) : null;
    
    // Reset filtered deployments
    filteredDeployments = [...deployments];
    
    // Filter by project
    if (selectedProject && selectedProject !== 'All Projects') {
        filteredDeployments = filteredDeployments.filter(d => d.project_name === selectedProject);
    }
    
    // Filter by environment
    if (selectedEnvironment && selectedEnvironment !== 'All Environments') {
        filteredDeployments = filteredDeployments.filter(d => d.environment === selectedEnvironment);
    }
    
    // Filter by start date
    if (startDate) {
        filteredDeployments = filteredDeployments.filter(d => new Date(d.timestamp) >= startDate);
    }
    
    // Filter by end date
    if (endDate) {
        // Add one day to include the end date fully
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        filteredDeployments = filteredDeployments.filter(d => new Date(d.timestamp) < nextDay);
    }
    
    // Reset pagination
    currentPage = 1;
    
    // Update UI
    renderDeployments();
}

function resetFilters() {
    // Reset dropdown selections
    const projectSelect = document.querySelector('.col-md-3:nth-child(1) .form-select');
    const environmentSelect = document.querySelector('.col-md-3:nth-child(2) .form-select');
    const startDateInput = document.querySelector('.col-md-3:nth-child(3) input[type="date"]');
    const endDateInput = document.querySelector('.col-md-3:nth-child(4) input[type="date"]');
    
    if (projectSelect) projectSelect.selectedIndex = 0;
    if (environmentSelect) environmentSelect.selectedIndex = 0;
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    
    // Reset filtered data
    filteredDeployments = [...deployments];
    currentPage = 1;
    
    // Update UI
    renderDeployments();
}

function renderDeployments() {
    const deploymentList = document.querySelector('.deployment-list');
    if (!deploymentList || isLoading) return;
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredDeployments.length);
    const pageDeployments = filteredDeployments.slice(startIndex, endIndex);
    
    // Empty list message
    if (filteredDeployments.length === 0) {
        deploymentList.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <p class="lead text-muted">Bu filtrelere uygun deployment bulunamadı</p>
                <button class="btn btn-outline-secondary" onclick="resetFilters()">
                    <i class="fas fa-undo me-1"></i>Filtreleri Sıfırla
                </button>
            </div>
        `;
        return;
    }
    
    // Generate HTML for deployments
    let html = '';
    
    pageDeployments.forEach(deployment => {
        const isSuccess = deployment.status && (deployment.status.toLowerCase() === 'succeeded' || deployment.status.toLowerCase() === 'success');
        const borderClass = isSuccess ? 'success-border' : 'failed-border';
        const badgeClass = isSuccess ? 'badge-success' : 'badge-failed';
        const statusText = deployment.status || 'Unknown';
        
        // Format date
        const deployDate = new Date(deployment.timestamp);
        const formattedDate = deployDate.toLocaleDateString('tr-TR', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `
            <div class="card deployment-card ${borderClass}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h5 class="mb-1">${deployment.project_name || 'Unknown Project'}</h5>
                            <p class="text-muted mb-2">${deployment.pipeline_name || 'Unknown Pipeline'}</p>
                            <span class="badge ${badgeClass} me-2">${statusText}</span>
                            <span class="environment-badge">${deployment.environment || 'Unknown'}</span>
                        </div>
                        <div class="col-md-4">
                            <p class="mb-1 small"><i class="far fa-calendar-alt me-2"></i> ${formattedDate}</p>
                            <p class="mb-0 small"><i class="far fa-user me-2"></i> ${deployment.triggered_by || 'Auto Deployment'}</p>
                        </div>
                        <div class="col-md-2 text-end">
                            <button class="btn btn-sm btn-outline-secondary" onclick="showDeploymentDetails('${deployment.pipeline_name}')">Details</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    deploymentList.innerHTML = html;
    
    // Update pagination buttons
    updatePagination();
}

function updatePagination() {
    const prevBtn = document.querySelector('.btn-sm.btn-outline-secondary.me-2');
    const nextBtn = document.querySelector('.btn-sm.btn-outline-secondary:not(.me-2)');
    
    const totalPages = Math.ceil(filteredDeployments.length / itemsPerPage);
    
    // Disable/enable previous button
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    // Disable/enable next button
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
}

function updateCharts() {
    updateEnvironmentChart();
    updateTrendChart();
}

function updateEnvironmentChart() {
    // Count deployments by environment
    const envCounts = {};
    deployments.forEach(d => {
        const env = d.environment || 'Unknown';
        envCounts[env] = (envCounts[env] || 0) + 1;
    });
    
    // Get environment labels and counts
    const labels = Object.keys(envCounts);
    const data = Object.values(envCounts);
    
    // Update chart (we'll reuse the existing chart)
    if (window.envChart) {
        window.envChart.data.labels = labels;
        window.envChart.data.datasets[0].data = data;
        window.envChart.update();
    }
}

function updateTrendChart() {
    // Group deployments by date
    const dateMap = {};
    const successMap = {};
    const failureMap = {};
    
    deployments.forEach(d => {
        // Create a date string (YYYY-MM-DD) for grouping
        const date = new Date(d.timestamp);
        const dateStr = date.toISOString().split('T')[0];
        
        // Count successful and failed deployments
        const isSuccess = d.status && (d.status.toLowerCase() === 'succeeded' || d.status.toLowerCase() === 'success');
        
        dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
        
        if (isSuccess) {
            successMap[dateStr] = (successMap[dateStr] || 0) + 1;
        } else {
            failureMap[dateStr] = (failureMap[dateStr] || 0) + 1;
        }
    });
    
    // Get unique dates, sorted chronologically
    const dates = Object.keys(dateMap).sort();
    
    // Only use the most recent 7 days
    const recentDates = dates.slice(-7);
    
    // Prepare data for chart
    const successData = recentDates.map(date => successMap[date] || 0);
    const failureData = recentDates.map(date => failureMap[date] || 0);
    
    // Format dates for display (MM-DD)
    const formattedDates = recentDates.map(date => {
        const parts = date.split('-');
        return `${parts[1]}-${parts[2]}`;
    });
    
    // Update chart (we'll reuse the existing chart)
    if (window.trendChart) {
        window.trendChart.data.labels = formattedDates;
        window.trendChart.data.datasets[0].data = successData;
        window.trendChart.data.datasets[1].data = failureData;
        window.trendChart.update();
    }
}

function showDeploymentDetails(pipelineName) {
    alert(`Deployment Details for ${pipelineName} will be shown here.`);
} 
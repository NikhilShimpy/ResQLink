// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkIp1wIdz7LTa5rZ2YJfoKcxTtUEflyhI",
  authDomain: "samudra-suraksha-477cf.firebaseapp.com",
  projectId: "samudra-suraksha-477cf",
  storageBucket: "samudra-suraksha-477cf.firebasestorage.app",
  messagingSenderId: "538135967467",
  appId: "1:538135967467:web:938ca314bf21e10acd70ae"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global variables for pagination
let currentReportsPage = 1;
const REPORTS_PER_PAGE = 10;
let totalReports = 0;
let lastVisibleDoc = null;
let firstVisibleDoc = null;

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    initAdminDropdown();
    initAdminMobileMenu();
    initSectionNavigation();
    initTableSorting();
    initTableSelection();
    initFilters();
    initSettingsTabs();
    initAIToolsPanel();
    initRangeSliders();
    initExportFunctions();
    initPagination();
    
    // Initialize Firebase data loading
    initFirebaseData();
    
    // Initialize Add Official form
    initAddOfficialForm();
});

// Initialize Firebase data loading
function initFirebaseData() {
    // Load dashboard data
    loadDashboardData();
    
    // Set up real-time listeners
    setupRealtimeListeners();
}

// Load Dashboard Data
function loadDashboardData() {
    fetchReportsCount();
    fetchUsersCount();
    fetchVerifiedAlertsCount();
    fetchActiveHotspotsCount();
    updateReportsTable();
    updateOfficialsTable();
}

// Setup real-time listeners
function setupRealtimeListeners() {
    // Listen for new reports
    db.collection("reports")
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            fetchReportsCount();
            fetchVerifiedAlertsCount();
            fetchActiveHotspotsCount();
            // Don't update table here to avoid conflicts with pagination
        });
    
    // Listen for new users
    db.collection("users")
        .where("role", "in", ["admin", "official"])
        .onSnapshot((snapshot) => {
            fetchUsersCount();
            updateOfficialsTable();
        });
}

// Fetch Reports Count
async function fetchReportsCount() {
    try {
        const snapshot = await db.collection("reports").get();
        totalReports = snapshot.size;
        document.getElementById("total-reports").textContent = totalReports.toLocaleString();
        
        // Update pagination info
        updatePaginationInfo();
        
        // Calculate trend (this week vs last week)
        const trend = await calculateReportsTrend();
        updateTrendElement("reports-trend", trend);
    } catch (error) {
        console.error("Error fetching reports count: ", error);
        document.getElementById("total-reports").textContent = "Error";
        document.getElementById("reports-trend").textContent = "Error loading data";
    }
}

// Fetch Users Count
async function fetchUsersCount() {
    try {
        const snapshot = await db.collection("users").get();
        const count = snapshot.size;
        document.getElementById("total-users").textContent = count.toLocaleString();
        
        // Calculate trend
        const trend = await calculateUsersTrend();
        updateTrendElement("users-trend", trend);
    } catch (error) {
        console.error("Error fetching users count: ", error);
        document.getElementById("total-users").textContent = "Error";
        document.getElementById("users-trend").textContent = "Error loading data";
    }
}

// Fetch Verified Alerts Count
async function fetchVerifiedAlertsCount() {
    try {
        const snapshot = await db.collection("reports")
            .where("status", "==", "verified")
            .get();
        
        const count = snapshot.size;
        document.getElementById("verified-alerts").textContent = count.toLocaleString();
        
        // Calculate trend
        const trend = await calculateVerifiedTrend();
        updateTrendElement("verified-trend", trend);
    } catch (error) {
        console.error("Error fetching verified alerts count: ", error);
        document.getElementById("verified-alerts").textContent = "Error";
        document.getElementById("verified-trend").textContent = "Error loading data";
    }
}

// Fetch Active Hotspots Count
async function fetchActiveHotspotsCount() {
    try {
        const snapshot = await db.collection("reports")
            .where("isActive", "==", true)
            .get();
        
        const count = snapshot.size;
        document.getElementById("active-hotspots").textContent = count.toLocaleString();
        
        // Calculate trend
        const trend = await calculateHotspotsTrend();
        updateTrendElement("hotspots-trend", trend);
    } catch (error) {
        console.error("Error fetching active hotspots count: ", error);
        document.getElementById("active-hotspots").textContent = "Error";
        document.getElementById("hotspots-trend").textContent = "Error loading data";
    }
}

// Update trend element with appropriate styling
function updateTrendElement(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = '';
    
    if (trend.value > 0) {
        element.className = 'stat-trend up';
        element.innerHTML = `<i class="fas fa-arrow-up"></i> ${Math.abs(trend.value)}% ${trend.period}`;
    } else if (trend.value < 0) {
        element.className = 'stat-trend down';
        element.innerHTML = `<i class="fas fa-arrow-down"></i> ${Math.abs(trend.value)}% ${trend.period}`;
    } else {
        element.className = 'stat-trend neutral';
        element.innerHTML = `<i class="fas fa-minus"></i> No change ${trend.period}`;
    }
}

// Calculate Reports Trend (example implementation)
async function calculateReportsTrend() {
    return {
        value: 12,
        period: "this week"
    };
}

// Calculate Users Trend
async function calculateUsersTrend() {
    return {
        value: 8,
        period: "this week"
    };
}

// Calculate Verified Trend
async function calculateVerifiedTrend() {
    return {
        value: -5,
        period: "this week"
    };
}

// Calculate Hotspots Trend
async function calculateHotspotsTrend() {
    return {
        value: 0,
        period: "this week"
    };
}

// Update Reports Table
async function updateReportsTable() {
    try {
        const tbody = document.getElementById("reports-table-body");
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="9" class="loading-row">Loading reports...</td></tr>';
        
        let query = db.collection("reports")
            .orderBy("timestamp", "desc")
            .limit(REPORTS_PER_PAGE);
        
        // For pagination beyond the first page
        if (currentReportsPage > 1 && lastVisibleDoc) {
            query = query.startAfter(lastVisibleDoc);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="9" class="no-data">No reports found</td></tr>';
            updatePaginationInfo();
            return;
        }
        
        // Store the first and last visible documents for pagination
        if (snapshot.docs.length > 0) {
            firstVisibleDoc = snapshot.docs[0];
            lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        
        tbody.innerHTML = '';
        
        // Fetch user details for each report
        const reportsWithUsers = await Promise.all(
            snapshot.docs.map(async (doc) => {
                const report = doc.data();
                let userData = { name: "Unknown User" };
                
                try {
                    if (report.user_id) {
                        const userDoc = await db.collection("users").doc(report.user_id).get();
                        if (userDoc.exists) {
                            userData = userDoc.data();
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user data: ", error);
                }
                
                return {
                    id: doc.id,
                    ...report,
                    user: userData
                };
            })
        );
        
        // Populate the table
        reportsWithUsers.forEach((report) => {
            const row = document.createElement('tr');
            
            // Format the date
            let reportDate = 'Unknown date';
            try {
                if (report.timestamp) {
                    if (report.timestamp.toDate) {
                        reportDate = new Date(report.timestamp.toDate()).toLocaleString();
                    } else if (typeof report.timestamp === 'string') {
                        reportDate = new Date(report.timestamp).toLocaleString();
                    }
                }
            } catch (error) {
                console.error("Error formatting date:", error);
            }
            
            // Determine status class and text
            let statusClass = "pending";
            let statusText = "Pending";
            
            if (report.status === "verified") {
                statusClass = "verified";
                statusText = "Verified";
            } else if (report.status === "rejected") {
                statusClass = "rejected";
                statusText = "Rejected";
            } else if (report.status === "under_review") {
                statusClass = "review";
                statusText = "Under Review";
            }
            
            // Determine score class
            let scoreClass = "medium";
            // const severityScore = report.severity_score || 0;
            const severityScore = (report.severity_score || 0) * 10;

            if (severityScore >= 80) scoreClass = "high";
            if (severityScore < 50) scoreClass = "low";
            
            row.innerHTML = `
                <td><input type="checkbox" class="row-select"></td>
                <td>${report.id.substring(0, 8)}</td>
                <td>${report.user.name || "Unknown User"}</td>
                <td>${report.city || ''}, ${report.state || ''}</td>
                <td>${report.disaster_type || 'Unknown'}</td>
                <td>${reportDate}</td>
                <td><span class="score ${scoreClass}">${severityScore}%</span></td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-btn delete" data-id="${report.id}"><i class="fas fa-trash"></i></button>
                    
                 
                    
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        addReportActionListeners();
        
        // Update pagination info
        updatePaginationInfo();
        
    } catch (error) {
        console.error("Error updating reports table: ", error);
        const tbody = document.getElementById("reports-table-body");
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="error-row">Error loading reports: ' + error.message + '</td></tr>';
        }
    }
}

// Initialize pagination
function initPagination() {
    const prevBtn = document.querySelector('.pagination-btn:first-child');
    const nextBtn = document.querySelector('.pagination-btn:last-child');
    const pageBtns = document.querySelectorAll('.pagination-btn:not(:first-child):not(:last-child)');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentReportsPage > 1) {
                currentReportsPage--;
                updateReportsTable();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(totalReports / REPORTS_PER_PAGE);
            if (currentReportsPage < totalPages) {
                currentReportsPage++;
                updateReportsTable();
            }
        });
    }
    
    // Add event listeners to page number buttons
    pageBtns.forEach((btn, index) => {
        btn.addEventListener('click', function() {
            const pageNum = parseInt(this.textContent);
            if (!isNaN(pageNum) && pageNum !== currentReportsPage) {
                currentReportsPage = pageNum;
                updateReportsTable();
            }
        });
    });
}

// Update pagination info
function updatePaginationInfo() {
    const totalPages = Math.ceil(totalReports / REPORTS_PER_PAGE);
    const infoElement = document.querySelector('.pagination-info');
    const paginationBtns = document.querySelectorAll('.pagination-btn');
    
    if (infoElement) {
        const startItem = ((currentReportsPage - 1) * REPORTS_PER_PAGE) + 1;
        const endItem = Math.min(currentReportsPage * REPORTS_PER_PAGE, totalReports);
        infoElement.textContent = `Showing ${startItem}-${endItem} of ${totalReports} reports`;
    }
    
    // Update active page button
    paginationBtns.forEach((btn, index) => {
        if (index === currentReportsPage) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Enable/disable previous and next buttons
    if (paginationBtns.length > 1) {
        paginationBtns[0].disabled = currentReportsPage <= 1; // Previous button
        paginationBtns[paginationBtns.length - 1].disabled = currentReportsPage >= totalPages; // Next button
    }
}

// Add event listeners to report action buttons
function addReportActionListeners() {
    // View button
    document.querySelectorAll('.action-btn.view').forEach(button => {
        button.addEventListener('click', function() {
            const reportId = this.getAttribute('data-id');
            viewReport(reportId);
        });
    });
    
    // Edit button
    document.querySelectorAll('.action-btn.edit').forEach(button => {
        button.addEventListener('click', function() {
            const reportId = this.getAttribute('data-id');
            editReport(reportId);
        });
    });
    
    // Delete button
    document.querySelectorAll('.action-btn.delete').forEach(button => {
        button.addEventListener('click', function() {
            const reportId = this.getAttribute('data-id');
            deleteReport(reportId);
        });
    });
}

// View Report Details
function viewReport(reportId) {
    // Redirect to analyst_reportsdetail.html with report ID
    window.location.href = `analyst_reportsdetail.html?reportId=${reportId}`;
}

// Edit Report
function editReport(reportId) {
    // Implement edit report functionality
    console.log("Edit report: ", reportId);
}

// Delete Report
async function deleteReport(reportId) {
    if (confirm("Are you sure you want to delete this report?")) {
        try {
            await db.collection("reports").doc(reportId).delete();
            console.log("Report deleted successfully");
            // Refresh the table
            updateReportsTable();
            // Update counts
            fetchReportsCount();
            fetchVerifiedAlertsCount();
            fetchActiveHotspotsCount();
        } catch (error) {
            console.error("Error deleting report: ", error);
            alert("Error deleting report: " + error.message);
        }
    }
}

// Initialize Add Official Form
function initAddOfficialForm() {
    const form = document.getElementById('official-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('official-name').value.trim();
        const email = document.getElementById('official-email').value.trim();
        const phone = document.getElementById('official-phone').value.trim();

        if (!name || !email || !phone) {
            alert('Please fill out all fields.');
            return;
        }

        try {
            // In a real application, you would create the user in Firebase Auth
            // and then add to Firestore with a specific role
            alert('Official added successfully!');
            form.reset();
            
            // Refresh officials table
            updateOfficialsTable();
        } catch (error) {
            console.error('Error adding official:', error);
            alert('Error adding official: ' + error.message);
        }
    });
}

// Update Officials Table
async function updateOfficialsTable() {
    try {
        const snapshot = await db.collection("users")
            .where("role", "in", ["admin", "official"])
            .get();
            
        const tableBody = document.querySelector('#official-table tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" class="no-data">No officials found</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const official = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${official.name || 'N/A'}</td>
                <td>${official.email || 'N/A'}</td>
                <td>${official.phone || official.mobilenumber || 'N/A'}</td>
                <td>${official.role || 'Official'}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error updating officials table: ", error);
        const tableBody = document.querySelector('#official-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4" class="error-row">Error loading officials</td></tr>';
        }
    }
}

// The rest of the functions remain the same as in your original file
// (initAdminDropdown, initAdminMobileMenu, initSectionNavigation, etc.)

// ... (All other existing functions from your original admin_dashboard.js file)

// Admin Dropdown Functionality
function initAdminDropdown() {
    const dropdownTrigger = document.getElementById('adminDropdownTrigger');
    const dropdownMenu = document.getElementById('adminDropdown');
    
    if (dropdownTrigger && dropdownMenu) {
        dropdownTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', function() {
            dropdownMenu.classList.remove('show');
        });
        
        // Prevent dropdown from closing when clicking inside it
        dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

// Mobile Menu Toggle Functionality
function initAdminMobileMenu() {
    const hamburger = document.getElementById('adminMenuToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

// Section Navigation
function initSectionNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.admin-section');
    
    // Handle nav item clicks
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            
            // Update active nav item
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                    
                    // Load section-specific data
                    if (sectionId === 'reports-management') {
                        updateReportsTable();
                    } else if (sectionId === 'officials-management') {
                        updateOfficialsTable();
                    } else if (sectionId === 'dashboard') {
                        loadDashboardData();
                    }
                }
            });
            
            // Close mobile menu if open
            const hamburger = document.getElementById('adminMenuToggle');
            const navMenu = document.querySelector('.nav-menu');
            if (hamburger && navMenu) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    });
    
    // Handle URL hash changes
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            const targetNavItem = document.querySelector(`.nav-item[data-section="${hash}"]`);
            if (targetNavItem) {
                targetNavItem.click();
            }
        }
    });
    
    // Check initial hash
    if (window.location.hash) {
        const initialHash = window.location.hash.substring(1);
        const targetNavItem = document.querySelector(`.nav-item[data-section="${initialHash}"]`);
        if (targetNavItem) {
            targetNavItem.click();
        }
    }
}

// Table Sorting Functionality
function initTableSorting() {
    const sortableHeaders = document.querySelectorAll('th[data-sort]');
    
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const table = this.closest('table');
            const columnIndex = Array.from(this.parentNode.children).indexOf(this);
            const sortKey = this.getAttribute('data-sort');
            const isAscending = this.classList.contains('asc');
            
            // Reset all headers
            sortableHeaders.forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            
            // Toggle sort direction
            if (isAscending) {
                this.classList.add('desc');
            } else {
                this.classList.add('asc');
            }
            
            // Sort the table
            sortTable(table, columnIndex, isAscending);
        });
    });
}

function sortTable(table, columnIndex, ascending) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();
        
        // Handle numeric values
        if (!isNaN(aValue) && !isNaN(bValue)) {
            return ascending ? aValue - bValue : bValue - aValue;
        }
        
        // Handle string values
        return ascending ? 
            aValue.localeCompare(bValue) : 
            bValue.localeCompare(aValue);
    });
    
    // Remove existing rows
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    
    // Add sorted rows
    rows.forEach(row => tbody.appendChild(row));
}

// Table Selection Functionality
function initTableSelection() {
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const rowCheckboxes = document.querySelectorAll('.row-select');
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
}

// Filter Functionality
function initFilters() {
    const applyFiltersButtons = document.querySelectorAll('.apply-filters');
    
    applyFiltersButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get all filter values from the parent container
            const filterContainer = this.closest('.filters-container');
            if (!filterContainer) return;
            
            const filters = {};
            
            // Get select filters
            const selects = filterContainer.querySelectorAll('select');
            selects.forEach(select => {
                filters[select.id] = select.value;
            });
            
            // Get input filters
            const inputs = filterContainer.querySelectorAll('input[type="text"]');
            inputs.forEach(input => {
                filters[input.id] = input.value;
            });
            
            // In a real application, this would send a request to the backend
            console.log('Applying filters:', filters);
            
            // Show loading state
            const originalText = this.textContent;
            this.textContent = 'Applying...';
            this.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                // Reset button state
                this.textContent = originalText;
                this.disabled = false;
                
                // Show success message (in a real app, this would update the table)
                alert('Filters applied successfully!');
            }, 1000);
        });
    });
}

// Settings Tabs Functionality
function initSettingsTabs() {
    const tabHeaders = document.querySelectorAll('.tab-header');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab header
            tabHeaders.forEach(h => h.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// AI Tools Panel Functionality
function initAIToolsPanel() {
    const panelHeader = document.querySelector('.ai-tools-header');
    const panelContent = document.querySelector('.ai-tools-content');
    const toggleButton = document.querySelector('.ai-panel-toggle');
    
    if (panelHeader && panelContent && toggleButton) {
        let isExpanded = true;
        
        panelHeader.addEventListener('click', function() {
            isExpanded = !isExpanded;
            updatePanelState();
        });
        
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            isExpanded = !isExpanded;
            updatePanelState();
        });
        
        function updatePanelState() {
            const adminMain = document.querySelector('.admin-main');
            if (isExpanded) {
                panelContent.style.display = 'grid';
                toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
                if (adminMain) adminMain.style.paddingBottom = '300px';
            } else {
                panelContent.style.display = 'none';
                toggleButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
                if (adminMain) adminMain.style.paddingBottom = '2rem';
            }
        }
    }
}

// Range Sliders for Settings
function initRangeSliders() {
    const rangeSliders = document.querySelectorAll('input[type="range"]');
    
    rangeSliders.forEach(slider => {
        const valueDisplay = slider.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('threshold-value')) {
            // Initialize value display
            valueDisplay.textContent = `${slider.value}%`;
            
            // Update value display when slider changes
            slider.addEventListener('input', function() {
                valueDisplay.textContent = `${this.value}%`;
            });
        }
    });
}

// Export Functions
function initExportFunctions() {
    const exportButtons = document.querySelectorAll('.export-btn');
    
    exportButtons.forEach(button => {
        button.addEventListener('click', function() {
            const format = this.textContent.includes('CSV') ? 'CSV' : 'PDF';
            
            // Show loading state
            const originalText = this.textContent;
            this.textContent = 'Exporting...';
            this.disabled = true;
            
            // Simulate export process
            setTimeout(() => {
                // Reset button state
                this.textContent = originalText;
                this.disabled = false;
                
                // Show success message
                alert(`${format} export completed successfully!`);
            }, 1500);
        });
    });
}

// Placeholder for Map Initialization
function initMap() {
    // This would initialize the interactive heatmap
    // In a real application, you would integrate with a mapping library like Leaflet
    console.log('Initializing map...');
}

// Placeholder for Chart Initialization
function initCharts() {
    // This would initialize data visualizations
    // In a real application, you would use a charting library like Chart.js
    console.log('Initializing charts...');
}

// Utility function for API calls
async function fetchData(endpoint, options = {}) {
    try {
        // In a real application, this would make actual API calls
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        showNotification('Failed to load data. Please try again.', 'error');
        throw error;
    }
}

// Utility function to get auth token
function getAuthToken() {
    // In a real application, this would retrieve the token from a secure storage
    return localStorage.getItem('authToken');
}

// Utility function to show notifications
function showNotification(message, type = 'info') {
    // In a real application, this would display a toast notification
    console.log(`${type.toUpperCase()}: ${message}`);
}
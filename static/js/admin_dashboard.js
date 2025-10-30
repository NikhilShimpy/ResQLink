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

// Chart instances
let trendsChart, hazardsChart, activityChart, sentimentChart, riskForecastChart, hotspotMap, sentimentChartSocial;

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initUserDropdown();
    initSectionNavigation();
    initCharts();
    initFirebaseData();
    
    // Initialize other components
    initStatsCards();
    initQuickActions();
    initAIToolsPanel();
    initTableSorting();
    initTableSelection();
    initFilters();
    initSettingsTabs();
    initRangeSliders();
    initExportFunctions();
    initPagination();
    initAddOfficialForm();
});

// Sidebar functionality
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const mainContent = document.getElementById('mainContent');

    // Toggle sidebar
    sidebarToggle.addEventListener('click', function() {
        if (window.innerWidth < 992) {
            // Mobile: Show/hide sidebar
            sidebar.classList.toggle('mobile-open');
        } else {
            // Desktop: Collapse/expand sidebar
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('sidebar-collapsed');
        }
    });

    // Close sidebar on mobile
    sidebarClose.addEventListener('click', function() {
        sidebar.classList.remove('mobile-open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth < 992 && 
            !sidebar.contains(event.target) && 
            !sidebarToggle.contains(event.target)) {
            sidebar.classList.remove('mobile-open');
        }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 992) {
            sidebar.classList.remove('mobile-open');
        }
    });
}

// User dropdown functionality
function initUserDropdown() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');

    userMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        userDropdown.classList.remove('show');
    });

    // Prevent dropdown from closing when clicking inside
    userDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// Section navigation
function initSectionNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const sections = document.querySelectorAll('.admin-section');
    const breadcrumb = document.querySelector('.breadcrumb span');

    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            
            // Update active sidebar item
            sidebarItems.forEach(sidebarItem => sidebarItem.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                    
                    // Update breadcrumb
                    const sectionName = this.querySelector('.menu-text').textContent;
                    breadcrumb.textContent = sectionName;
                    
                    // Load section-specific data
                    loadSectionData(sectionId);
                }
            });
            
            // Close sidebar on mobile
            if (window.innerWidth < 992) {
                document.getElementById('sidebar').classList.remove('mobile-open');
            }
        });
    });

    // Handle URL hash changes
    window.addEventListener('hashchange', function() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            const targetItem = document.querySelector(`.sidebar-item[data-section="${hash}"]`);
            if (targetItem) {
                targetItem.click();
            }
        }
    });

    // Check initial hash
    if (window.location.hash) {
        const initialHash = window.location.hash.substring(1);
        const targetItem = document.querySelector(`.sidebar-item[data-section="${initialHash}"]`);
        if (targetItem) {
            targetItem.click();
        }
    }
}

// Load section-specific data
function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'reports':
            updateReportsTable();
            break;
        case 'social':
            loadSocialInsights();
            break;
        case 'hotspots':
            loadHotspotAnalytics();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Initialize charts
function initCharts() {
    // Report Trends Chart
    const trendsCtx = document.getElementById('trendsChart').getContext('2d');
    trendsChart = new Chart(trendsCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Reports Submitted',
                data: [45, 52, 38, 65, 72, 48, 55],
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#0ea5e9',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    beginAtZero: true
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    // Hazard Distribution Chart
    const hazardsCtx = document.getElementById('hazardsChart').getContext('2d');
    hazardsChart = new Chart(hazardsCtx, {
        type: 'doughnut',
        data: {
            labels: ['Storm', 'Tsunami', 'High Waves', 'Rip Currents', 'Other'],
            datasets: [{
                data: [30, 15, 25, 20, 10],
                backgroundColor: [
                    '#0ea5e9',
                    '#ef4444',
                    '#f59e0b',
                    '#10b981',
                    '#8b5cf6'
                ],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e2e8f0',
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            }
        }
    });

    // User Activity Chart
    const activityCtx = document.getElementById('activityChart').getContext('2d');
    activityChart = new Chart(activityCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Active Users',
                data: [65, 59, 80, 81, 56, 55, 40],
                backgroundColor: 'rgba(14, 165, 233, 0.7)',
                borderColor: '#0ea5e9',
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    beginAtZero: true
                }
            }
        }
    });

    // Sentiment Analysis Chart
    const sentimentCtx = document.getElementById('sentimentChart').getContext('2d');
    sentimentChart = new Chart(sentimentCtx, {
        type: 'pie',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [65, 20, 15],
                backgroundColor: [
                    '#10b981',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e2e8f0',
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            }
        }
    });

    // Social Insights Sentiment Chart
    const sentimentSocialCtx = document.getElementById('sentimentChartSocial').getContext('2d');
    sentimentChartSocial = new Chart(sentimentSocialCtx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [65, 20, 15],
                backgroundColor: [
                    '#10b981',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e2e8f0',
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            }
        }
    });

    // Risk Forecast Chart
    const riskForecastCtx = document.getElementById('riskForecastChart').getContext('2d');
    riskForecastChart = new Chart(riskForecastCtx, {
        type: 'line',
        data: {
            labels: ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
            datasets: [{
                label: 'Risk Level',
                data: [65, 59, 80, 81, 56, 55, 40],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    },
                    beginAtZero: true
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    // Hotspot Map Visualization (Bubble Chart)
    const hotspotCtx = document.getElementById('hotspotMap').getContext('2d');
    hotspotMap = new Chart(hotspotCtx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Hotspots',
                data: [
                    {x: 20, y: 30, r: 15},
                    {x: 40, y: 10, r: 10},
                    {x: 30, y: 20, r: 20},
                    {x: 10, y: 40, r: 8},
                    {x: 50, y: 30, r: 12},
                    {x: 60, y: 50, r: 18}
                ],
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: '#ef4444',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            }
        }
    });
}

// Initialize stats cards
function initStatsCards() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('hover');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('hover');
        });
        
        // Add click event for mobile
        card.addEventListener('click', function() {
            if (window.innerWidth < 768) {
                this.classList.toggle('flipped');
            }
        });
    });
}

// Initialize quick actions
function initQuickActions() {
    const actionCards = document.querySelectorAll('.action-card');
    
    actionCards.forEach(card => {
        card.addEventListener('click', function() {
            // Add ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
            `;
            
            this.appendChild(ripple);
            
            // Remove ripple after animation
            setTimeout(() => {
                ripple.remove();
            }, 600);
            
            // Handle action based on card content
            const actionText = this.querySelector('span').textContent;
            handleQuickAction(actionText);
        });
    });
}

// Handle quick actions
function handleQuickAction(action) {
    switch(action) {
        case 'Approve Reports':
            showNotification('Opening report approval panel...', 'info');
            break;
        case 'Update Status':
            showNotification('Opening status update panel...', 'info');
            break;
        case 'Review Flagged':
            showNotification('Opening flagged content panel...', 'info');
            break;
        case 'Send Alert':
            showNotification('Opening alert sending panel...', 'info');
            break;
    }
}

// Initialize AI tools panel
function initAIToolsPanel() {
    const aiPanelToggle = document.querySelector('.ai-panel-toggle');
    const aiToolsContent = document.querySelector('.ai-tools-content');
    
    if (aiPanelToggle && aiToolsContent) {
        let isExpanded = false;
        
        aiPanelToggle.addEventListener('click', function() {
            isExpanded = !isExpanded;
            
            if (isExpanded) {
                aiToolsContent.style.display = 'grid';
                aiPanelToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
            } else {
                aiToolsContent.style.display = 'none';
                aiPanelToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
            }
        });
    }
}

// Initialize Firebase data loading
function initFirebaseData() {
    loadDashboardData();
    setupRealtimeListeners();
}

// Load dashboard data
function loadDashboardData() {
    fetchReportsCount();
    fetchUsersCount();
    fetchVerifiedAlertsCount();
    fetchActiveHotspotsCount();
    updateChartsWithRealData();
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
        });
    
    // Listen for new users
    db.collection("users")
        .onSnapshot((snapshot) => {
            fetchUsersCount();
        });
}

// Fetch reports count
async function fetchReportsCount() {
    try {
        const snapshot = await db.collection("reports").get();
        totalReports = snapshot.size;
        document.getElementById("total-reports").textContent = totalReports.toLocaleString();
        
        // Update trend with realistic data
        const trendElement = document.getElementById("reports-trend");
        const trendValue = Math.floor(Math.random() * 20) - 5; // Random trend between -5 and 15
        updateTrendElement(trendElement, trendValue, "this week");
        
    } catch (error) {
        console.error("Error fetching reports count: ", error);
        document.getElementById("total-reports").textContent = "Error";
    }
}

// Fetch users count
async function fetchUsersCount() {
    try {
        const snapshot = await db.collection("users").get();
        const count = snapshot.size;
        document.getElementById("total-users").textContent = count.toLocaleString();
        
        // Update trend
        const trendElement = document.getElementById("users-trend");
        const trendValue = Math.floor(Math.random() * 15) + 1; // Random positive trend
        updateTrendElement(trendElement, trendValue, "this week");
        
    } catch (error) {
        console.error("Error fetching users count: ", error);
        document.getElementById("total-users").textContent = "Error";
    }
}

// Fetch verified alerts count
async function fetchVerifiedAlertsCount() {
    try {
        const snapshot = await db.collection("reports")
            .where("status", "==", "verified")
            .get();
        
        const count = snapshot.size;
        document.getElementById("verified-alerts").textContent = count.toLocaleString();
        
        // Update trend
        const trendElement = document.getElementById("verified-trend");
        const trendValue = Math.floor(Math.random() * 10) + 1; // Random positive trend
        updateTrendElement(trendElement, trendValue, "this week");
        
    } catch (error) {
        console.error("Error fetching verified alerts count: ", error);
        document.getElementById("verified-alerts").textContent = "Error";
    }
}

// Fetch active hotspots count
async function fetchActiveHotspotsCount() {
    try {
        const snapshot = await db.collection("reports")
            .where("isActive", "==", true)
            .get();
        
        const count = snapshot.size;
        document.getElementById("active-hotspots").textContent = count.toLocaleString();
        
        // Update trend
        const trendElement = document.getElementById("hotspots-trend");
        const trendValue = Math.floor(Math.random() * 10) - 5; // Random trend around zero
        updateTrendElement(trendElement, trendValue, "this week");
        
    } catch (error) {
        console.error("Error fetching active hotspots count: ", error);
        document.getElementById("active-hotspots").textContent = "Error";
    }
}

// Update trend element
function updateTrendElement(element, value, period) {
    element.innerHTML = '';
    
    if (value > 0) {
        element.className = 'stat-trend up';
        element.innerHTML = `<i class="fas fa-arrow-up"></i><span>${Math.abs(value)}% ${period}</span>`;
    } else if (value < 0) {
        element.className = 'stat-trend down';
        element.innerHTML = `<i class="fas fa-arrow-down"></i><span>${Math.abs(value)}% ${period}</span>`;
    } else {
        element.className = 'stat-trend neutral';
        element.innerHTML = `<i class="fas fa-minus"></i><span>No change ${period}</span>`;
    }
}

// Update charts with real data
function updateChartsWithRealData() {
    // Simulate data updates
    setTimeout(() => {
        // Update trends chart
        const newTrendsData = Array.from({length: 7}, () => Math.floor(Math.random() * 30) + 40);
        trendsChart.data.datasets[0].data = newTrendsData;
        trendsChart.update();
        
        // Update hazards chart
        const newHazardsData = Array.from({length: 5}, () => Math.floor(Math.random() * 20) + 10);
        hazardsChart.data.datasets[0].data = newHazardsData;
        hazardsChart.update();
        
        // Update activity chart
        const newActivityData = Array.from({length: 7}, () => Math.floor(Math.random() * 40) + 30);
        activityChart.data.datasets[0].data = newActivityData;
        activityChart.update();
        
        // Update sentiment chart
        const newSentimentData = [
            Math.floor(Math.random() * 30) + 50, // Positive
            Math.floor(Math.random() * 20) + 10, // Neutral
            Math.floor(Math.random() * 15) + 5   // Negative
        ];
        sentimentChart.data.datasets[0].data = newSentimentData;
        sentimentChart.update();
        
        // Update social sentiment chart
        sentimentChartSocial.data.datasets[0].data = newSentimentData;
        sentimentChartSocial.update();
        
        // Update risk forecast chart
        const newRiskData = Array.from({length: 7}, () => Math.floor(Math.random() * 30) + 40);
        riskForecastChart.data.datasets[0].data = newRiskData;
        riskForecastChart.update();
        
    }, 2000);
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
    // Delete button
    document.querySelectorAll('.action-btn.delete').forEach(button => {
        button.addEventListener('click', function() {
            const reportId = this.getAttribute('data-id');
            deleteReport(reportId);
        });
    });
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
                showNotification('Filters applied successfully!', 'success');
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
                showNotification(`${format} export completed successfully!`, 'success');
            }, 1500);
        });
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 1000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 350px;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Add close button event
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Helper function for notification icons
function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'warning': return 'exclamation-triangle';
        case 'error': return 'exclamation-circle';
        default: return 'info-circle';
    }
}

// Helper function for notification colors
function getNotificationColor(type) {
    switch(type) {
        case 'success': return 'linear-gradient(135deg, #10b981, #34d399)';
        case 'warning': return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
        case 'error': return 'linear-gradient(135deg, #ef4444, #f87171)';
        default: return 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
    }
}

// Fullscreen functionality
function initFullscreen() {
    const fullscreenBtn = document.querySelector('.fullscreen-btn');
    
    fullscreenBtn.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });
    
    // Update icon based on fullscreen state
    document.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    });
}

// Initialize fullscreen
initFullscreen();

// Export functions for other sections
function loadSocialInsights() {
    // Implementation for social insights
    console.log('Loading social insights...');
    // Update social sentiment chart with new data
    setTimeout(() => {
        const newSentimentData = [
            Math.floor(Math.random() * 30) + 50,
            Math.floor(Math.random() * 20) + 10,
            Math.floor(Math.random() * 15) + 5
        ];
        sentimentChartSocial.data.datasets[0].data = newSentimentData;
        sentimentChartSocial.update();
    }, 1000);
}

function loadHotspotAnalytics() {
    // Implementation for hotspot analytics
    console.log('Loading hotspot analytics...');
}

function loadSettings() {
    // Implementation for settings
    console.log('Loading settings...');
}
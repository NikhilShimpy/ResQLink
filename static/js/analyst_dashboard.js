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
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

const db = firebase.firestore();

// Global variables
let allReports = [];
let filteredReports = [];
let currentPage = 1;
const reportsPerPage = 10;
let reportsChart = null;
let map = null;
let districtLayers = {};

// District boundaries (simplified for demonstration)
const districtBoundaries = {
    Mumbai: [
        [19.0760, 72.8777], // Center coordinates
        [[19.0, 72.6], [19.6, 73.2]] // Expanded bounding box
    ],
    Indore: [
        [22.7196, 75.8577],
        [[22.5, 75.5], [23.1, 76.3]] // Expanded bounding box
    ],
    Bhopal: [
        [23.2599, 77.4126],
        [[23.0, 77.0], [23.5, 77.8]] // Expanded bounding box
    ]
};







// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing dashboard...");
    initializeMap();
    initializeEventListeners();
    fetchReports();
});

// Initialize the map
function initializeMap() {
    // Set up the map centered on India
    map = L.map('map').setView([20.5937, 78.9629], 5);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add district boundaries (simplified for demonstration)
    Object.keys(districtBoundaries).forEach(district => {
        const [center, bbox] = districtBoundaries[district];
        const bounds = L.latLngBounds(bbox[0], bbox[1]);
        
        // Create a rectangle for each district
        const rect = L.rectangle(bounds, {
            color: "#3498db",
            weight: 2,
            fillOpacity: 0.2,
            fillColor: "#3498db"
        }).addTo(map);
        
        // Add district name in the center
        L.marker(center, {
            icon: L.divIcon({
                html: `<div class="district-label">${district}</div>`,
                className: 'district-label-container',
                iconSize: [100, 20]
            })
        }).addTo(map);
        
        // Store the layer for interactivity
        districtLayers[district] = rect;
        
        // Add hover effects
        rect.on('mouseover', function() {
            this.setStyle({
                fillOpacity: 0.4,
                weight: 3
            });
        });
        
        rect.on('mouseout', function() {
            this.setStyle({
                fillOpacity: 0.2,
                weight: 2
            });
        });
        
        rect.on('click', function() {
            document.getElementById('district-filter').value = district;
            applyFilters();
        });
    });
}

// Initialize event listeners
function initializeEventListeners() {
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    document.getElementById('prev-page').addEventListener('click', goToPrevPage);
    document.getElementById('next-page').addEventListener('click', goToNextPage);
    document.getElementById('search-input').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            applyFilters();
        }
    });
}

// Fetch reports from Firestore
function fetchReports() {
    showLoading();
    console.log("Fetching reports from Firestore...");
    
    db.collection("reports").get()
        .then((querySnapshot) => {
            console.log(`Found ${querySnapshot.size} reports`);
            
            allReports = [];
            querySnapshot.forEach((doc) => {
                const reportData = doc.data();
                const report = {
                    id: doc.id,
                    ...reportData
                };
                
                // Convert timestamp if it's a string
                if (typeof report.timestamp === 'string') {
                    report.timestamp = new Date(report.timestamp);
                } else if (report.timestamp && typeof report.timestamp.toDate === 'function') {
                    // If it's a Firestore timestamp, convert to Date
                    report.timestamp = report.timestamp.toDate();
                }
                
                allReports.push(report);
            });
            
            // Populate state filter dropdown
            populateStateFilter();
            
            processReports();
            hideLoading();
        })
        .catch((error) => {
            console.error("Error getting documents: ", error);
            hideLoading();
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `
                <h3>Error Loading Data</h3>
                <p>Could not fetch reports from Firestore. Please check:</p>
                <ul>
                    <li>Your internet connection</li>
                    <li>Firebase configuration</li>
                    <li>Firestore security rules</li>
                </ul>
                <p>Error details: ${error.message}</p>
            `;
            
            document.querySelector('.dashboard-content').prepend(errorDiv);
        });
}

// Populate state filter dropdown
function populateStateFilter() {
    const stateFilter = document.getElementById('state-filter');
    
    // Get unique states from reports
    const states = [...new Set(allReports.map(report => report.state).filter(Boolean))];
    
    // Clear existing options (except the first one)
    while (stateFilter.options.length > 1) {
        stateFilter.remove(1);
    }
    
    // Add states to dropdown
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateFilter.appendChild(option);
    });
}

// Process reports data
function processReports() {
    filteredReports = [...allReports];
    updateStatistics();
    renderReportsTable();
    renderCharts();
    updateMap();
}

// Apply filters based on user selection
function applyFilters() {
    showLoading();
    
    const stateFilter = document.getElementById('state-filter').value;
    const districtFilter = document.getElementById('district-filter').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    filteredReports = allReports.filter(report => {
        let matches = true;
        
        if (stateFilter && report.state !== stateFilter) {
            matches = false;
        }
        
        if (districtFilter) {
            // Check if district matches in any of the possible fields
            const reportDistrict = (report.district || report.town || '').toLowerCase();
            if (reportDistrict !== districtFilter.toLowerCase()) {
                matches = false;
            }
        }
        
        if (searchTerm) {
            const locationText = `${report.state || ''} ${report.town || ''} ${report.village || ''} ${report.city || ''}`.toLowerCase();
            if (!locationText.includes(searchTerm)) {
                matches = false;
            }
        }
        
        return matches;
    });
    
    currentPage = 1;
    processReports();
    hideLoading();
}

// Reset all filters
function resetFilters() {
    document.getElementById('state-filter').value = '';
    document.getElementById('district-filter').value = '';
    document.getElementById('search-input').value = '';
    applyFilters();
}

// Update statistics cards
function updateStatistics() {
    const totalReports = filteredReports.length;
    const validReports = filteredReports.filter(report => report.severity_score >= 1).length;
    
    const totalSeverity = filteredReports.reduce((sum, report) => sum + (report.severity_score || 0), 0);
    const avgSeverity = totalReports > 0 ? (totalSeverity / totalReports).toFixed(2) : 0;
    
    let latestReport = '-';
    if (filteredReports.length > 0) {
        const sortedByDate = [...filteredReports].sort((a, b) => {
            const dateA = a.timestamp || new Date(0);
            const dateB = b.timestamp || new Date(0);
            return dateB - dateA;
        });
        latestReport = sortedByDate[0].timestamp ? sortedByDate[0].timestamp.toLocaleDateString() : '-';
    }
    
    document.getElementById('total-reports').textContent = totalReports;
    document.getElementById('valid-reports').textContent = validReports;
    document.getElementById('avg-severity').textContent = avgSeverity;
    document.getElementById('latest-report').textContent = latestReport;
}

// Render reports table with pagination
function renderReportsTable() {
    const tableBody = document.querySelector('#reports-table tbody');
    tableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * reportsPerPage;
    const endIndex = startIndex + reportsPerPage;
    const paginatedReports = filteredReports.slice(startIndex, endIndex);
    
    if (paginatedReports.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align: center;">No reports found</td>`;
        tableBody.appendChild(row);
    } else {
        paginatedReports.forEach(report => {
            const row = document.createElement('tr');
            
            const location = `${report.village || report.town || report.city || ''}, ${report.district || ''}, ${report.state || ''}`;
            const severity = report.severity_score || 0;
            const reportCount = report.report_count || 1;
            const timestamp = report.timestamp ? report.timestamp.toLocaleDateString() : 'N/A';
            
            row.innerHTML = `
                <td>${location}</td>
                <td>${severity}</td>
                <td>${reportCount}</td>
                <td>${timestamp}</td>
                <td>
                    <button class="btn-secondary view-details" data-id="${report.id}">View</button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners to view buttons
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function() {
                const reportId = this.getAttribute('data-id');
                viewReportDetails(reportId);
            });
        });
    }
    
    // Update pagination info
    const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Enable/disable pagination buttons
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
}

// Go to previous page
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderReportsTable();
    }
}

// Go to next page
function goToNextPage() {
    const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderReportsTable();
    }
}

// Render charts
function renderCharts() {
    const ctx = document.getElementById('reports-chart').getContext('2d');
    
    // Group reports by district
    const districtCounts = {
        Mumbai: 0,
        Indore: 0,
        Bhopal: 0
    };
    
    filteredReports.forEach(report => {
        // Check if report has a district and if it matches our target districts
        const district = (report.district || report.town || '').toLowerCase();
        
        if (district.includes('mumbai')) {
            districtCounts.Mumbai++;
        } else if (district.includes('indore')) {
            districtCounts.Indore++;
        } else if (district.includes('bhopal')) {
            districtCounts.Bhopal++;
        }
    });
    
    // Destroy previous chart if it exists
    if (reportsChart) {
        reportsChart.destroy();
    }
    
    // Create new chart
    reportsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(districtCounts),
            datasets: [{
                label: 'Number of Reports',
                data: Object.values(districtCounts),
                backgroundColor: [
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(155, 89, 182, 0.7)'
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(155, 89, 182, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Reports'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'District'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Reports by District'
                }
            }
        }
    });
}

// Update map with report data
function updateMap() {
    // Reset all districts to default style
    Object.values(districtLayers).forEach(layer => {
        layer.setStyle({
            fillOpacity: 0.2,
            weight: 2,
            fillColor: "#3498db"
        });
    });
    
    // Count reports by district
    const districtCounts = {
        Mumbai: 0,
        Indore: 0,
        Bhopal: 0
    };
    
    filteredReports.forEach(report => {
        const district = (report.district || report.town || '').toLowerCase();
        
        if (district.includes('mumbai')) {
            districtCounts.Mumbai++;
        } else if (district.includes('indore')) {
            districtCounts.Indore++;
        } else if (district.includes('bhopal')) {
            districtCounts.Bhopal++;
        }
    });
    
    // Update district colors based on report count
    Object.keys(districtCounts).forEach(district => {
        const count = districtCounts[district];
        let color = "#3498db"; // Default blue
        
        if (count > 0) {
            // More reports = more intense color
            const intensity = Math.min(0.2 + (count / Math.max(1, filteredReports.length)) * 0.8, 1);
            color = `rgba(231, 76, 60, ${intensity})`; // Red scale based on intensity
        }
        
        if (districtLayers[district]) {
            districtLayers[district].setStyle({
                fillColor: color,
                fillOpacity: 0.6
            });
            
            // Update tooltip
            districtLayers[district].bindTooltip(
                `${district}: ${count} reports`,
                { permanent: false, direction: 'center' }
            );
        }
    });
}

// View report details - MODIFIED TO REDIRECT TO DETAILS PAGE
// View report details - MODIFIED TO USE FLASK ROUTE
function viewReportDetails(reportId) {
    // Redirect to the Flask route for report details with the report ID as a parameter
    window.location.href = `/analyst/report-detail?reportId=${reportId}`;
}

// Show loading overlay
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}
// Firebase configuration (replace with your actual config)
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

// Global variables
let userLocation = null;
let allReports = [];
let filteredReports = [];
let currentMap = null;
let userCache = new Map(); // Cache for user data to avoid duplicate requests

// DOM elements
const reportsList = document.getElementById('reportsList');
const loadingElement = document.getElementById('loading');
const locationPrompt = document.getElementById('locationPrompt');
const errorMessage = document.getElementById('errorMessage');
const refreshBtn = document.getElementById('refreshBtn');
const locationBtn = document.getElementById('locationBtn');
const requestLocationBtn = document.getElementById('requestLocation');
const radiusSelect = document.getElementById('radiusSelect');
const reportModal = document.getElementById('reportModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.querySelector('.close');

// Initialize the application
function init() {
    // Event listeners
    refreshBtn.addEventListener('click', fetchAllReports);
    locationBtn.addEventListener('click', requestUserLocation);
    requestLocationBtn.addEventListener('click', requestUserLocation);
    radiusSelect.addEventListener('change', filterReportsByDistance);
    closeModal.addEventListener('click', () => reportModal.classList.add('hidden'));
    
    // Click outside modal to close
    window.addEventListener('click', (event) => {
        if (event.target === reportModal) {
            reportModal.classList.add('hidden');
        }
    });
    
    // Load all reports initially (without location filtering)
    fetchAllReports();
}

// Fetch all reports from Firestore - OPTIMIZED VERSION
async function fetchAllReports() {
    try {
        showElement(loadingElement);
        hideElement(reportsList);
        hideElement(locationPrompt);
        hideElement(errorMessage);
        
        console.log("Fetching reports from Firestore...");
        
        // Fetch all reports in one go
        const snapshot = await db.collection('reports')
            .orderBy('timestamp', 'desc')
            .get();
        
        allReports = snapshot.docs.map(doc => {
            const report = doc.data();
            report.id = doc.id;
            // Set default user data immediately
            report.userName = 'Unknown User';
            report.userProfileUrl = 'https://via.placeholder.com/50';
            report.userAddress = '';
            return report;
        });
        
        console.log(`Found ${allReports.length} reports, fetching user data...`);
        
        // Get unique user IDs from all reports
        const uniqueUserIds = [...new Set(allReports.map(report => report.user_id).filter(Boolean))];
        
        // Fetch all user data in parallel using batched approach
        if (uniqueUserIds.length > 0) {
            await fetchUserDataInBatches(uniqueUserIds);
        }
        
        console.log(`Loaded ${allReports.length} reports with user data`);
        
        // If we have user location, filter by distance
        if (userLocation) {
            filterReportsByDistance();
        } else {
            // Otherwise show all reports
            filteredReports = [...allReports];
            displayReports(filteredReports);
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
        hideElement(loadingElement);
        showElement(errorMessage);
    }
}

// Fetch user data in parallel batches for maximum performance
async function fetchUserDataInBatches(userIds) {
    // Firestore 'in' queries are limited to 10 items per query
    const BATCH_SIZE = 10;
    const batches = [];
    
    // Split user IDs into batches of 10
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        batches.push(userIds.slice(i, i + BATCH_SIZE));
    }
    
    // Execute all batches in parallel
    const batchPromises = batches.map(batch => 
        db.collection('users')
            .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
            .get()
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    // Process all batch results and update cache
    batchResults.forEach(snapshot => {
        snapshot.forEach(doc => {
            const userData = doc.data();
            userCache.set(doc.id, {
                name: userData.name || 'Unknown User',
                profileurl: userData.profileurl || 'https://via.placeholder.com/50',
                address: userData.address || ''
            });
        });
    });
    
    // Update all reports with user data from cache
    allReports.forEach(report => {
        if (report.user_id && userCache.has(report.user_id)) {
            const userData = userCache.get(report.user_id);
            report.userName = userData.name;
            report.userProfileUrl = userData.profileurl;
            report.userAddress = userData.address;
        }
    });
}

// Request user's location
function requestUserLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    showElement(loadingElement);
    hideElement(reportsList);
    hideElement(errorMessage);
    
    navigator.geolocation.getCurrentPosition(
        position => {
            userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            hideElement(locationPrompt);
            filterReportsByDistance();
        },
        error => {
            console.error('Error getting location:', error);
            hideElement(loadingElement);
            showElement(locationPrompt);
        },
        { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Filter reports by distance from user
function filterReportsByDistance() {
    const radius = parseInt(radiusSelect.value);
    
    if (userLocation) {
        filteredReports = allReports.filter(report => {
            if (!report.latitude || !report.longitude) return false;
            
            const distance = calculateDistance(
                userLocation.latitude, 
                userLocation.longitude,
                report.latitude,
                report.longitude
            );
            report.distance = distance;
            return distance <= radius;
        });
        
        // Sort by distance (nearest first)
        filteredReports.sort((a, b) => a.distance - b.distance);
    } else {
        // If no location, show all reports sorted by timestamp (newest first)
        filteredReports = [...allReports];
    }
    
    displayReports(filteredReports);
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Display reports in the list
function displayReports(reports) {
    hideElement(loadingElement);
    hideElement(errorMessage);
    
    if (reports.length === 0) {
        reportsList.innerHTML = '<p>No reports found in your area.</p>';
        showElement(reportsList);
        return;
    }
    
    reportsList.innerHTML = '';
    
    // Use document fragment for faster DOM manipulation
    const fragment = document.createDocumentFragment();
    
    reports.forEach(report => {
        const reportCard = createReportCard(report);
        fragment.appendChild(reportCard);
    });
    
    reportsList.appendChild(fragment);
    showElement(reportsList);
}

// Create a report card element
function createReportCard(report) {
    const card = document.createElement('div');
    card.className = 'report-card';
    card.dataset.id = report.id;
    
    // Format timestamp
    const reportDate = new Date(report.timestamp);
    const formattedDate = reportDate.toLocaleString();
    
    card.innerHTML = `
        <div class="user-info">
            <img src="${report.userProfileUrl}" 
                 alt="User profile" class="profile-image" onerror="this.src='https://via.placeholder.com/50'">
            <span class="user-name">${report.userName}</span>
        </div>
        <div class="report-content">
            <div class="disaster-type">${report.disaster_type}</div>
            <div class="location">${report.city}, ${report.state}</div>
            ${report.distance ? `<div class="distance">${report.distance.toFixed(1)} km away</div>` : ''}
            <div class="timestamp">${formattedDate}</div>
        </div>
        <button class="view-detail-btn" data-id="${report.id}">View Details</button>
    `;
    
    // Add event listener to the card and button
    const viewDetailBtn = card.querySelector('.view-detail-btn');
    viewDetailBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showReportDetails(report);
    });
    
    card.addEventListener('click', () => showReportDetails(report));
    
    return card;
}

// Show report details in modal
function showReportDetails(report) {
    showElement(loadingElement);
    
    try {
        // Format timestamp
        const reportDate = new Date(report.timestamp);
        const formattedDate = reportDate.toLocaleString();
        
        // Create media gallery HTML
        let mediaHtml = '';
        if (report.media_urls && report.media_urls.length > 0) {
            mediaHtml = `
                <h3>Media</h3>
                <div class="media-gallery">
                    ${report.media_urls.map(url => 
                        `<img src="${url}" alt="Report media" class="media-item" onerror="this.style.display='none'">`
                    ).join('')}
                </div>
            `;
        }
        
        modalBody.innerHTML = `
            <h2>${report.disaster_type}</h2>
            <div class="report-detail">
                <div class="detail-item"><span class="detail-label">City:</span> ${report.city || 'N/A'}</div>
                <div class="detail-item"><span class="detail-label">District:</span> ${report.district || 'N/A'}</div>
                <div class="detail-item"><span class="detail-label">Town:</span> ${report.town || 'N/A'}</div>
                <div class="detail-item"><span class="detail-label">State:</span> ${report.state || 'N/A'}</div>
                <div class="detail-item"><span class="detail-label">Time:</span> ${formattedDate}</div>
                <div class="detail-item"><span class="detail-label">Severity:</span> ${report.severity_score || 'N/A'}</div>
                <div class="detail-item"><span class="detail-label">Report Count:</span> ${report.report_count || 'N/A'}</div>
                ${report.distance ? `<div class="detail-item"><span class="detail-label">Distance:</span> ${report.distance.toFixed(1)} km away</div>` : ''}
                <div class="detail-item"><span class="detail-label">Description:</span> ${report.description || 'No description available'}</div>
            </div>
            ${mediaHtml}
            <div class="map-container" id="reportMap"></div>
            <div class="uploader-info">
                <img src="${report.userProfileUrl}" 
                     alt="User profile" class="profile-image" onerror="this.src='https://via.placeholder.com/50'">
                <div>
                    <div>Reported by: ${report.userName}</div>
                    ${report.userAddress ? `<div>Address: ${report.userAddress}</div>` : ''}
                </div>
            </div>
        `;
        
        // Initialize map if we have coordinates
        if (report.latitude && report.longitude) {
            initMap(report.latitude, report.longitude);
        } else {
            document.getElementById('reportMap').innerHTML = '<p>Location data not available for this report.</p>';
        }
        
        reportModal.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading report details:', error);
        alert('Failed to load report details.');
    } finally {
        hideElement(loadingElement);
    }
}

// Initialize map with report location
function initMap(lat, lng) {
    // Clear previous map if exists
    if (currentMap) {
        currentMap.remove();
    }
    
    // Create new map
    const mapElement = document.getElementById('reportMap');
    const map = L.map(mapElement).setView([lat, lng], 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    // Add marker
    L.marker([lat, lng]).addTo(map)
        .bindPopup('Report Location')
        .openPopup();
    
    currentMap = map;
}

// Helper functions to show/hide elements
function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
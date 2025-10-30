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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
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
    // Initialize all functionality
    initUserDropdown();
    initMobileMenu();
    initFilters();
    initSmoothScrolling();
    initSectionObserver();
    initLocationSelector();
    setupLogoutHandler();

    // Check if user is authenticated
    checkAuthState();

    // Fetch data from Firestore
    fetchReportsCount();
    fetchVerifiedAlertsCount();
    fetchUsersCount();
    fetchActiveHotspotsCount();
});

// Check authentication state with better error handling
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // Check if we're already on the login page to prevent redirect loops
            if (!window.location.pathname.includes('login')) {
                // Redirect to login page if not authenticated
                window.location.href = "/login";
            }
        } else {
            // User is signed in, update UI
            updateUserUI(user);
        }
    }, (error) => {
        console.error("Auth state error:", error);
        // Handle specific errors related to domain issues
        if (error.code === 'auth/network-request-failed') {
            console.warn("Network error - continuing without auth validation");
            // Continue without redirecting for development
        }
    });
}

// Update UI with user information
function updateUserUI(user) {
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement && user.displayName) {
        userNameElement.textContent = user.displayName;
    }
}

// Setup logout handler
function setupLogoutHandler() {
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
}

// Handle logout
async function handleLogout(event) {
    event.preventDefault();
    try {
        await auth.signOut();
        // Clear any local storage or session data
        localStorage.removeItem('firebaseAuth');
        sessionStorage.removeItem('firebaseAuth');
        // Redirect to logout endpoint to clear server session
        window.location.href = "{{ url_for('main.logout') }}";
    } catch (error) {
        console.error("Error signing out: ", error);
        // Still redirect to logout endpoint even if Firebase signout fails
        window.location.href = "{{ url_for('main.logout') }}";
    }
}

// User Dropdown Functionality
function initUserDropdown() {
    const dropdownTrigger = document.getElementById('userDropdownTrigger');
    const dropdownMenu = document.getElementById('userDropdown');
    
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
function initMobileMenu() {
    const hamburger = document.getElementById('mobileMenuToggle');
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

// Filter Functionality
function initFilters() {
    const applyFiltersBtn = document.querySelector('.apply-filters-btn');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            // Get all filter values
            const location = document.getElementById('location').value;
            const eventTypes = Array.from(document.querySelectorAll('.checkbox-group input:checked'))
                .map(input => input.parentElement.textContent.trim());
            const dateRange = document.getElementById('date-range').value;
            const source = document.getElementById('source').value;
            
            // In a real application, this would send a request to the backend
            console.log('Applying filters:', {
                location,
                eventTypes,
                dateRange,
                source
            });
            
            // Show loading state
            applyFiltersBtn.textContent = 'Applying...';
            applyFiltersBtn.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                // Reset button state
                applyFiltersBtn.textContent = 'Apply Filters';
                applyFiltersBtn.disabled = false;
                
                // Show success message (in a real app, this would update the map and data)
                showNotification('Filters applied successfully!', 'success');
            }, 1000);
        });
    }
    
    // Date range picker initialization placeholder
    // In a real application, you would initialize a date picker library here
    const dateRangeInput = document.getElementById('date-range');
    if (dateRangeInput) {
        dateRangeInput.addEventListener('focus', function() {
            console.log('Date range picker would open here');
            // Initialize date picker in a real application
        });
    }
}

// Location Selector Functionality
function initLocationSelector() {
    const locationButtons = document.querySelectorAll('.location-btn');
    
    locationButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            locationButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Handle location selection
            if (this.querySelector('.fa-location-arrow')) {
                // Auto-detect location
                detectUserLocation();
            } else {
                // Show location picker modal
                showLocationPicker();
            }
        });
    });
}

// Detect User Location
function detectUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                // In a real application, you would reverse geocode to get location name
                console.log('User location detected:', latitude, longitude);
                showNotification('Location detected successfully!', 'success');
            },
            function(error) {
                console.error('Error getting location:', error);
                showNotification('Could not detect your location. Please select manually.', 'error');
            }
        );
    } else {
        showNotification('Geolocation is not supported by your browser.', 'error');
    }
}

// Show Location Picker (placeholder)
function showLocationPicker() {
    console.log('Location picker would open here');
    // In a real application, you would show a modal with a map for location selection
}

// Smooth Scrolling for Anchor Links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Section Observer for Highlighting Active Menu Items
function initSectionObserver() {
    // This would require Intersection Observer API implementation
    // Placeholder for section highlighting functionality
    
    // In a real application, you would:
    // 1. Create an Intersection Observer
    // 2. Observe all sections
    // 3. Update the active navigation item based on the visible section
    console.log('Section observer would be initialized here');
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <p>${message}</p>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    // Add styles for notification
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s;
        }
        .notification.success { background-color: #10b981; }
        .notification.error { background-color: #ef4444; }
        .notification.info { background-color: #3b82f6; }
        .notification.show { transform: translateX(0); }
        .notification-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Close notification on button click
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', function() {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}

// Fetch total reports count from Firestore
async function fetchReportsCount() {
    try {
        const snapshot = await db.collection("reports").get();
        totalReports = snapshot.size;
        document.getElementById("total-reports").textContent = totalReports.toLocaleString();
        
        // Calculate trend (this week vs last week)
        const trend = await calculateReportsTrend();
        updateTrendElement("reports-trend", trend);
    } catch (error) {
        console.error("Error fetching reports count: ", error);
        document.getElementById("total-reports").textContent = "Error";
        document.getElementById("reports-trend").textContent = "Error loading data";
    }
}

// Fetch verified alerts count from Firestore
async function fetchVerifiedAlertsCount() {
    try {
        const snapshot = await db.collection("reports")
            .where("status", "==", "verified")
            .get();
            
        const count = snapshot.size;
        document.getElementById("verified-alerts").textContent = count.toLocaleString();
        
        // Calculate trend for verified alerts
        const trend = await calculateVerifiedTrend();
        updateTrendElement("verified-trend", trend);
    } catch (error) {
        console.error("Error fetching verified alerts count: ", error);
        document.getElementById("verified-alerts").textContent = "Error";
        document.getElementById("verified-trend").textContent = "Error loading data";
    }
}

// Fetch total users count from Firestore
async function fetchUsersCount() {
    try {
        const snapshot = await db.collection("users").get();
        const count = snapshot.size;
        document.getElementById("total-users").textContent = count.toLocaleString();
        
        // Calculate trend for users
        const trend = await calculateUsersTrend();
        updateTrendElement("users-trend", trend);
    } catch (error) {
        console.error("Error fetching users count: ", error);
        document.getElementById("total-users").textContent = "Error";
        document.getElementById("users-trend").textContent = "Error loading data";
    }
}

// Fetch active hotspots count from Firestore
async function fetchActiveHotspotsCount() {
    try {
        // Assuming hotspots are reports with status "active" and verified
        const snapshot = await db.collection("reports")
            .where("status", "in", ["active", "verified"])
            .get();
            
        const count = snapshot.size;
        document.getElementById("active-hotspots").textContent = count.toLocaleString();
        
        // Calculate trend for hotspots
        const trend = await calculateHotspotsTrend();
        updateTrendElement("hotspots-trend", trend);
    } catch (error) {
        console.error("Error fetching active hotspots count: ", error);
        document.getElementById("active-hotspots").textContent = "Error";
        document.getElementById("hotspots-trend").textContent = "Error loading data";
    }
}

// Calculate reports trend (this week vs last week)
async function calculateReportsTrend() {
    try {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        // Get reports from this week
        const thisWeekSnapshot = await db.collection("reports")
            .where("timestamp", ">=", oneWeekAgo)
            .get();
            
        // Get reports from last week
        const lastWeekSnapshot = await db.collection("reports")
            .where("timestamp", ">=", twoWeeksAgo)
            .where("timestamp", "<", oneWeekAgo)
            .get();
            
        const thisWeekCount = thisWeekSnapshot.size;
        const lastWeekCount = lastWeekSnapshot.size;
        
        if (lastWeekCount === 0) {
            return { value: thisWeekCount, trend: "new" };
        }
        
        const percentageChange = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
        return { value: percentageChange, trend: percentageChange >= 0 ? "up" : "down" };
    } catch (error) {
        console.error("Error calculating reports trend: ", error);
        return { value: 0, trend: "neutral" };
    }
}

// Calculate verified alerts trend
async function calculateVerifiedTrend() {
    try {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        // Get verified reports from this week
        const thisWeekSnapshot = await db.collection("reports")
            .where("status", "==", "verified")
            .where("timestamp", ">=", oneWeekAgo)
            .get();
            
        // Get verified reports from last week
        const lastWeekSnapshot = await db.collection("reports")
            .where("status", "==", "verified")
            .where("timestamp", ">=", twoWeeksAgo)
            .where("timestamp", "<", oneWeekAgo)
            .get();
            
        const thisWeekCount = thisWeekSnapshot.size;
        const lastWeekCount = lastWeekSnapshot.size;
        
        if (lastWeekCount === 0) {
            return { value: thisWeekCount, trend: "new" };
        }
        
        const percentageChange = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
        return { value: percentageChange, trend: percentageChange >= 0 ? "up" : "down" };
    } catch (error) {
        console.error("Error calculating verified trend: ", error);
        return { value: 0, trend: "neutral" };
    }
}

// Calculate users trend
async function calculateUsersTrend() {
    try {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        // Get users from this week
        const thisWeekSnapshot = await db.collection("users")
            .where("createdAt", ">=", oneWeekAgo)
            .get();
            
        // Get users from last week
        const lastWeekSnapshot = await db.collection("users")
            .where("createdAt", ">=", twoWeeksAgo)
            .where("createdAt", "<", oneWeekAgo)
            .get();
            
        const thisWeekCount = thisWeekSnapshot.size;
        const lastWeekCount = lastWeekSnapshot.size;
        
        if (lastWeekCount === 0) {
            return { value: thisWeekCount, trend: "new" };
        }
        
        const percentageChange = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
        return { value: percentageChange, trend: percentageChange >= 0 ? "up" : "down" };
    } catch (error) {
        console.error("Error calculating users trend: ", error);
        return { value: 0, trend: "neutral" };
    }
}

// Calculate hotspots trend
async function calculateHotspotsTrend() {
    try {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        // Get active hotspots from this week
        const thisWeekSnapshot = await db.collection("reports")
            .where("status", "in", ["active", "verified"])
            .where("timestamp", ">=", oneWeekAgo)
            .get();
            
        // Get active hotspots from last week
        const lastWeekSnapshot = await db.collection("reports")
            .where("status", "in", ["active", "verified"])
            .where("timestamp", ">=", twoWeeksAgo)
            .where("timestamp", "<", oneWeekAgo)
            .get();
            
        const thisWeekCount = thisWeekSnapshot.size;
        const lastWeekCount = lastWeekSnapshot.size;
        
        if (lastWeekCount === 0) {
            return { value: thisWeekCount, trend: "new" };
        }
        
        const percentageChange = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
        return { value: percentageChange, trend: percentageChange >= 0 ? "up" : "down" };
    } catch (error) {
        console.error("Error calculating hotspots trend: ", error);
        return { value: 0, trend: "neutral" };
    }
}

// Update trend element with appropriate styling
function updateTrendElement(elementId, trendData) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let trendText, trendClass;
    
    if (trendData.trend === "up") {
        trendText = `<i class="fas fa-arrow-up"></i> ${Math.abs(trendData.value).toFixed(1)}% this week`;
        trendClass = "up";
    } else if (trendData.trend === "down") {
        trendText = `<i class="fas fa-arrow-down"></i> ${Math.abs(trendData.value).toFixed(1)}% this week`;
        trendClass = "down";
    } else if (trendData.trend === "new") {
        trendText = `${trendData.value} new this week`;
        trendClass = "up";
    } else {
        trendText = `<i class="fas fa-minus"></i> No change`;
        trendClass = "neutral";
    }
    
    element.innerHTML = trendText;
    element.className = `stat-trend ${trendClass}`;
}
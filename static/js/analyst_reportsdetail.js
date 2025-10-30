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
    // Check if Firebase is already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

const db = firebase.firestore();
let map = null;
let mapInitialized = false;

// Get report ID from URL parameters
function getReportIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('reportId');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing report details page...");
    
    // Get report ID from URL
    const reportId = getReportIdFromUrl();
    console.log("Report ID from URL:", reportId);
    
    // Initialize event listeners
    document.getElementById('back-button').addEventListener('click', function() {
        window.location.href = '/analyst/dashboard';
    });
    
    // Initialize modal functionality
    const modal = document.getElementById("media-modal");
    const closeBtn = document.getElementsByClassName("close")[0];
    
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = "none";
            // Pause video when closing modal
            const video = document.getElementById("modal-video");
            if (video) video.pause();
        };
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            // Pause video when closing modal
            const video = document.getElementById("modal-video");
            if (video) video.pause();
        }
    };
    
    // Fetch and display report details using the ID from URL
    if (reportId) {
        fetchReportDetails(reportId);
    } else {
        showError("No report ID provided in URL");
    }
});

// Fetch report details from Firestore
function fetchReportDetails(reportId) {
    showLoading();
    console.log("Fetching report details for ID:", reportId);
    
    // For demonstration, we'll use mock data
    // In a real application, you would fetch from Firestore
    setTimeout(() => {
        loadMockData();
    }, 1000);
}

// Load mock data for demonstration
function loadMockData() {
    const mockData = {
        city: "Mumbai",
        description: "Heavy monsoon rainfall caused minor flooding in coastal lanes along Malabar Hill, close to Marine Drive. Road traffic was affected, but no major property damage reported.",
        disaster_type: "flood",
        district: "mumbai",
        latitude: 18.951951,
        location_id: "LOC68299",
        longitude: 72.808139,
        media_urls: ["https://res.cloudinary.com/dtarhtz5w/image/upload/v1758050362/pu8njpxfnsczkr3zfhf3.png"],
        report_count: 1,
        severity_score: 3,
        state: "Maharashtra",
        timestamp: "2025-09-16T19:19:21.730Z",
        town: "malabar hill",
        user_id: "user123",
        village: "walkeshwar road and coastal lanes"
    };
    
    displayReportDetails(mockData);
    hideLoading();
}

// Display report details on the page
function displayReportDetails(report) {
    console.log("Displaying report details:", report);
    
    // Fill in overview information
    document.getElementById('state').textContent = report.state || 'N/A';
    document.getElementById('district').textContent = report.district || 'N/A';
    document.getElementById('town').textContent = report.town || 'N/A';
    document.getElementById('village').textContent = report.village || 'N/A';
    document.getElementById('coordinates').textContent = 
        `${report.latitude || 'N/A'}, ${report.longitude || 'N/A'}`;
    
    document.getElementById('disaster-type').textContent = report.disaster_type || 'N/A';
    document.getElementById('severity').textContent = report.severity_score || 'N/A';
    document.getElementById('report-count').textContent = report.report_count || 'N/A';
    document.getElementById('location-id').textContent = report.location_id || 'N/A';
    
    // Format and display timestamp
    if (report.timestamp) {
        let timestamp;
        if (typeof report.timestamp === 'string') {
            timestamp = new Date(report.timestamp);
        } else if (report.timestamp && typeof report.timestamp.toDate === 'function') {
            timestamp = report.timestamp.toDate();
        } else {
            timestamp = new Date();
        }
        document.getElementById('timestamp').textContent = timestamp.toLocaleString();
    } else {
        document.getElementById('timestamp').textContent = 'N/A';
    }
    
    // Display description
    document.getElementById('description').textContent = report.description || 'No description available';
    
    // Display media
    displayMedia(report.media_urls || []);
    
    // Show the content first, then initialize map
    document.getElementById('report-content').style.display = 'block';
    
    // Initialize map with report location after a small delay to ensure DOM is rendered
    setTimeout(() => {
        initializeMap(report.latitude, report.longitude);
    }, 100);
}

// Display media items with separate sections for images and videos
function displayMedia(mediaUrls) {
    const mediaContainer = document.getElementById('media-container');
    mediaContainer.innerHTML = '';
    
    if (mediaUrls.length === 0) {
        mediaContainer.innerHTML = '<p>No media available for this report</p>';
        return;
    }
    
    // Separate images and videos
    const images = mediaUrls.filter(url => url.match(/\.(jpeg|jpg|gif|png|webp)$/i));
    const videos = mediaUrls.filter(url => url.match(/\.(mp4|webm|ogg)$/i));
    
    // Display images section
    if (images.length > 0) {
        const imagesSection = document.createElement('div');
        imagesSection.className = 'media-section';
        imagesSection.innerHTML = '<h3>Images</h3>';
        
        const imagesGrid = document.createElement('div');
        imagesGrid.className = 'media-grid';
        
        images.forEach((url, index) => {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'media-item';
            
            const img = document.createElement('img');
            img.src = url;
            img.alt = `Report image ${index + 1}`;
            img.className = 'media-image';
            img.onclick = function() {
                openModal(url, 'image');
            };
            
            const expandButton = document.createElement('button');
            expandButton.textContent = 'Expand';
            expandButton.className = 'btn-primary';
            expandButton.style.margin = '10px';
            expandButton.onclick = function() {
                openModal(url, 'image');
            };
            
            mediaItem.appendChild(img);
            mediaItem.appendChild(expandButton);
            imagesGrid.appendChild(mediaItem);
        });
        
        imagesSection.appendChild(imagesGrid);
        mediaContainer.appendChild(imagesSection);
    }
    
    // Display videos section
    if (videos.length > 0) {
        const videosSection = document.createElement('div');
        videosSection.className = 'media-section';
        videosSection.innerHTML = '<h3>Videos</h3>';
        
        const videosGrid = document.createElement('div');
        videosGrid.className = 'media-grid';
        
        videos.forEach((url, index) => {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'media-item';
            
            const videoContainer = document.createElement('div');
            videoContainer.style.position = 'relative';
            
            const video = document.createElement('video');
            video.src = url;
            video.className = 'media-video';
            video.controls = true;
            video.style.width = '100%';
            video.style.height = '200px';
            
            const expandButton = document.createElement('button');
            expandButton.textContent = 'Expand';
            expandButton.className = 'btn-primary';
            expandButton.style.position = 'absolute';
            expandButton.style.bottom = '10px';
            expandButton.style.right = '10px';
            expandButton.onclick = function() {
                openModal(url, 'video');
            };
            
            videoContainer.appendChild(video);
            videoContainer.appendChild(expandButton);
            mediaItem.appendChild(videoContainer);
            videosGrid.appendChild(mediaItem);
        });
        
        videosSection.appendChild(videosGrid);
        mediaContainer.appendChild(videosSection);
    }
}

// Open media in modal
function openModal(url, type) {
    const modal = document.getElementById("media-modal");
    const modalImg = document.getElementById("modal-image");
    const modalVideo = document.getElementById("modal-video");
    const captionText = document.getElementById("caption");
    
    if (type === 'image') {
        modalImg.style.display = "block";
        modalVideo.style.display = "none";
        modalImg.src = url;
        captionText.innerHTML = "Report Evidence Image";
    } else if (type === 'video') {
        modalImg.style.display = "none";
        modalVideo.style.display = "block";
        modalVideo.src = url;
        modalVideo.controls = true;
        captionText.innerHTML = "Report Evidence Video";
    }
    
    modal.style.display = "block";
}

// Initialize map with report location
function initializeMap(latitude, longitude) {
    if (!latitude || !longitude) {
        document.getElementById('map').innerHTML = '<p>No location data available for this report</p>';
        return;
    }
    
    // Check if map is already initialized
    if (mapInitialized && map) {
        // Update existing map
        map.setView([latitude, longitude], 13);
        return;
    }
    
    // Initialize map
    map = L.map('map').setView([latitude, longitude], 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}/png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add marker for report location with custom icon
    const customIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        shadowSize: [41, 41]
    });
    
    L.marker([latitude, longitude], {icon: customIcon})
        .addTo(map)
        .bindPopup(`
            <strong>Report Location</strong><br>
            Latitude: ${latitude}<br>
            Longitude: ${longitude}
        `)
        .openPopup();
    
    // Add a circle to highlight the area
    L.circle([latitude, longitude], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.2,
        radius: 500
    }).addTo(map);
    
    // Fix for map not displaying correctly
    setTimeout(() => {
        if (map) {
            map.invalidateSize();
        }
    }, 200);
    
    mapInitialized = true;
}

// Show loading overlay
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// Show error message
function showError(message) {
    document.getElementById('error-text').textContent = message;
    document.getElementById('error-message').style.display = 'block';
    hideLoading();
}
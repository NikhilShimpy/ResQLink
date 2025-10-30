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
const auth = firebase.auth();

// Cloudinary configuration
const cloudName = 'dtarhtz5w';
const uploadPreset = 'reports';

// Global variables
let map;
let marker;
let currentLocation = { lat: 0, lng: 0 };
let mediaFiles = [];

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    checkAuthState();
});

// Initialize Leaflet map
function initializeMap() {
    map = L.map('map').setView([20, 0], 2);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add click event to map
    map.on('click', function(e) {
        updateLocation(e.latlng.lat, e.latlng.lng);
    });
}

// Set up event listeners
function setupEventListeners() {
    // Auto location button
    document.getElementById('autoLocateBtn').addEventListener('click', autoDetectLocation);
    
    // Media upload
    document.getElementById('mediaUpload').addEventListener('change', handleMediaUpload);
    
    // Form submission
    document.getElementById('disasterReportForm').addEventListener('submit', handleFormSubmission);
}

// Check authentication state
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('User is signed in:', user.uid);
        } else {
            console.log('No user is signed in.');
            // In a real application, you would redirect to login
            alert('Please sign in to submit a report');
        }
    });
}

// Auto detect location using browser geolocation
function autoDetectLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    const button = document.getElementById('autoLocateBtn');
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="icon">⏳</span> Detecting location...';
    button.disabled = true;
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            updateLocation(lat, lng);
            button.innerHTML = originalText;
            button.disabled = false;
        },
        (error) => {
            console.error('Error getting location:', error);
            alert('Unable to retrieve your location. Please make sure location services are enabled.');
            button.innerHTML = originalText;
            button.disabled = false;
        }
    );
}

// Update location fields and map marker
function updateLocation(lat, lng) {
    currentLocation = { lat, lng };
    
    // Update latitude and longitude fields
    document.getElementById('latitude').value = lat.toFixed(6);
    document.getElementById('longitude').value = lng.toFixed(6);
    
    // Update map marker
    if (marker) {
        map.removeLayer(marker);
    }
    
    marker = L.marker([lat, lng]).addTo(map);
    map.setView([lat, lng], 15);
    
    // Reverse geocode to get address details
    reverseGeocode(lat, lng);
}

// Reverse geocode coordinates to address
function reverseGeocode(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.address) {
                const address = data.address;
                
                // Update form fields with address data
                if (address.state) document.getElementById('state').value = address.state;
                if (address.county) document.getElementById('district').value = address.county;
                if (address.city || address.town || address.village) {
                    document.getElementById('city').value = address.city || address.town || address.village;
                }
                if (address.town) document.getElementById('town').value = address.town;
                if (address.village || address.suburb || address.road) {
                    document.getElementById('village').value = address.village || address.suburb || address.road;
                }
            }
        })
        .catch(error => {
            console.error('Error reverse geocoding:', error);
        });
}

// Handle media upload
function handleMediaUpload(event) {
    const files = event.target.files;
    const previewContainer = document.getElementById('mediaPreview');
    
    if (files.length === 0) {
        previewContainer.innerHTML = '<p>No media selected</p>';
        mediaFiles = [];
        return;
    }
    
    previewContainer.innerHTML = '';
    mediaFiles = Array.from(files);
    
    mediaFiles.forEach((file, index) => {
        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';
        
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            mediaItem.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            mediaItem.appendChild(video);
        }
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-media';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => removeMediaFile(index);
        mediaItem.appendChild(removeBtn);
        
        previewContainer.appendChild(mediaItem);
    });
}

// Remove media file from selection
function removeMediaFile(index) {
    mediaFiles.splice(index, 1);
    
    // Update file input
    const dataTransfer = new DataTransfer();
    mediaFiles.forEach(file => dataTransfer.items.add(file));
    document.getElementById('mediaUpload').files = dataTransfer.files;
    
    // Update preview
    handleMediaUpload({ target: document.getElementById('mediaUpload') });
}

// Upload media to Cloudinary
async function uploadMediaToCloudinary() {
    const uploadUrls = [];
    
    for (const file of mediaFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            uploadUrls.push(data.secure_url);
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
        }
    }
    
    return uploadUrls;
}

// Generate a random location ID
function generateLocationId() {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `LOC${randomNum}`;
}

// Handle form submission
async function handleFormSubmission(event) {
    event.preventDefault();
    
    // Validate required fields
    if (!validateForm()) {
        showMessage('Please fill all required fields', 'error');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        showMessage('Please sign in to submit a report', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting...';
    
    try {
        // Upload media files
        const mediaUrls = mediaFiles.length > 0 ? await uploadMediaToCloudinary() : [];
        
        // Prepare report data
        const reportData = {
            location_id: generateLocationId(),
            disaster_type: document.getElementById('disasterType').value,
            state: document.getElementById('state').value,
            district: document.getElementById('district').value,
            city: document.getElementById('city').value,
            town: document.getElementById('town').value,
            village: document.getElementById('village').value,
            latitude: parseFloat(document.getElementById('latitude').value),
            longitude: parseFloat(document.getElementById('longitude').value),
            severity_score: parseInt(document.getElementById('severityScore').value),
            description: document.getElementById('description').value,
            media_urls: mediaUrls,
            user_id: user.uid,
            report_count: 1,
            timestamp: new Date().toISOString()
        };
        
        // Save to Firestore
        await db.collection('reports').add(reportData);
        
        // Show success message and report details
        showReportDetails(reportData);
        showMessage('Report submitted successfully!', 'success');
        
        // Reset form
        document.getElementById('disasterReportForm').reset();
        mediaFiles = [];
        document.getElementById('mediaPreview').innerHTML = '<p>No media selected</p>';
        
    } catch (error) {
        console.error('Error submitting report:', error);
        showMessage('Error submitting report. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Report';
    }
}

// Validate form
function validateForm() {
    const requiredFields = [
        'disasterType', 'state', 'district', 'city', 'village', 
        'severityScore', 'description'
    ];
    
    for (const fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.focus();
            return false;
        }
    }
    
    if (currentLocation.lat === 0 && currentLocation.lng === 0) {
        alert('Please select a location on the map or use auto detection');
        return false;
    }
    
    return true;
}

// Show message
function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove('hidden');
    
    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 5000);
}

// Show report details after submission
function showReportDetails(reportData) {
    const detailsEl = document.querySelector('.details-content');
    detailsEl.innerHTML = `
        <p><strong>Location ID:</strong> ${reportData.location_id}</p>
        <p><strong>Disaster Type:</strong> ${reportData.disaster_type}</p>
        <p><strong>Location:</strong> ${reportData.village}, ${reportData.town ? reportData.town + ', ' : ''}${reportData.city}, ${reportData.district}, ${reportData.state}</p>
        <p><strong>Coordinates:</strong> ${reportData.latitude.toFixed(6)}, ${reportData.longitude.toFixed(6)}</p>
        <p><strong>Severity Score:</strong> ${reportData.severity_score}/5</p>
        <p><strong>Description:</strong> ${reportData.description}</p>
        <p><strong>Timestamp:</strong> ${new Date(reportData.timestamp).toLocaleString()}</p>
        ${reportData.media_urls.length > 0 ? `
            <div class="media-urls">
                <strong>Media URLs:</strong>
                ${reportData.media_urls.map(url => `<a href="${url}" target="_blank">${url}</a>`).join('')}
            </div>
        ` : ''}
    `;
    
    document.getElementById('reportDetails').classList.remove('hidden');
}
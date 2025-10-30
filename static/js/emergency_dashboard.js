class RescueDashboard {
    constructor() {
        this.map = null;
        this.sosMarkers = new Map();
        this.socket = null;
        this.isConnected = false;
        
        this.initializeDashboard();
    }

    async initializeDashboard() {
        await this.initializeMap();
        this.initializeSocket();
        await this.loadSOSData();
    }

    initializeMap() {
        // Initialize Leaflet map centered on India
        this.map = L.map('map').setView([20.5937, 78.9629], 5);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Add scale control
        L.control.scale().addTo(this.map);

        console.log('Map initialized');
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('Dashboard connected to server');
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('Dashboard disconnected from server');
        });

        this.socket.on('new_sos', (data) => {
            console.log('New SOS on dashboard:', data);
            this.addSOSMarker(data);
            this.addSOSToTable(data);
            this.showSOSNotification(data);
        });
    }

    async loadSOSData() {
        try {
            const response = await fetch('/api/emergency/sos');
            const sosData = await response.json();
            
            // Clear existing markers
            this.sosMarkers.forEach(marker => this.map.removeLayer(marker));
            this.sosMarkers.clear();
            
            // Clear table
            const tableBody = document.getElementById('sos-table-body');
            tableBody.innerHTML = '';
            
            // Add all SOS markers and table rows
            sosData.forEach(sos => {
                this.addSOSMarker(sos);
                this.addSOSToTable(sos);
            });
            
            console.log(`Loaded ${sosData.length} SOS alerts`);
        } catch (error) {
            console.error('Failed to load SOS data:', error);
        }
    }

    addSOSMarker(sosData) {
        const { latitude, longitude, sender, message, timestamp } = sosData;
        
        if (!latitude || !longitude) {
            console.warn('Invalid coordinates for SOS:', sosData);
            return;
        }

        // Create custom emergency icon
        const emergencyIcon = L.divIcon({
            className: 'emergency-marker',
            html: '🚨',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        // Create marker
        const marker = L.marker([latitude, longitude], { icon: emergencyIcon })
            .addTo(this.map)
            .bindPopup(`
                <div class="sos-popup">
                    <h3>🚨 Emergency SOS</h3>
                    <p><strong>From:</strong> ${this.escapeHtml(sender)}</p>
                    <p><strong>Message:</strong> ${this.escapeHtml(message)}</p>
                    <p><strong>Time:</strong> ${new Date(timestamp * 1000).toLocaleString()}</p>
                    <p><strong>Coordinates:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
                    <button onclick="window.rescueDashboard.flyToLocation(${latitude}, ${longitude})" 
                            style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Fly to Location
                    </button>
                </div>
            `);

        // Store marker reference
        const markerId = `${sender}_${timestamp}`;
        this.sosMarkers.set(markerId, marker);

        // Auto-open popup for new SOS alerts
        if (Date.now() - (timestamp * 1000) < 60000) {
            marker.openPopup();
        }
    }

    addSOSToTable(sosData) {
        const tableBody = document.getElementById('sos-table-body');
        const row = document.createElement('tr');
        
        const timestamp = new Date(sosData.timestamp * 1000);
        const timeString = timestamp.toLocaleString();
        
        row.innerHTML = `
            <td>${this.escapeHtml(sosData.sender)}</td>
            <td>${this.escapeHtml(sosData.message)}</td>
            <td>${sosData.latitude?.toFixed(6) || 'N/A'}, ${sosData.longitude?.toFixed(6) || 'N/A'}</td>
            <td>${timeString}</td>
            <td>
                <button onclick="window.rescueDashboard.flyToLocation(${sosData.latitude}, ${sosData.longitude})" 
                        class="action-btn">
                    🗺️ View
                </button>
                <button onclick="window.rescueDashboard.centerOnSOS('${sosData.sender}', ${sosData.timestamp})" 
                        class="action-btn">
                    📍 Center
                </button>
            </td>
        `;
        
        // Add new row at the top
        if (tableBody.firstChild) {
            tableBody.insertBefore(row, tableBody.firstChild);
        } else {
            tableBody.appendChild(row);
        }
    }

    flyToLocation(lat, lng) {
        this.map.flyTo([lat, lng], 16, {
            duration: 2,
            easeLinearity: 0.25
        });
    }

    centerOnSOS(sender, timestamp) {
        const markerId = `${sender}_${timestamp}`;
        const marker = this.sosMarkers.get(markerId);
        
        if (marker) {
            this.map.setView(marker.getLatLng(), 16);
            marker.openPopup();
        }
    }

    showSOSNotification(sosData) {
        // Create browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🚨 New SOS Alert', {
                body: `Emergency from ${sosData.sender} at ${sosData.latitude.toFixed(4)}, ${sosData.longitude.toFixed(4)}`,
                icon: '/static/favicon.ico'
            });
        }
        
        // Show visual alert on page
        this.createVisualAlert(sosData);
    }

    createVisualAlert(sosData) {
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #dc2626, #f59e0b);
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            animation: alertPulse 2s infinite;
        `;
        
        alertDiv.innerHTML = `
            <strong>🚨 NEW SOS ALERT</strong><br>
            From: ${this.escapeHtml(sosData.sender)}<br>
            ${this.escapeHtml(sosData.message)}<br>
            Location: ${sosData.latitude.toFixed(4)}, ${sosData.longitude.toFixed(4)}
        `;
        
        document.body.appendChild(alertDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(alertDiv)) {
                document.body.removeChild(alertDiv);
            }
        }, 5000);
    }

    async exportSOSLogs() {
        try {
            const response = await fetch('/api/emergency/sos');
            const sosData = await response.json();
            
            // Convert to CSV
            const headers = ['Sender', 'Message', 'Latitude', 'Longitude', 'Timestamp', 'DateTime'];
            const csvData = sosData.map(sos => [
                `"${sos.sender.replace(/"/g, '""')}"`,
                `"${sos.message.replace(/"/g, '""')}"`,
                sos.latitude,
                sos.longitude,
                sos.timestamp,
                `"${sos.datetime}"`
            ]);
            
            const csvContent = [headers, ...csvData]
                .map(row => row.join(','))
                .join('\n');
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sos-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showToast('SOS logs exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Failed to export SOS logs', 'error');
        }
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1001;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 3000);
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Global function for export button
function exportSOSLogs() {
    window.rescueDashboard.exportSOSLogs();
}

// Add CSS for map markers and animations
const style = document.createElement('style');
style.textContent = `
    .emergency-marker {
        background: none;
        border: none;
        font-size: 24px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    
    @keyframes alertPulse {
        0% { box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4); }
        50% { box-shadow: 0 4px 20px rgba(220, 38, 38, 0.8); }
        100% { box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4); }
    }
    
    .sos-popup {
        min-width: 200px;
    }
    
    .sos-popup h3 {
        margin: 0 0 0.5rem 0;
        color: #dc2626;
    }
    
    .sos-popup p {
        margin: 0.25rem 0;
    }
    
    .action-btn {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        margin: 0.1rem;
    }
    
    .action-btn:hover {
        background: #2563eb;
    }
`;
document.head.appendChild(style);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rescueDashboard = new RescueDashboard();
});
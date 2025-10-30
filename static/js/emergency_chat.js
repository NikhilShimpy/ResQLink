class EmergencyChat {
    constructor() {
        this.socket = null;
        this.username = null;
        this.currentLocation = null;
        this.locationWatchId = null;
        this.isConnected = false;
        
        this.initializeApp();
    }

    initializeApp() {
        this.initializeSocket();
        this.setupEventListeners();
        this.startLocationTracking();
        
        // Check for saved username
        const savedUsername = localStorage.getItem('emergency_username');
        if (savedUsername) {
            document.getElementById('username-input').value = savedUsername;
        }
    }

    initializeSocket() {
        // Connect to Socket.IO server
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
            this.isConnected = true;
            this.updateConnectionStatus('Connected', 'connected');
            this.showToast('Connected to emergency network', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.updateConnectionStatus('Disconnected', 'disconnected');
            this.showToast('Disconnected from network', 'error');
        });

        this.socket.on('connected', (data) => {
            console.log('Server connection confirmed:', data);
        });

        this.socket.on('new_message', (data) => {
            console.log('New message received:', data);
            this.displayMessage(data);
        });

        this.socket.on('new_sos', (data) => {
            console.log('New SOS received:', data);
            this.displaySOSAlert(data);
            this.showToast(`🚨 SOS from ${data.sender}`, 'sos');
        });
    }

    updateConnectionStatus(text, status) {
        const indicator = document.getElementById('connection-indicator');
        const textElement = document.getElementById('connection-text');
        
        textElement.textContent = text;
        indicator.className = status;
    }

    setupEventListeners() {
        const messageInput = document.getElementById('message-input');
        const usernameInput = document.getElementById('username-input');

        // Enter key support
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.setUsername();
            }
        });
    }

    setUsername() {
        const usernameInput = document.getElementById('username-input');
        const username = usernameInput.value.trim();

        if (!username) {
            this.showToast('Please enter your name', 'error');
            return;
        }

        this.username = username;
        localStorage.setItem('emergency_username', username);

        // Show chat interface
        document.getElementById('username-section').classList.add('hidden');
        document.getElementById('chat-interface').classList.remove('hidden');
        document.getElementById('current-user').textContent = username;

        this.showToast(`Welcome ${username}! You're now connected to the network.`, 'success');
        
        // Add join message
        this.displaySystemMessage(`${username} joined the chat`);
    }

    sendMessage() {
        if (!this.username) {
            this.showToast('Please set your username first', 'error');
            return;
        }

        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();

        if (!message) {
            return;
        }

        if (!this.isConnected) {
            this.showToast('Not connected to network', 'error');
            return;
        }

        console.log('Sending message:', message);
        
        // Emit the message to server
        this.socket.emit('send_message', {
            sender: this.username,
            message: message
        });

        // Clear input
        messageInput.value = '';
        messageInput.focus();
    }

    async sendSOS() {
        if (!this.username) {
            this.showToast('Please set your username first', 'error');
            return;
        }

        if (!this.currentLocation) {
            this.showToast('Getting your location... please wait', 'warning');
            return;
        }

        if (!this.isConnected) {
            this.showToast('Not connected to network', 'error');
            return;
        }

        try {
            console.log('Sending SOS with location:', this.currentLocation);
            
            this.socket.emit('send_sos', {
                sender: this.username,
                message: 'Emergency SOS Alert - Need immediate assistance!',
                latitude: this.currentLocation.latitude,
                longitude: this.currentLocation.longitude
            });

            this.showToast('🚨 SOS Alert Sent! Help is on the way.', 'sos');
        } catch (error) {
            console.error('SOS Error:', error);
            this.showToast('Failed to send SOS alert', 'error');
        }
    }

    displayMessage(data) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        
        const isOwnMessage = data.sender === this.username;
        messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
        
        const timestamp = new Date(data.timestamp * 1000).toLocaleTimeString();
        
        messageElement.innerHTML = `
            <div class="message-sender">${this.escapeHtml(data.sender)}</div>
            <div class="message-text">${this.escapeHtml(data.message)}</div>
            <div class="message-time">${timestamp}</div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    displaySOSAlert(data) {
        const messagesContainer = document.getElementById('messages');
        const sosElement = document.createElement('div');
        
        sosElement.className = 'message sos-alert';
        
        const timestamp = new Date(data.timestamp * 1000).toLocaleTimeString();
        const locationLink = `https://maps.google.com/?q=${data.latitude},${data.longitude}`;
        
        sosElement.innerHTML = `
            <div class="message-sender">🚨 EMERGENCY SOS</div>
            <div class="message-text">From: ${this.escapeHtml(data.sender)}</div>
            <div class="message-text">${this.escapeHtml(data.message)}</div>
            <div class="message-text">
                📍 <a href="${locationLink}" target="_blank" style="color: white; text-decoration: underline;">
                    View Location (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)})
                </a>
            </div>
            <div class="message-time">${timestamp}</div>
        `;

        messagesContainer.appendChild(sosElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Emergency sound notification
        this.playSOSSound();
    }

    displaySystemMessage(message) {
        const messagesContainer = document.getElementById('messages');
        const systemElement = document.createElement('div');
        
        systemElement.className = 'system-message';
        systemElement.textContent = message;

        messagesContainer.appendChild(systemElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    playSOSSound() {
        // Create emergency beep sound
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            oscillator.frequency.setValueAtTime(800, context.currentTime);
            oscillator.frequency.setValueAtTime(600, context.currentTime + 0.1);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
            
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.3);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    startLocationTracking() {
        const locationStatus = document.getElementById('location-status');
        
        if (!navigator.geolocation) {
            locationStatus.textContent = '📍 Geolocation not supported';
            locationStatus.style.color = '#ef4444';
            return;
        }

        locationStatus.textContent = '📍 Getting location...';

        // Get initial position
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.updateLocation(position);
                locationStatus.textContent = '📍 Location acquired';
                locationStatus.style.color = '#10b981';
            },
            (error) => {
                console.error('Geolocation error:', error);
                locationStatus.textContent = '📍 Location access denied';
                locationStatus.style.color = '#ef4444';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );

        // Watch for position changes
        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => this.updateLocation(position),
            (error) => {
                console.error('Geolocation watch error:', error);
                locationStatus.textContent = '📍 Location tracking failed';
                locationStatus.style.color = '#ef4444';
            },
            {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 300000
            }
        );
    }

    updateLocation(position) {
        this.currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
        };
        
        console.log('Location updated:', this.currentLocation);
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast';
        
        // Add type-based styling
        if (type === 'error') {
            toast.style.background = '#ef4444';
        } else if (type === 'success') {
            toast.style.background = '#10b981';
        } else if (type === 'warning') {
            toast.style.background = '#f59e0b';
        } else if (type === 'sos') {
            toast.style.background = 'linear-gradient(45deg, #dc2626, #f59e0b)';
        }
        
        toast.classList.remove('hidden');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Cleanup
    destroy() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
        }
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Global functions for HTML onclick handlers
function setUsername() {
    window.emergencyChat.setUsername();
}

function sendMessage() {
    window.emergencyChat.sendMessage();
}

function sendSOS() {
    window.emergencyChat.sendSOS();
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.emergencyChat = new EmergencyChat();
});
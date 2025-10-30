class EmergencyChat {
    constructor() {
        this.socket = null;
        this.username = null;
        this.currentLocation = null;
        this.locationWatchId = null;
        this.isConnected = false;
        this.messageCount = 0;
        this.autoScrollEnabled = true;
        
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

        // Initialize scroll behavior
        this.setupScrollBehavior();
    }

    initializeSocket() {
        this.showLoading(true);
        
        // Connect to Socket.IO server
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
            this.isConnected = true;
            this.updateConnectionStatus('Connected', 'connected');
            this.showToast('Connected to emergency network', 'success');
            this.showLoading(false);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.updateConnectionStatus('Disconnected', 'disconnected');
            this.showToast('Disconnected from network', 'error');
            this.showLoading(false);
        });

        this.socket.on('connect_error', (error) => {
            console.log('Connection error:', error);
            this.updateConnectionStatus('Connection Failed', 'disconnected');
            this.showToast('Failed to connect to network', 'error');
            this.showLoading(false);
        });

        this.socket.on('connected', (data) => {
            console.log('Server connection confirmed:', data);
        });

        this.socket.on('new_message', (data) => {
            console.log('New message received:', data);
            this.displayMessage(data);
            this.scrollToBottom();
        });

        this.socket.on('new_sos', (data) => {
            console.log('New SOS received:', data);
            this.displaySOSAlert(data);
            this.showToast(`🚨 SOS Alert from ${data.sender}`, 'sos');
            this.scrollToBottom();
        });

        // Handle user count updates
        this.socket.on('user_joined', (data) => {
            this.updateOnlineCount(data.count);
        });

        this.socket.on('user_left', (data) => {
            this.updateOnlineCount(data.count);
        });
    }

    setupScrollBehavior() {
        const messagesContainer = document.querySelector('.messages');
        const scrollIndicator = document.getElementById('scroll-indicator');
        
        messagesContainer.addEventListener('scroll', () => {
            const isAtBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 50;
            
            if (isAtBottom) {
                scrollIndicator.classList.remove('visible');
                this.autoScrollEnabled = true;
            } else {
                scrollIndicator.classList.add('visible');
                this.autoScrollEnabled = false;
            }
        });

        // Scroll to bottom when indicator is clicked
        scrollIndicator.addEventListener('click', () => {
            this.scrollToBottom();
            scrollIndicator.classList.remove('visible');
        });
    }

    scrollToBottom() {
        if (this.autoScrollEnabled) {
            const messagesContainer = document.querySelector('.messages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    updateConnectionStatus(text, status) {
        const indicator = document.getElementById('connection-indicator');
        const textElement = document.getElementById('connection-text');
        
        textElement.textContent = text;
        indicator.className = status;
    }

    updateOnlineCount(count) {
        document.getElementById('online-count').textContent = count;
    }

    updateMessageCount() {
        this.messageCount++;
        document.getElementById('message-count').textContent = `${this.messageCount} messages`;
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

        // Input focus effects
        messageInput.addEventListener('focus', () => {
            messageInput.parentElement.classList.add('focused');
        });

        messageInput.addEventListener('blur', () => {
            messageInput.parentElement.classList.remove('focused');
        });
    }

    setUsername() {
        const usernameInput = document.getElementById('username-input');
        const username = usernameInput.value.trim();

        if (!username) {
            this.showToast('Please enter your name', 'error');
            usernameInput.focus();
            return;
        }

        if (username.length < 2) {
            this.showToast('Name must be at least 2 characters', 'error');
            return;
        }

        this.username = username;
        localStorage.setItem('emergency_username', username);

        // Show chat interface with animation
        document.getElementById('username-section').classList.add('hidden');
        document.getElementById('chat-interface').classList.remove('hidden');
        document.getElementById('current-user').textContent = username;

        this.showToast(`Welcome ${username}! You're now connected to the emergency network.`, 'success');
        
        // Focus on message input
        setTimeout(() => {
            document.getElementById('message-input').focus();
        }, 300);
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

        // Clear input and maintain focus
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

        // Add confirmation for SOS
        const confirmed = confirm('🚨 ARE YOU SURE YOU WANT TO SEND AN SOS ALERT?\n\nThis will broadcast your exact location to all users in the network.');
        
        if (!confirmed) {
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
            
            // Visual feedback for SOS button
            const sosBtn = document.getElementById('sos-btn');
            sosBtn.classList.add('sent');
            setTimeout(() => sosBtn.classList.remove('sent'), 2000);
            
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
        
        const timestamp = new Date(data.timestamp * 1000);
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${this.escapeHtml(data.sender)}</span>
                </div>
                <div class="message-bubble">
                    <div class="message-text">${this.escapeHtml(data.message)}</div>
                    <div class="message-time">${timeString}</div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.updateMessageCount();
        this.scrollToBottom();
    }

    displaySOSAlert(data) {
        const messagesContainer = document.getElementById('messages');
        const sosElement = document.createElement('div');
        
        sosElement.className = 'message sos-alert';
        
        const timestamp = new Date(data.timestamp * 1000);
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const locationLink = `https://maps.google.com/?q=${data.latitude},${data.longitude}`;
        
        sosElement.innerHTML = `
            <div class="sos-icon-alert">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="sos-content">
                <div class="sos-header">
                    <span class="sos-title">🚨 EMERGENCY SOS</span>
                </div>
                <div class="sos-bubble">
                    <div class="sos-details">
                        <div class="sos-sender">
                            <i class="fas fa-user"></i>
                            From: ${this.escapeHtml(data.sender)}
                        </div>
                        <div class="sos-message">${this.escapeHtml(data.message)}</div>
                        <div class="sos-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <a href="${locationLink}" target="_blank" class="location-link">
                                View Exact Location (${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)})
                            </a>
                        </div>
                    </div>
                    <div class="sos-time">${timeString}</div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(sosElement);
        this.updateMessageCount();
        this.scrollToBottom();

        // Emergency sound and visual notification
        this.playSOSSound();
        this.triggerSOSVisualAlert();
    }

    triggerSOSVisualAlert() {
        document.body.classList.add('sos-flash');
        setTimeout(() => {
            document.body.classList.remove('sos-flash');
        }, 2000);
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
            
            // Play second beep
            setTimeout(() => {
                const oscillator2 = context.createOscillator();
                const gainNode2 = context.createGain();
                
                oscillator2.connect(gainNode2);
                gainNode2.connect(context.destination);
                
                oscillator2.frequency.setValueAtTime(800, context.currentTime);
                oscillator2.frequency.setValueAtTime(600, context.currentTime + 0.1);
                oscillator2.type = 'sine';
                
                gainNode2.gain.setValueAtTime(0.3, context.currentTime);
                gainNode2.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
                
                oscillator2.start(context.currentTime);
                oscillator2.stop(context.currentTime + 0.3);
            }, 400);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    startLocationTracking() {
        const locationStatus = document.getElementById('location-status');
        const locationAccuracy = document.getElementById('location-accuracy');
        
        if (!navigator.geolocation) {
            locationStatus.innerHTML = '<i class="fas fa-map-marker-alt"></i><span>Geolocation not supported</span>';
            locationStatus.style.color = '#ef4444';
            return;
        }

        locationStatus.innerHTML = '<i class="fas fa-map-marker-alt"></i><span>Acquiring location...</span>';

        // Get initial position
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.updateLocation(position);
                locationStatus.innerHTML = '<i class="fas fa-map-marker-alt"></i><span>Location acquired</span>';
                locationStatus.style.color = '#10b981';
                
                const accuracy = position.coords.accuracy;
                locationAccuracy.textContent = `Accuracy: ${Math.round(accuracy)} meters`;
                locationAccuracy.style.color = accuracy < 50 ? '#10b981' : accuracy < 100 ? '#f59e0b' : '#ef4444';
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Location access denied';
                if (error.code === error.TIMEOUT) {
                    errorMessage = 'Location timeout';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage = 'Location unavailable';
                }
                
                locationStatus.innerHTML = `<i class="fas fa-map-marker-alt"></i><span>${errorMessage}</span>`;
                locationStatus.style.color = '#ef4444';
                locationAccuracy.textContent = 'Enable location for SOS alerts';
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
                locationStatus.innerHTML = '<i class="fas fa-map-marker-alt"></i><span>Location tracking failed</span>';
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
        toast.className = 'toast show';
        
        // Add type-based styling
        const typeClass = `toast-${type}`;
        toast.className = `toast show ${typeClass}`;
        
        // Auto-hide after appropriate time
        const hideTime = type === 'sos' ? 5000 : 3000;
        setTimeout(() => {
            toast.classList.remove('show');
        }, hideTime);
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
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
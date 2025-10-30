class AdminEmergencyMonitor {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.activeSOSAlerts = new Map();
        this.messageCount = 0;
        this.autoScrollEnabled = true;
        this.lastMessageDate = null;
        this.unreadMessages = 0;
        this.scrollPosition = 0;
        
        this.initializeApp();
    }

    initializeApp() {
        this.initializeSocket();
        this.setupEventListeners();
        this.loadInitialData();
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
            this.handleNewMessage();
        });

        this.socket.on('new_sos', (data) => {
            console.log('New SOS received:', data);
            this.handleSOSAlert(data);
            this.displayMessage({
                ...data,
                type: 'sos',
                sender: data.sender,
                message: data.message,
                timestamp: data.timestamp
            });
            this.handleNewMessage();
        });

        // Handle user count updates
        this.socket.on('user_joined', (data) => {
            this.updateOnlineCount(data.count);
        });

        this.socket.on('user_left', (data) => {
            this.updateOnlineCount(data.count);
        });
    }

    setupEventListeners() {
        const messageInput = document.getElementById('admin-message-input');

        // Enter key support
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendAdminMessage();
            }
        });

        // Input focus effects
        messageInput.addEventListener('focus', () => {
            messageInput.parentElement.classList.add('focused');
        });

        messageInput.addEventListener('blur', () => {
            messageInput.parentElement.classList.remove('focused');
        });

        // Auto-scroll toggle
        document.querySelector('.chat-control-btn .fa-arrows-alt-v').closest('.chat-control-btn').addEventListener('click', () => {
            this.toggleAutoScroll();
        });

        // Scroll to bottom button
        document.querySelector('.chat-control-btn .fa-arrow-down').closest('.chat-control-btn').addEventListener('click', () => {
            this.scrollToBottom(true);
        });
    }

    setupScrollBehavior() {
        const messagesContainer = document.querySelector('.admin-messages');
        const scrollIndicator = document.getElementById('scroll-indicator');
        
        messagesContainer.addEventListener('scroll', () => {
            this.handleScroll();
        });

        // Scroll to bottom when indicator is clicked
        scrollIndicator.addEventListener('click', () => {
            this.scrollToBottom(true);
            this.hideScrollIndicator();
        });
    }

    handleScroll() {
        const messagesContainer = document.querySelector('.admin-messages');
        const scrollIndicator = document.getElementById('scroll-indicator');
        
        this.scrollPosition = messagesContainer.scrollTop;
        const scrollHeight = messagesContainer.scrollHeight;
        const clientHeight = messagesContainer.clientHeight;
        const scrollBottom = scrollHeight - clientHeight - this.scrollPosition;
        
        // If user is within 100px of bottom, enable auto-scroll
        if (scrollBottom <= 100) {
            this.autoScrollEnabled = true;
            this.hideScrollIndicator();
        } else {
            this.autoScrollEnabled = false;
        }
        
        // Show/hide scroll indicator based on scroll position
        if (this.autoScrollEnabled || this.unreadMessages === 0) {
            this.hideScrollIndicator();
        } else {
            this.showScrollIndicator();
        }
    }

    handleNewMessage() {
        if (this.autoScrollEnabled) {
            this.scrollToBottom();
        } else {
            this.unreadMessages++;
            this.updateScrollIndicator();
            this.showScrollIndicator();
        }
    }

    scrollToBottom(force = false) {
        const messagesContainer = document.querySelector('.admin-messages');
        
        if (force) {
            this.autoScrollEnabled = true;
        }
        
        if (this.autoScrollEnabled) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            this.unreadMessages = 0;
            this.updateScrollIndicator();
            this.hideScrollIndicator();
        }
    }

    showScrollIndicator() {
        const scrollIndicator = document.getElementById('scroll-indicator');
        scrollIndicator.classList.add('visible');
    }

    hideScrollIndicator() {
        const scrollIndicator = document.getElementById('scroll-indicator');
        scrollIndicator.classList.remove('visible');
    }

    updateScrollIndicator() {
        const indicatorCount = document.getElementById('indicator-count');
        indicatorCount.textContent = this.unreadMessages;
    }

    toggleAutoScroll() {
        this.autoScrollEnabled = !this.autoScrollEnabled;
        const autoScrollIcon = document.getElementById('auto-scroll-icon');
        const autoScrollStatus = document.getElementById('auto-scroll-status');
        const autoScrollStatusIcon = document.getElementById('auto-scroll-status-icon');
        const chatControlBtn = document.querySelector('.chat-control-btn .fa-arrows-alt-v').closest('.chat-control-btn');
        
        if (this.autoScrollEnabled) {
            autoScrollIcon.className = 'fas fa-arrows-alt-v';
            autoScrollStatus.textContent = 'Auto-scroll: ON';
            autoScrollStatusIcon.style.color = 'var(--success-green)';
            chatControlBtn.classList.add('active');
            this.scrollToBottom();
            this.showToast('Auto-scroll enabled', 'success');
        } else {
            autoScrollIcon.className = 'fas fa-arrows-alt-v';
            autoScrollStatus.textContent = 'Auto-scroll: OFF';
            autoScrollStatusIcon.style.color = 'var(--light-gray)';
            chatControlBtn.classList.remove('active');
            this.showToast('Auto-scroll disabled', 'warning');
        }
    }

    async loadInitialData() {
        try {
            // Load initial messages
            const response = await fetch('/api/emergency/messages');
            const messages = await response.json();
            
            // Display messages in reverse order (oldest first)
            messages.reverse().forEach(message => {
                this.displayMessage(message);
            });
            
            // Load SOS alerts
            this.loadSOSAlerts();
            
            // Scroll to bottom after loading
            setTimeout(() => {
                this.scrollToBottom(true);
            }, 100);
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Error loading messages', 'error');
        }
    }

    async loadSOSAlerts() {
        try {
            const response = await fetch('/api/emergency/sos');
            const sosAlerts = await response.json();
            
            sosAlerts.forEach(alert => {
                this.addSOSAlert(alert);
            });
            
            this.updateAlertCount();
            
        } catch (error) {
            console.error('Error loading SOS alerts:', error);
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

    updateAlertCount() {
        const count = this.activeSOSAlerts.size;
        document.getElementById('active-alerts-count').textContent = count;
        
        // Update badge color based on alert count
        const badge = document.querySelector('.alert-count');
        if (count > 0) {
            badge.style.background = 'var(--primary-red)';
        } else {
            badge.style.background = 'var(--success-green)';
        }
    }

    updateMessageCount() {
        this.messageCount++;
        document.getElementById('total-messages').textContent = this.messageCount;
    }

    handleSOSAlert(data) {
        const alertId = `sos-${data.sender}-${data.timestamp}`;
        
        // Add to active alerts
        this.activeSOSAlerts.set(alertId, {
            ...data,
            id: alertId,
            acknowledged: false
        });
        
        // Update UI
        this.addSOSAlert(data);
        this.updateAlertCount();
        
        // Show modal and play sound
        this.showSOSModal(data);
        this.playEmergencySound();
        
        // Show toast notification
        this.showToast(`🚨 SOS Alert from ${data.sender}`, 'sos');
    }

    addSOSAlert(alertData) {
        const container = document.getElementById('sos-alerts-container');
        const noAlerts = container.querySelector('.no-alerts');
        
        // Hide "no alerts" message if it's the first alert
        if (noAlerts && this.activeSOSAlerts.size === 1) {
            noAlerts.style.display = 'none';
        }
        
        const alertId = `sos-${alertData.sender}-${alertData.timestamp}`;
        
        // Check if alert already exists
        if (document.getElementById(alertId)) {
            return;
        }
        
        const alertElement = document.createElement('div');
        alertElement.className = 'sos-alert-card';
        alertElement.id = alertId;
        
        const timestamp = new Date(alertData.timestamp * 1000);
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        alertElement.innerHTML = `
            <div class="sos-alert-header">
                <div class="sos-alert-title">
                    <i class="fas fa-exclamation-triangle"></i>
                    SOS ALERT
                </div>
                <div class="sos-alert-time">${timeString}</div>
            </div>
            <div class="sos-alert-sender">${this.escapeHtml(alertData.sender)}</div>
            <div class="sos-alert-message">${this.escapeHtml(alertData.message)}</div>
            <div class="sos-alert-location">
                <i class="fas fa-map-marker-alt"></i>
                Location: ${alertData.latitude?.toFixed(4)}, ${alertData.longitude?.toFixed(4)}
            </div>
        `;
        
        alertElement.addEventListener('click', () => {
            this.showSOSModal(alertData);
        });
        
        // Add to beginning of container
        container.insertBefore(alertElement, container.firstChild);
    }

    showSOSModal(alertData) {
        const modal = document.getElementById('sos-alert-modal');
        const sender = document.getElementById('modal-sender');
        const time = document.getElementById('modal-time');
        const message = document.getElementById('modal-message');
        const location = document.getElementById('modal-location');
        
        // Populate modal data
        sender.textContent = alertData.sender;
        
        const timestamp = new Date(alertData.timestamp * 1000);
        time.textContent = timestamp.toLocaleString();
        
        message.textContent = alertData.message;
        
        if (alertData.latitude && alertData.longitude) {
            location.textContent = `${alertData.latitude.toFixed(6)}, ${alertData.longitude.toFixed(6)}`;
        } else {
            location.textContent = 'Location not available';
        }
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    closeSOSModal() {
        const modal = document.getElementById('sos-alert-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
        }
    }

    shouldShowDate(timestamp) {
        const currentDate = this.formatDate(timestamp);
        if (this.lastMessageDate !== currentDate) {
            this.lastMessageDate = currentDate;
            return true;
        }
        return false;
    }

    displayMessage(data) {
        const messagesContainer = document.getElementById('admin-messages');
        
        // Check if we need to show date separator
        if (this.shouldShowDate(data.timestamp)) {
            const dateElement = document.createElement('div');
            dateElement.className = 'date-separator';
            dateElement.innerHTML = `
                <span>${this.lastMessageDate}</span>
            `;
            messagesContainer.appendChild(dateElement);
        }
        
        const messageElement = document.createElement('div');
        
        const isOwnMessage = data.sender === 'Admin';
        const isSOSMessage = data.type === 'sos';
        
        let messageClass = 'message';
        if (isOwnMessage) {
            messageClass += ' own';
        } else if (isSOSMessage) {
            messageClass += ' sos-alert';
        } else {
            messageClass += ' other';
        }
        
        messageElement.className = messageClass;
        
        const timeString = this.formatTime(data.timestamp);
        
        messageElement.innerHTML = `
            <div class="message-content">
                ${!isOwnMessage && !isSOSMessage ? `<div class="message-sender">${this.escapeHtml(data.sender)}</div>` : ''}
                <div class="message-bubble">
                    <div class="message-text">${this.escapeHtml(data.message)}</div>
                    <div class="message-time">${timeString}</div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        this.updateMessageCount();
    }

    sendAdminMessage() {
        const messageInput = document.getElementById('admin-message-input');
        const message = messageInput.value.trim();

        if (!message) {
            this.showToast('Please enter a message', 'warning');
            return;
        }

        if (!this.isConnected) {
            this.showToast('Not connected to network', 'error');
            return;
        }

        console.log('Sending admin message:', message);
        
        // Emit the message to server
        this.socket.emit('send_message', {
            sender: 'Admin',
            message: message
        });

        // Clear input and maintain focus
        messageInput.value = '';
        messageInput.focus();
        
        this.showToast('Message broadcast to all users', 'success');
    }

    sendEmergencyAlert() {
        const message = "🚨 EMERGENCY ALERT: Please follow safety protocols and stay alert. Emergency services are monitoring the situation.";
        
        if (!this.isConnected) {
            this.showToast('Not connected to network', 'error');
            return;
        }

        this.socket.emit('send_message', {
            sender: 'Admin',
            message: message
        });
        
        this.showToast('Emergency alert sent to all users', 'success');
    }

    sendSafetyUpdate() {
        const message = "📢 SAFETY UPDATE: Please ensure you are in a safe location. Follow official instructions and avoid affected areas.";
        
        if (!this.isConnected) {
            this.showToast('Not connected to network', 'error');
            return;
        }

        this.socket.emit('send_message', {
            sender: 'Admin',
            message: message
        });
        
        this.showToast('Safety update sent to all users', 'success');
    }

    sendAllClear() {
        const message = "✅ ALL CLEAR: The emergency situation has been resolved. Please resume normal activities with caution.";
        
        if (!this.isConnected) {
            this.showToast('Not connected to network', 'error');
            return;
        }

        this.socket.emit('send_message', {
            sender: 'Admin',
            message: message
        });
        
        this.showToast('All clear signal sent to all users', 'success');
    }

    clearAllChats() {
        if (confirm('Are you sure you want to clear all chat messages? This action cannot be undone.')) {
            const messagesContainer = document.getElementById('admin-messages');
            const systemMessage = messagesContainer.querySelector('.system-message');
            
            // Clear all messages except the system welcome message
            messagesContainer.innerHTML = '';
            if (systemMessage) {
                messagesContainer.appendChild(systemMessage);
            }
            
            this.messageCount = 0;
            this.updateMessageCount();
            this.lastMessageDate = null;
            this.showToast('All chat messages cleared', 'info');
        }
    }

    markAllAsRead() {
        this.activeSOSAlerts.clear();
        const container = document.getElementById('sos-alerts-container');
        container.innerHTML = `
            <div class="no-alerts">
                <i class="fas fa-check-circle"></i>
                <p>No active SOS alerts</p>
                <small>All clear! No emergency alerts at the moment.</small>
            </div>
        `;
        this.updateAlertCount();
        this.showToast('All SOS alerts marked as read', 'success');
    }

    clearSOSAlerts() {
        if (confirm('Are you sure you want to clear all SOS alerts?')) {
            this.activeSOSAlerts.clear();
            const container = document.getElementById('sos-alerts-container');
            container.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-check-circle"></i>
                    <p>No active SOS alerts</p>
                    <small>All clear! No emergency alerts at the moment.</small>
                </div>
            `;
            this.updateAlertCount();
            this.showToast('All SOS alerts cleared', 'info');
        }
    }

    testSOSAlert() {
        const testAlert = {
            sender: 'Test User',
            message: 'This is a test SOS alert for system verification',
            latitude: 28.6129,
            longitude: 77.2295,
            timestamp: Date.now() / 1000
        };
        
        this.handleSOSAlert(testAlert);
        this.showToast('Test SOS alert generated', 'info');
    }

    insertQuickMessage(message) {
        const messageInput = document.getElementById('admin-message-input');
        messageInput.value = message;
        messageInput.focus();
        this.showToast('Quick message inserted', 'info');
    }

    playEmergencySound() {
        // Create emergency siren sound
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create multiple oscillators for siren effect
            const oscillator1 = context.createOscillator();
            const oscillator2 = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(context.destination);
            
            // Siren effect: alternating frequencies
            oscillator1.frequency.setValueAtTime(800, context.currentTime);
            oscillator1.frequency.setValueAtTime(1200, context.currentTime + 0.5);
            oscillator1.frequency.setValueAtTime(800, context.currentTime + 1.0);
            
            oscillator2.frequency.setValueAtTime(1000, context.currentTime);
            oscillator2.frequency.setValueAtTime(600, context.currentTime + 0.5);
            oscillator2.frequency.setValueAtTime(1000, context.currentTime + 1.0);
            
            oscillator1.type = 'sine';
            oscillator2.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.5);
            
            oscillator1.start(context.currentTime);
            oscillator2.start(context.currentTime);
            oscillator1.stop(context.currentTime + 1.5);
            oscillator2.stop(context.currentTime + 1.5);
            
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    viewOnMap() {
        const modal = document.getElementById('sos-alert-modal');
        const locationText = document.getElementById('modal-location').textContent;
        
        if (locationText.includes(',')) {
            const [lat, lng] = locationText.split(',').map(coord => coord.trim());
            const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
            window.open(mapsUrl, '_blank');
        } else {
            this.showToast('Location data not available', 'warning');
        }
        
        this.closeSOSModal();
    }

    acknowledgeAlert() {
        this.showToast('SOS alert acknowledged', 'success');
        this.closeSOSModal();
    }

    contactUser() {
        this.showToast('Contact feature would open communication channel', 'info');
        this.closeSOSModal();
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
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Global functions for HTML onclick handlers
function sendAdminMessage() {
    window.adminMonitor.sendAdminMessage();
}

function sendEmergencyAlert() {
    window.adminMonitor.sendEmergencyAlert();
}

function sendSafetyUpdate() {
    window.adminMonitor.sendSafetyUpdate();
}

function sendAllClear() {
    window.adminMonitor.sendAllClear();
}

function clearAllChats() {
    window.adminMonitor.clearAllChats();
}

function markAllAsRead() {
    window.adminMonitor.markAllAsRead();
}

function clearSOSAlerts() {
    window.adminMonitor.clearSOSAlerts();
}

function testSOSAlert() {
    window.adminMonitor.testSOSAlert();
}

function insertQuickMessage(message) {
    window.adminMonitor.insertQuickMessage(message);
}

function toggleAutoScroll() {
    window.adminMonitor.toggleAutoScroll();
}

function scrollToBottom() {
    window.adminMonitor.scrollToBottom(true);
}

function closeSOSModal() {
    window.adminMonitor.closeSOSModal();
}

function viewOnMap() {
    window.adminMonitor.viewOnMap();
}

function acknowledgeAlert() {
    window.adminMonitor.acknowledgeAlert();
}

function contactUser() {
    window.adminMonitor.contactUser();
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendAdminMessage();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminMonitor = new AdminEmergencyMonitor();
});
class AdminProfile {
    constructor() {
        this.isEditing = false;
        this.originalData = null;
        this.newAvatarUrl = null;
        this.db = firebase.firestore();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProfileData();
        this.loadStats();
    }

    bindEvents() {
        // Edit/Save/Cancel buttons
        document.getElementById('editBtn').addEventListener('click', () => this.enterEditMode());
        document.getElementById('cancelBtn').addEventListener('click', () => this.exitEditMode());
        document.getElementById('profileForm').addEventListener('submit', (e) => this.saveProfile(e));
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());

        // Avatar upload
        document.getElementById('avatarInput').addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Drag and drop for avatar
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const avatarContainer = document.querySelector('.avatar-container');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            avatarContainer.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            avatarContainer.addEventListener(eventName, () => this.highlightArea(), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            avatarContainer.addEventListener(eventName, () => this.unhighlightArea(), false);
        });

        avatarContainer.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlightArea() {
        document.querySelector('.avatar-container').style.border = '3px dashed #4361ee';
    }

    unhighlightArea() {
        document.querySelector('.avatar-container').style.border = '4px solid transparent';
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0 && this.isEditing) {
            this.handleImageUpload({ target: { files } });
        }
    }

    async loadProfileData() {
        try {
            // Get UID from session (in real app, this would come from your Flask session)
            // For demo, we'll use a sample UID - in production, get this from your backend
            const uid = await this.getCurrentUserUid();
            
            const userDoc = await this.db.collection('users').doc(uid).get();
            
            if (!userDoc.exists) {
                throw new Error('User profile not found');
            }

            const userData = userDoc.data();
            this.originalData = userData;
            this.populateProfile(userData);
            
            // Hide skeleton, show content
            document.getElementById('loadingSkeleton').style.display = 'none';
            document.getElementById('profileContent').style.display = 'block';
        } catch (error) {
            this.showToast('Error loading profile data: ' + error.message, 'error');
            console.error('Error:', error);
        }
    }

    async getCurrentUserUid() {
        // In a real app, you would get this from your Flask session
        // For demo purposes, we'll try to get it from a meta tag or use a default
        try {
            const response = await fetch('/admin/profile/data');
            const data = await response.json();
            return data.uid;
        } catch (error) {
            // Fallback for demo - in production, ensure session is available
            console.warn('Could not fetch UID from backend, using demo UID');
            return "T6f1BAFN8maX1XLD7MhGXepiFVB3"; // Demo UID
        }
    }

    populateProfile(userData) {
        document.getElementById('avatarImg').src = userData.profileurl || '/static/default-avatar.png';
        document.getElementById('userName').textContent = userData.name;
        document.getElementById('name').value = userData.name;
        document.getElementById('email').value = userData.email;
        document.getElementById('mobile').value = userData.mobilenumber;
        document.getElementById('address').value = userData.address || '';
        document.getElementById('note').value = userData.note || '';
        
        // Format joined date
        let joinedDate;
        if (userData.created_at && userData.created_at.seconds) {
            joinedDate = new Date(userData.created_at.seconds * 1000);
        } else if (userData.joined_date) {
            joinedDate = new Date(userData.joined_date);
        } else {
            joinedDate = new Date();
        }
        
        document.getElementById('joinedDate').textContent = joinedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    async loadStats() {
        // Simulate loading stats - in real app, fetch from your backend
        setTimeout(() => {
            document.getElementById('totalUsers').textContent = '1,247';
            document.getElementById('activeUsers').textContent = '89';
            document.getElementById('pendingTasks').textContent = '12';
        }, 1500);
    }

    enterEditMode() {
        this.isEditing = true;
        document.getElementById('editBtn').style.display = 'none';
        document.getElementById('saveCancelGroup').style.display = 'flex';
        
        // Make fields editable
        document.getElementById('name').readOnly = false;
        document.getElementById('address').readOnly = false;
        document.getElementById('note').readOnly = false;
        
        // Enable avatar upload
        document.querySelector('.avatar-container').classList.add('editing');
        document.getElementById('profileContent').classList.add('editing');
        
        this.showToast('You can now edit your profile information', 'success');
    }

    exitEditMode() {
        this.isEditing = false;
        document.getElementById('editBtn').style.display = 'block';
        document.getElementById('saveCancelGroup').style.display = 'none';
        
        // Reset fields to original values
        this.populateProfile(this.originalData);
        
        // Make fields readonly
        document.getElementById('name').readOnly = true;
        document.getElementById('address').readOnly = true;
        document.getElementById('note').readOnly = true;
        
        // Disable avatar upload
        document.querySelector('.avatar-container').classList.remove('editing');
        document.getElementById('profileContent').classList.remove('editing');
        this.newAvatarUrl = null;
        
        this.showToast('Edit mode cancelled', 'warning');
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select a valid image file (JPEG, PNG, etc.)', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showToast('Image size must be less than 5MB', 'error');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('avatarImg').src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Upload to server
        await this.uploadImage(file);
    }

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Show upload progress
            const progressElement = document.getElementById('uploadProgress');
            progressElement.style.display = 'block';
            const progressFill = progressElement.querySelector('.progress-fill');
            
            // Simulate progress (in real app, use actual upload progress)
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 5;
                progressFill.style.width = `${progress}%`;
                if (progress >= 90) clearInterval(progressInterval);
            }, 100);

            const response = await fetch('/admin/profile/upload-image', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });

            clearInterval(progressInterval);
            progressFill.style.width = '100%';

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            this.newAvatarUrl = result.url;
            
            // Hide progress
            setTimeout(() => {
                progressElement.style.display = 'none';
                progressFill.style.width = '0%';
            }, 1000);
            
            this.showToast('Profile image updated successfully', 'success');
        } catch (error) {
            // Hide progress and restore original image
            document.getElementById('uploadProgress').style.display = 'none';
            document.getElementById('avatarImg').src = this.originalData.profileurl;
            this.showToast('Failed to upload image: ' + error.message, 'error');
            console.error('Upload error:', error);
        }
    }

    async saveProfile(event) {
        event.preventDefault();
        
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<div class="spinner"></div> Saving...';
        saveBtn.disabled = true;

        try {
            const updateData = {
                name: document.getElementById('name').value,
                address: document.getElementById('address').value,
                note: document.getElementById('note').value,
                updated_at: new Date()
            };

            // Include new avatar URL if uploaded
            if (this.newAvatarUrl) {
                updateData.profileurl = this.newAvatarUrl;
            }

            // Get UID from session
            const uid = await this.getCurrentUserUid();

            // Update Firestore
            await this.db.collection('users').doc(uid).update(updateData);
            
            // Update local data
            this.originalData = { ...this.originalData, ...updateData };
            
            this.exitEditMode();
            this.showToast('Profile updated successfully!', 'success');
            
        } catch (error) {
            this.showToast('Failed to update profile: ' + error.message, 'error');
            console.error('Update error:', error);
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    showToast(message, type) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        // Add icon based on type
        let icon = 'fas fa-info-circle';
        if (type === 'success') icon = 'fas fa-check-circle';
        if (type === 'error') icon = 'fas fa-exclamation-circle';
        if (type === 'warning') icon = 'fas fa-exclamation-triangle';
        
        toast.innerHTML = `<i class="${icon}"></i> ${message}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    goBack() {
        // In a real app, this would navigate to the admin dashboard
        window.history.back();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminProfile();
});

// Add some demo stats animation
setTimeout(() => {
    const stats = document.querySelectorAll('.stat-value');
    stats.forEach(stat => {
        const finalValue = parseInt(stat.textContent.replace(/,/g, ''));
        let currentValue = 0;
        const increment = finalValue / 50;
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= finalValue) {
                currentValue = finalValue;
                clearInterval(timer);
            }
            stat.textContent = Math.floor(currentValue).toLocaleString();
        }, 30);
    });
}, 2000);
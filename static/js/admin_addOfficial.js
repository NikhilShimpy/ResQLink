// Admin Panel JavaScript

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAkIp1wIdz7LTa5rZ2YJfoKcxTtUEflyhI",
  authDomain: "samudra-suraksha-477cf.firebaseapp.com",
  projectId: "samudra-suraksha-477cf",
  storageBucket: "samudra-suraksha-477cf.firebasestorage.app",
  messagingSenderId: "538135967467",
  appId: "1:538135967467:web:938ca314bf21e10acd70ae"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Global variables
let users = [];
let currentEditUserId = null;
let currentDeleteUserId = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is admin and show admin panel if they are
  checkAdminStatus();
  
  // Initialize event listeners
  initAdminEventListeners();
});

// Check if current user is an admin
function checkAdminStatus() {
  auth.onAuthStateChanged(user => {
    if (user) {
      // Check if user is admin
      db.collection('users').doc(user.uid).get()
        .then(doc => {
          if (doc.exists && doc.data().role === 'admin') {
            // User is admin, show the admin interface
            console.log("User is admin, loading admin panel");
            loadUsers();
          } else {
            // User is not admin, redirect or show error
            console.log("User is not admin, redirecting to login");
            window.location.href = '/login';
          }
        })
        .catch(error => {
          console.error('Error checking admin status:', error);
          window.location.href = '/login';
        });
    } else {
      console.log("No user logged in, redirecting to login");
      window.location.href = '/login';
    }
  });
}

// Initialize all event listeners for admin panel
function initAdminEventListeners() {
  // Add official form submission
  const addOfficialForm = document.getElementById('addOfficialForm');
  if (addOfficialForm) {
    addOfficialForm.addEventListener('submit', handleAddOfficial);
  }
  
  // Search functionality
  const userSearch = document.getElementById('userSearch');
  if (userSearch) {
    userSearch.addEventListener('keyup', filterUsers);
  }
  
  const roleFilter = document.getElementById('roleFilter');
  if (roleFilter) {
    roleFilter.addEventListener('change', filterUsers);
  }
  
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', filterUsers);
  }
  
  // Clear filters button
  const clearFilters = document.getElementById('clearFilters');
  if (clearFilters) {
    clearFilters.addEventListener('click', clearFiltersHandler);
  }
  
  // Refresh button
  const refreshUsers = document.getElementById('refreshUsers');
  if (refreshUsers) {
    refreshUsers.addEventListener('click', loadUsers);
  }
  
  // Edit user modal events
  const saveUserChanges = document.getElementById('saveUserChanges');
  if (saveUserChanges) {
    saveUserChanges.addEventListener('click', updateUser);
  }
  
  // Delete confirmation modal events
  const confirmDelete = document.getElementById('confirmDelete');
  if (confirmDelete) {
    confirmDelete.addEventListener('click', deleteUser);
  }
}

// Show alert message
function showAlert(message, type = 'success') {
  const alertDiv = document.getElementById('adminAlert');
  if (!alertDiv) {
    console.error("Alert div not found");
    return;
  }
  
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    const bsAlert = new bootstrap.Alert(alertDiv);
    bsAlert.close();
  }, 5000);
}

// Handle adding a new official
async function handleAddOfficial(e) {
  e.preventDefault();
  
  const name = document.getElementById('officialName')?.value;
  const email = document.getElementById('officialEmail')?.value;
  const mobile = document.getElementById('officialMobile')?.value;
  const role = document.getElementById('officialRole')?.value;
  const position = document.getElementById('officialPosition')?.value;
  const address = document.getElementById('officialAddress')?.value;
  const status = document.getElementById('officialStatus')?.checked ? 'active' : 'inactive';
  
  // Validate form
  if (!name || !email || !mobile || !role || !position || !address) {
    showAlert('Please fill all fields', 'danger');
    return;
  }
  
  try {
    // Create user in Firebase Auth
    const password = generatePassword(); // Generate a random password
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Send verification email
    await user.sendEmailVerification();
    
    // Save user details to Firestore
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      name: name,
      email: email,
      mobilenumber: mobile,
      role: role,
      position: position,
      address: address,
      status: status,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: auth.currentUser.uid
    });
    
    // Show success message
    showAlert(`Official ${name} added successfully! Verification email sent.`);
    
    // Reset form
    document.getElementById('addOfficialForm').reset();
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addOfficialModal'));
    if (modal) {
      modal.hide();
    }
    
    // Reload users table
    loadUsers();
    
  } catch (error) {
    console.error('Error adding official:', error);
    showAlert(`Error: ${error.message}`, 'danger');
  }
}

// Generate a random password
function generatePassword() {
  const length = 10;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

// Load all users from Firestore
async function loadUsers() {
  const tableBody = document.getElementById('usersTableBody');
  const loadingDiv = document.getElementById('usersLoading');
  const noUsersDiv = document.getElementById('noUsers');
  
  if (!tableBody || !loadingDiv || !noUsersDiv) {
    console.error("Required DOM elements not found");
    return;
  }
  
  // Show loading, hide table and no users message
  tableBody.innerHTML = '';
  loadingDiv.classList.remove('d-none');
  noUsersDiv.classList.add('d-none');
  
  try {
    // Get all users (not just admins)
    const snapshot = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .get();
    
    users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    // Update stats
    updateStats(users);
    
    // Hide loading
    loadingDiv.classList.add('d-none');
    
    if (users.length === 0) {
      noUsersDiv.classList.remove('d-none');
      return;
    }
    
    // Render users
    renderUsers(users);
    
  } catch (error) {
    console.error('Error loading users:', error);
    if (loadingDiv) loadingDiv.classList.add('d-none');
    showAlert('Error loading users: ' + error.message, 'danger');
  }
}

// Update statistics cards
function updateStats(users) {
  const totalUsers = document.getElementById('totalUsers');
  const totalAdmins = document.getElementById('totalAdmins');
  const totalOfficials = document.getElementById('totalOfficials');
  const totalCitizens = document.getElementById('totalCitizens');
  
  if (totalUsers) totalUsers.textContent = users.length;
  if (totalAdmins) totalAdmins.textContent = users.filter(user => user.role === 'admin').length;
  if (totalOfficials) totalOfficials.textContent = users.filter(user => user.role === 'official').length;
  if (totalCitizens) totalCitizens.textContent = users.filter(user => user.role === 'citizen').length;
}

// Render users to the table
function renderUsers(usersToRender) {
  const tableBody = document.getElementById('usersTableBody');
  if (!tableBody) {
    console.error("Users table body not found");
    return;
  }
  
  tableBody.innerHTML = '';
  
  usersToRender.forEach(user => {
    const row = document.createElement('tr');
    
    // Format the date
    const joinDate = user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A';
    
    row.innerHTML = `
      <td>${user.name || 'N/A'}</td>
      <td>${user.email || 'N/A'}</td>
      <td>${user.mobilenumber || 'N/A'}</td>
      <td><span class="role-badge role-${user.role || 'citizen'}">${user.role || 'citizen'}</span></td>
      <td><span class="position-badge">${user.position || 'N/A'}</span></td>
      <td><span class="status-badge status-${user.status || 'active'}">${user.status || 'active'}</span></td>
      <td>${joinDate}</td>
      <td>
        <button class="btn btn-sm btn-action btn-edit" data-id="${user.id}" data-bs-toggle="modal" data-bs-target="#editUserModal">
          <i class="bi bi-pencil-square"></i>
        </button>
        <button class="btn btn-sm btn-action btn-delete" data-id="${user.id}" data-bs-toggle="modal" data-bs-target="#deleteConfirmModal">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add event listeners to action buttons
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
  });
}

// Open edit modal with user data
function openEditModal(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  currentEditUserId = userId;
  
  // Populate form fields
  document.getElementById('editUserId').value = userId;
  document.getElementById('editUserName').value = user.name || '';
  document.getElementById('editUserEmail').value = user.email || '';
  document.getElementById('editUserMobile').value = user.mobilenumber || '';
  document.getElementById('editUserRole').value = user.role || 'citizen';
  document.getElementById('editUserPosition').value = user.position || '';
  document.getElementById('editUserAddress').value = user.address || '';
  
  const statusCheckbox = document.getElementById('editUserStatus');
  if (statusCheckbox) {
    statusCheckbox.checked = user.status !== 'inactive';
  }
}

// Open delete confirmation modal
function openDeleteModal(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  currentDeleteUserId = userId;
  const deleteUserName = document.getElementById('deleteUserName');
  if (deleteUserName) {
    deleteUserName.textContent = user.name || 'This user';
  }
}

// Update user details
async function updateUser() {
  const userId = document.getElementById('editUserId')?.value;
  const name = document.getElementById('editUserName')?.value;
  const email = document.getElementById('editUserEmail')?.value;
  const mobile = document.getElementById('editUserMobile')?.value;
  const role = document.getElementById('editUserRole')?.value;
  const position = document.getElementById('editUserPosition')?.value;
  const address = document.getElementById('editUserAddress')?.value;
  const status = document.getElementById('editUserStatus')?.checked ? 'active' : 'inactive';
  
  if (!userId) {
    showAlert('User ID not found', 'danger');
    return;
  }
  
  try {
    // Update user in Firestore
    await db.collection('users').doc(userId).update({
      name: name,
      email: email,
      mobilenumber: mobile,
      role: role,
      position: position,
      address: address,
      status: status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
    if (modal) {
      modal.hide();
    }
    
    // Show success message
    showAlert('User updated successfully!');
    
    // Reload users
    loadUsers();
    
  } catch (error) {
    console.error('Error updating user:', error);
    showAlert(`Error: ${error.message}`, 'danger');
  }
}

// Delete user
async function deleteUser() {
  if (!currentDeleteUserId) return;
  
  try {
    // Get user data first to check if we need to delete from Auth
    const userDoc = await db.collection('users').doc(currentDeleteUserId).get();
    const userData = userDoc.data();
    
    // Delete user document from Firestore
    await db.collection('users').doc(currentDeleteUserId).delete();
    
    // Try to delete user from Auth (this might fail if not the same user or insufficient permissions)
    try {
      if (userData && userData.uid) {
        // Note: This requires the admin to have appropriate permissions in Firebase Auth
        await auth.currentUser.deleteUser(userData.uid);
      }
    } catch (authError) {
      console.warn('Could not delete user from Auth (might need admin privileges):', authError);
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
    if (modal) {
      modal.hide();
    }
    
    // Show success message
    showAlert('User deleted successfully!');
    
    // Reload users
    loadUsers();
    
  } catch (error) {
    console.error('Error deleting user:', error);
    showAlert(`Error: ${error.message}`, 'danger');
  }
}

// Filter users based on search, role filter, and status filter
function filterUsers() {
  const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
  const roleFilter = document.getElementById('roleFilter')?.value || '';
  const statusFilter = document.getElementById('statusFilter')?.value || '';
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name && user.name.toLowerCase().includes(searchTerm)) ||
      (user.email && user.email.toLowerCase().includes(searchTerm)) ||
      (user.mobilenumber && user.mobilenumber.includes(searchTerm)) ||
      (user.address && user.address.toLowerCase().includes(searchTerm)) ||
      (user.position && user.position.toLowerCase().includes(searchTerm));
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });
  
  renderUsers(filteredUsers);
}

// Clear all filters
function clearFiltersHandler() {
  const userSearch = document.getElementById('userSearch');
  const roleFilter = document.getElementById('roleFilter');
  const statusFilter = document.getElementById('statusFilter');
  
  if (userSearch) userSearch.value = '';
  if (roleFilter) roleFilter.value = '';
  if (statusFilter) statusFilter.value = '';
  
  // Render all users
  renderUsers(users);
}

// LOGOUT FUNCTION
function logout() {
  auth.signOut()
    .then(() => {
      console.log("User signed out.");
      window.location.href = "/login";
    })
    .catch((error) => {
      console.error("Logout error:", error.message);
      alert("Logout failed.");
    });
}
// ================= Firebase Imports =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ================= Firebase Config =================
const firebaseConfig = {
  apiKey: "AIzaSyAkIp1wIdz7LTa5rZ2YJfoKcxTtUEflyhI",
  authDomain: "samudra-suraksha-477cf.firebaseapp.com",
  projectId: "samudra-suraksha-477cf",
  storageBucket: "samudra-suraksha-477cf.firebasestorage.app",
  messagingSenderId: "538135967467",
  appId: "1:538135967467:web:938ca314bf21e10acd70ae"
};

// ================= Init =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentDocId = null; // store Firestore doc id
let currentUser = null;
let userReports = [];

// ================= Auth State Listener =================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadProfile(user.uid);
    await loadUserReports(user.uid);
  } else {
    alert("No user logged in!");
    window.location.href = "/login";
  }
});

// ================= Load User Profile =================
async function loadProfile(uid) {
  try {
    const q = query(collection(db, "users"), where("uid", "==", uid));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      const docSnap = querySnap.docs[0];
      currentDocId = docSnap.id; 
      const data = docSnap.data();

      // Update profile values
      document.getElementById("userName").textContent = data.name || "N/A";
      document.getElementById("userEmail").textContent = data.email || "N/A";
      document.getElementById("userMobile").textContent = data.mobilenumber || "N/A";
      document.getElementById("userAddress").textContent = data.address || "N/A";
      document.getElementById("userrole").textContent = data.role || "Citizen";
      document.getElementById("profileImg").src = data.profileurl || "https://via.placeholder.com/150";
      
      // Update header profile
      document.getElementById("headerProfileImg").src = data.profileurl || "https://via.placeholder.com/40";
      document.getElementById("headerUserName").textContent = data.name || "User";

      // Pre-fill modal fields
      document.getElementById("editName").value = data.name || "";
      document.getElementById("editMobile").value = data.mobilenumber || "";
      document.getElementById("editAddress").value = data.address || "";
      document.getElementById("editProfileUrl").value = data.profileurl || "";
    } else {
      alert("User profile not found in Firestore!");
    }
  } catch (err) {
    console.error("Error loading profile:", err);
  }
}

// ================= Load User Reports =================
async function loadUserReports(uid) {
  try {
    const reportsList = document.getElementById("reportsList");
    reportsList.innerHTML = `
      <div class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading your reports...</p>
      </div>
    `;
    
    // Create query to fetch reports for the current user
    const q = query(collection(db, "reports"), where("user_id", "==", uid));
    
    const querySnap = await getDocs(q);
    userReports = [];
    
    if (querySnap.empty) {
      reportsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <h3>No Reports Found</h3>
          <p>You haven't submitted any reports yet.</p>
        </div>
      `;
      return;
    }
    
    reportsList.innerHTML = '';
    
    querySnap.forEach((doc) => {
      const report = doc.data();
      report.id = doc.id;
      userReports.push(report);
      
      const reportItem = createReportElement(report);
      reportsList.appendChild(reportItem);
    });
    
  } catch (err) {
    console.error("Error loading reports:", err);
    document.getElementById("reportsList").innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error Loading Reports</h3>
        <p>There was a problem loading your reports. Please try again.</p>
      </div>
    `;
  }
}

// ================= Create Report Element =================
function createReportElement(report) {
  const reportItem = document.createElement('div');
  reportItem.className = 'report-item';
  reportItem.dataset.id = report.id;
  reportItem.dataset.type = report.disaster_type;
  
  // Format date
  const reportDate = report.timestamp ? new Date(report.timestamp).toLocaleDateString() : 'N/A';
  
  // Determine severity class
  let severityClass = 'severity-low';
  let severityText = 'Low';
  
  if (report.severity_score >= 7) {
    severityClass = 'severity-high';
    severityText = 'High';
  } else if (report.severity_score >= 4) {
    severityClass = 'severity-medium';
    severityText = 'Medium';
  }
  
  reportItem.innerHTML = `
    <div class="report-type-icon ${report.disaster_type}">
      <i class="fas ${getDisasterIcon(report.disaster_type)}"></i>
    </div>
    <div class="report-content">
      <h3>${report.disaster_type ? report.disaster_type.charAt(0).toUpperCase() + report.disaster_type.slice(1) : 'Unknown Disaster'}</h3>
      <p>${report.description || 'No description provided'}</p>
      <div class="report-meta">
        <span><i class="fas fa-map-marker-alt"></i> ${report.city || 'Unknown location'}</span>
        <span><i class="fas fa-calendar"></i> ${reportDate}</span>
        <div class="report-severity">
          <span>Severity:</span>
          <span class="severity-badge ${severityClass}">${severityText}</span>
        </div>
      </div>
    </div>
    <div class="report-actions">
      <button class="btn-icon view-report-btn" data-tooltip="View Details">
        <i class="fas fa-eye"></i>
      </button>
    </div>
  `;
  
  // Add event listener to view button
  const viewBtn = reportItem.querySelector('.view-report-btn');
  viewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showReportDetails(report);
  });
  
  // Add event listener to the whole report item
  reportItem.addEventListener('click', () => {
    showReportDetails(report);
  });
  
  return reportItem;
}

// ================= Get Disaster Icon =================
function getDisasterIcon(disasterType) {
  switch(disasterType) {
    case 'tsunami': return 'fa-water';
    case 'flood': return 'fa-house-flood-water';
    case 'earthquake': return 'fa-house-crack';
    case 'cyclone': return 'fa-wind';
    default: return 'fa-triangle-exclamation';
  }
}

// ================= Show Report Details =================
function showReportDetails(report) {
  const modal = document.getElementById('reportModal');
  const detailsContainer = document.getElementById('reportDetails');
  
  // Format date and time
  const reportDate = report.timestamp ? new Date(report.timestamp).toLocaleDateString() : 'N/A';
  const reportTime = report.timestamp ? new Date(report.timestamp).toLocaleTimeString() : 'N/A';
  
  // Determine severity class and text
  let severityClass = 'severity-low';
  let severityText = 'Low';
  
  if (report.severity_score >= 7) {
    severityClass = 'severity-high';
    severityText = 'High';
  } else if (report.severity_score >= 4) {
    severityClass = 'severity-medium';
    severityText = 'Medium';
  }
  
  detailsContainer.innerHTML = `
    <div class="report-detail-header">
      <div class="report-type-icon large ${report.disaster_type}">
        <i class="fas ${getDisasterIcon(report.disaster_type)}"></i>
      </div>
      <div>
        <h3>${report.disaster_type ? report.disaster_type.charAt(0).toUpperCase() + report.disaster_type.slice(1) : 'Unknown Disaster'}</h3>
        <p class="text-muted">Reported on ${reportDate} at ${reportTime}</p>
      </div>
      <div class="severity-badge ${severityClass}">${severityText} Severity</div>
    </div>
    
    <div class="report-detail-content">
      <div class="detail-section">
        <h4>Description</h4>
        <p>${report.description || 'No description provided'}</p>
      </div>
      
      <div class="detail-section">
        <h4>Location Details</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <i class="fas fa-city"></i>
            <div>
              <label>City</label>
              <span>${report.city || 'N/A'}</span>
            </div>
          </div>
          <div class="detail-item">
            <i class="fas fa-map"></i>
            <div>
              <label>District</label>
              <span>${report.district || 'N/A'}</span>
            </div>
          </div>
          <div class="detail-item">
            <i class="fas fa-landmark"></i>
            <div>
              <label>State</label>
              <span>${report.state || 'N/A'}</span>
            </div>
          </div>
          <div class="detail-item">
            <i class="fas fa-house"></i>
            <div>
              <label>Town/Village</label>
              <span>${report.town || report.village || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="detail-section">
        <h4>Coordinates</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <i class="fas fa-location-dot"></i>
            <div>
              <label>Latitude</label>
              <span>${report.latitude || 'N/A'}</span>
            </div>
          </div>
          <div class="detail-item">
            <i class="fas fa-location-dot"></i>
            <div>
              <label>Longitude</label>
              <span>${report.longitude || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
      
      ${report.media_urls && report.media_urls.length > 0 ? `
      <div class="detail-section">
        <h4>Media Attachments</h4>
        <div class="media-grid">
          ${report.media_urls.map(url => `
            <div class="media-item">
              <img src="${url}" alt="Report media" onerror="this.style.display='none'">
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;
  
  modal.classList.remove('hidden');
}

// ================= Edit Modal Logic =================
const editBtn = document.getElementById("editBtn");
const saveBtn = document.getElementById("saveBtn");
const closeBtn = document.getElementById("closeBtn");
const cancelBtn = document.getElementById("cancelBtn");
const modal = document.getElementById("editModal");
const refreshReportsBtn = document.getElementById("refreshReportsBtn");
const reportFilter = document.getElementById("reportFilter");
const reportSearch = document.getElementById("reportSearch");
const closeReportBtn = document.getElementById("closeReportBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (editBtn) {
  editBtn.addEventListener("click", () => modal.classList.remove("hidden"));
}

if (closeBtn) {
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
}

if (cancelBtn) {
  cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
}

if (closeReportBtn) {
  closeReportBtn.addEventListener("click", () => {
    document.getElementById('reportModal').classList.add('hidden');
  });
}

if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    if (!currentDocId) return alert("Profile not loaded yet!");

    const updatedData = {
      uid: auth.currentUser.uid,        
      email: auth.currentUser.email,    
      name: document.getElementById("editName").value.trim(),
      mobilenumber: document.getElementById("editMobile").value.trim(),
      address: document.getElementById("editAddress").value.trim(),
      profileurl: document.getElementById("editProfileUrl").value.trim(),
    };

    try {
      await setDoc(doc(db, "users", currentDocId), updatedData, { merge: false });
      alert("Profile updated successfully!");
      modal.classList.add("hidden");
      loadProfile(auth.currentUser.uid);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    }
  });
}

if (refreshReportsBtn) {
  refreshReportsBtn.addEventListener("click", () => {
    if (currentUser) {
      loadUserReports(currentUser.uid);
    }
  });
}

if (reportFilter) {
  reportFilter.addEventListener("change", filterReports);
}

if (reportSearch) {
  reportSearch.addEventListener("input", filterReports);
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (err) {
      console.error("Error signing out:", err);
    }
  });
}

// ================= Filter Reports =================
function filterReports() {
  const filterValue = reportFilter.value.toLowerCase();
  const searchValue = reportSearch.value.toLowerCase();
  
  const reportsList = document.getElementById("reportsList");
  reportsList.innerHTML = '';
  
  const filteredReports = userReports.filter(report => {
    const matchesFilter = filterValue === 'all' || report.disaster_type === filterValue;
    const matchesSearch = report.description.toLowerCase().includes(searchValue) || 
                          report.city.toLowerCase().includes(searchValue) ||
                          report.disaster_type.toLowerCase().includes(searchValue);
    
    return matchesFilter && matchesSearch;
  });
  
  if (filteredReports.length === 0) {
    reportsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <h3>No Reports Match Your Criteria</h3>
        <p>Try changing your search or filter parameters.</p>
      </div>
    `;
    return;
  }
  
  filteredReports.forEach(report => {
    const reportItem = createReportElement(report);
    reportsList.appendChild(reportItem);
  });
}

// Add CSS for report details
const additionalStyles = `
  .report-detail-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  .report-type-icon.large {
    width: 64px;
    height: 64px;
    font-size: 1.5rem;
  }
  
  .report-detail-header h3 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .text-muted {
    color: var(--text-secondary);
  }
  
  .detail-section {
    margin-bottom: 2rem;
  }
  
  .detail-section h4 {
    margin-bottom: 1rem;
    font-size: 1.2rem;
    color: var(--text-primary);
  }
  
  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .media-item img {
    width: 100%;
    height: 120px;
    object-fit: cover;
    border-radius: 0.25rem;
  }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
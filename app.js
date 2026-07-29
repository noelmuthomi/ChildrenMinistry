// app.js – Beautiful, Responsive Frontend for PCEA Ministry
// CHANGE THIS LINE TO YOUR DEPLOYED APPS SCRIPT URL
const API_BASE = 'https://script.google.com/macros/s/AKfycbyFBi5X18gxETVCU_9p6i8Vksa1lstqq_3T_iG0SjOBaDwXmvBuFcqK4Rcq_6XHEeJe/exec';

let currentUser = null;
let learners = [];

// ---- Helper ----
function apiCall(method, params) {
  const url = `${API_BASE}?method=${method}&data=${encodeURIComponent(JSON.stringify(params))}`;
  return fetch(url).then(r => r.json());
}

// ---- Show page & update nav ----
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const page = document.getElementById(pageId);
  if (page) page.classList.remove('hidden');
  // Update active nav link
  document.querySelectorAll('.nav-scroll a').forEach(a => a.classList.remove('active'));
  const navLink = document.querySelector(`.nav-scroll a[data-page="${pageId}"]`);
  if (navLink) navLink.classList.add('active');
  // Scroll to top on mobile
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateTo(page) {
  if (!currentUser && page !== 'login') { showPage('login'); return; }
  showPage(page);
  if (page === 'dashboard') loadDashboard();
  if (page === 'attendance') loadAttendanceLearners();
  if (page === 'admin') loadUsers();
  if (page === 'config') loadConfig();
}

// ---- Show message helper ----
function showMessage(elementId, text, isError = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
  el.className = `message ${isError ? 'error' : 'success'}`;
}
// We'll style messages inline – they will use card styles.

// ---- Login ----
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const result = await apiCall('login', { email, password });
  if (result.success) {
    currentUser = result;
    document.getElementById('userNameDisplay').textContent = result.name || 'User';
    showPage('dashboard');
    loadDashboard();
  } else {
    showMessage('loginMessage', result.error || 'Invalid credentials', true);
  }
}

// ---- Dashboard ----
async function loadDashboard() {
  try {
    const ann = await apiCall('getAnnouncements', {});
    const container = document.getElementById('announcementsList');
    if (ann.length === 0) {
      container.innerHTML = '<p style="color: var(--text-light);">No announcements yet.</p>';
    } else {
      container.innerHTML = ann.map(a => `
        <div class="announcement-item ${a.priority === 'High' ? 'priority-high' : ''}">
          <div class="title">${a.title}</div>
          <div>${a.content}</div>
          <div class="meta">📍 ${a.congregation || 'All'} · ${a.department || 'All'} · ${a.priority || 'Normal'}</div>
        </div>
      `).join('');
    }
    const brigade = await apiCall('getLearners', { department: 'brigade' });
    const cs = await apiCall('getLearners', { department: 'church-school' });
    document.getElementById('brigadeCount').textContent = brigade.length;
    document.getElementById('csCount').textContent = cs.length;
  } catch (e) {
    console.error(e);
  }
}

// ---- Enrol Brigade ----
async function enrolBrigade(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('bName').value,
    phone: document.getElementById('bPhone').value,
    email: document.getElementById('bEmail').value,
    congregation: document.getElementById('bCongregation').value,
    badge: document.getElementById('bBadge').value,
    age: document.getElementById('bAge').value,
    gender: document.getElementById('bGender').value,
    parentName: document.getElementById('bParentName').value,
    parentPhone: document.getElementById('bParentPhone').value,
    parentEmail: document.getElementById('bParentEmail').value,
    address: document.getElementById('bAddress').value,
    medicalInfo: document.getElementById('bMedical').value,
    emergencyContact: document.getElementById('bEmergency').value,
  };
  const result = await apiCall('enrolBrigade', data);
  showMessage('brigadeMessage', result.message || '✅ Enrolled successfully!', false);
  if (!result.error) e.target.reset();
}

// ---- Enrol Church School ----
async function enrolCS(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('csName').value,
    phone: document.getElementById('csPhone').value,
    email: document.getElementById('csEmail').value,
    congregation: document.getElementById('csCongregation').value,
    className: document.getElementById('csClass').value,
    age: document.getElementById('csAge').value,
    gender: document.getElementById('csGender').value,
    parentName: document.getElementById('csParentName').value,
    parentPhone: document.getElementById('csParentPhone').value,
    parentEmail: document.getElementById('csParentEmail').value,
    address: document.getElementById('csAddress').value,
    medicalInfo: document.getElementById('csMedical').value,
  };
  const result = await apiCall('enrolChurchSchool', data);
  showMessage('csMessage', result.message || '✅ Enrolled successfully!', false);
  if (!result.error) e.target.reset();
}

// ---- Attendance ----
async function loadAttendanceLearners() {
  const dept = document.getElementById('attDept').value;
  const cong = document.getElementById('attCong').value;
  const data = await apiCall('getLearners', { department: dept, congregation: cong });
  learners = data;
  const container = document.getElementById('attendanceGrid');
  if (data.length === 0) {
    container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color: var(--text-light);">No learners found.</p>';
    return;
  }
  container.innerHTML = data.map((l, idx) => {
    const name = l.Name || l.name || 'Unknown';
    return `<div class="attendance-btn present" data-index="${idx}" onclick="toggleAttendance(${idx})">
      ${name}
      <span class="status">✓</span>
    </div>`;
  }).join('');
  window.attendanceState = data.map(() => true);
  showMessage('attMessage', '', false);
}

function toggleAttendance(idx) {
  const state = window.attendanceState;
  state[idx] = !state[idx];
  const btn = document.querySelector(`.attendance-btn[data-index="${idx}"]`);
  btn.className = `attendance-btn ${state[idx] ? 'present' : 'absent'}`;
  btn.querySelector('.status').textContent = state[idx] ? '✓' : '✗';
}

function markAllPresent() {
  if (!learners.length) return;
  const state = window.attendanceState;
  learners.forEach((_, idx) => state[idx] = true);
  document.querySelectorAll('.attendance-btn').forEach(btn => {
    btn.className = 'attendance-btn present';
    btn.querySelector('.status').textContent = '✓';
  });
}

async function saveAttendance() {
  const dept = document.getElementById('attDept').value;
  const cong = document.getElementById('attCong').value;
  const cls = document.getElementById('attClass').value;
  const date = document.getElementById('attDate').value;
  if (!date) { showMessage('attMessage', 'Please select a date.', true); return; }
  if (!learners.length) { showMessage('attMessage', 'No learners to mark.', true); return; }
  const learnersList = learners.map((l, idx) => ({
    name: l.Name || l.name || 'Unknown',
    present: window.attendanceState[idx]
  }));
  const result = await apiCall('saveAttendance', {
    department: dept,
    congregation: cong,
    className: cls,
    date,
    learners: learnersList,
    recordedBy: currentUser.name || 'app'
  });
  showMessage('attMessage', result.message || '✅ Attendance saved!', false);
}

// ---- Admin ----
async function loadUsers() {
  try {
    const users = await apiCall('adminUsers', {});
    const tbody = document.getElementById('userTableBody');
    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No users</td></tr>';
      return;
    }
    tbody.innerHTML = users.map((u, i) => `
      <tr>
        <td>${u.name || ''}</td>
        <td>${u.email || ''}</td>
        <td>${u.role || 'teacher'}</td>
        <td>${u.congregation || '-'}</td>
        <td>${u.department || '-'}</td>
        <td><span class="${u.active === 'false' ? 'badge-inactive' : 'badge-active'}">${u.active === 'false' ? 'Inactive' : 'Active'}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="deactivateUser(${i})">Deactivate</button></td>
      </tr>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

async function createUser(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('newName').value,
    email: document.getElementById('newEmail').value,
    password: document.getElementById('newPassword').value,
    role: document.getElementById('newRole').value,
    congregation: document.getElementById('newCong').value,
    department: document.getElementById('newDept').value,
    classes: document.getElementById('newClasses').value,
    badges: document.getElementById('newBadges').value,
  };
  const result = await apiCall('createUser', data);
  showMessage('adminMessage', result.message || '✅ User created!', false);
  if (!result.error) {
    loadUsers();
    e.target.reset();
  }
}

async function deactivateUser(rowIndex) {
  if (!confirm('Deactivate this user?')) return;
  // We need to find the user by email – for simplicity we just alert.
  // In a full version, we would pass the email.
  alert('Deactivation: In a full version, this would mark the user inactive.\nYou can manually set active=false in the sheet.');
}

async function postAnnouncement(e) {
  e.preventDefault();
  const data = {
    title: document.getElementById('annTitle').value,
    content: document.getElementById('annContent').value,
    congregation: document.getElementById('annCong').value || 'All',
    department: document.getElementById('annDept').value || 'All',
    priority: document.getElementById('annPriority').value || 'Normal',
  };
  const result = await apiCall('postAnnouncement', data);
  showMessage('adminMessage', result.message || '✅ Announcement posted!', false);
  if (!result.error) {
    e.target.reset();
    loadDashboard();
  }
}

// ---- Config ----
async function loadConfig() {
  try {
    const config = await apiCall('getConfig', {});
    document.getElementById('cfgBrigadeForm').value = config.brigade_form_url || '';
    document.getElementById('cfgCSForm').value = config.cs_form_url || '';
    document.getElementById('cfgBrigadeAtt').value = config.brigade_attendance_form_url || '';
    document.getElementById('cfgCSAtt').value = config.cs_attendance_form_url || '';
    document.getElementById('cfgAnnForm').value = config.announcements_form_url || '';
  } catch (e) {
    console.error(e);
  }
}

async function saveConfig(e) {
  e.preventDefault();
  const data = {
    brigade_form_url: document.getElementById('cfgBrigadeForm').value,
    cs_form_url: document.getElementById('cfgCSForm').value,
    brigade_attendance_form_url: document.getElementById('cfgBrigadeAtt').value,
    cs_attendance_form_url: document.getElementById('cfgCSAtt').value,
    announcements_form_url: document.getElementById('cfgAnnForm').value,
  };
  const result = await apiCall('saveConfig', data);
  showMessage('configMessage', result.message || '✅ Config saved!', false);
}

// ---- Render App ----
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- LOGIN PAGE -->
    <div id="login" class="page">
      <div class="login-wrapper">
        <div class="login-card">
          <div class="logo">⛪</div>
          <h1>PCEA Children Ministry</h1>
          <div class="sub">Kasarani West Parish · Brigade &amp; Church School</div>
          <form onsubmit="handleLogin(event)">
            <input type="email" id="loginEmail" placeholder="Email address" required>
            <input type="password" id="loginPassword" placeholder="Password" required>
            <div id="loginMessage" style="color:#b91c1c; margin-bottom:12px; font-weight:500; min-height:24px;"></div>
            <button type="submit">Sign In</button>
          </form>
          <div class="footer-text">© ${new Date().getFullYear()} PCEA Kasarani West</div>
        </div>
      </div>
    </div>

    <!-- DASHBOARD (logged-in) -->
    <div id="dashboard" class="page hidden">
      <!-- Top Bar -->
      <div class="top-bar">
        <div class="brand">⛪ PCEA Ministry <span>v2</span></div>
        <div class="user-greeting">👋 Welcome, <strong id="userNameDisplay">User</strong></div>
      </div>
      <!-- Navigation -->
      <div class="nav-scroll">
        <a href="#" data-page="dashboard" class="active" onclick="navigateTo('dashboard')">📊 Dashboard</a>
        <a href="#" data-page="enrol-brigade" onclick="navigateTo('enrol-brigade')">🎖️ Enrol Brigade</a>
        <a href="#" data-page="enrol-churchschool" onclick="navigateTo('enrol-churchschool')">📚 Enrol CS</a>
        <a href="#" data-page="attendance" onclick="navigateTo('attendance')">✅ Attendance</a>
        <a href="#" data-page="admin" onclick="navigateTo('admin')" class="admin-only">⚙️ Admin</a>
        <a href="#" data-page="config" onclick="navigateTo('config')" class="admin-only">🔧 Config</a>
        <a href="#" class="logout-btn" onclick="currentUser=null; showPage('login')">🚪 Logout</a>
      </div>

      <!-- Dashboard Content -->
      <div class="stats-grid">
        <div class="stat-card"><span class="number" id="brigadeCount">0</span><span class="label">Brigade Learners</span></div>
        <div class="stat-card"><span class="number" id="csCount">0</span><span class="label">Church School Learners</span></div>
      </div>
      <div class="card">
        <div class="card-header">📢 Announcements</div>
        <div id="announcementsList"></div>
      </div>
    </div>

    <!-- ENROL BRIGADE -->
    <div id="enrol-brigade" class="page hidden">
      <div class="card">
        <div class="card-header">🎖️ Enrol Brigade Learner</div>
        <div id="brigadeMessage" style="margin-bottom:12px; font-weight:500; min-height:24px;"></div>
        <form onsubmit="enrolBrigade(event)">
          <div class="form-group"><label>Full Name *</label><input type="text" id="bName" required></div>
          <div class="form-group"><label>Phone</label><input type="tel" id="bPhone"></div>
          <div class="form-group"><label>Email</label><input type="email" id="bEmail"></div>
          <div class="form-group"><label>Congregation *</label>
            <select id="bCongregation" required><option>Kasarani</option><option>Joyvalley</option></select>
          </div>
          <div class="form-group"><label>Badge</label>
            <select id="bBadge"><option value="">Select</option><option>Anchor</option><option>Compass</option><option>Pathfinder</option><option>Pioneer</option><option>Ranger</option><option>Explorer</option></select>
          </div>
          <div class="form-group"><label>Age</label><input type="number" id="bAge"></div>
          <div class="form-group"><label>Gender</label>
            <select id="bGender"><option value="">Select</option><option>Male</option><option>Female</option></select>
          </div>
          <hr>
          <div class="form-group"><label>Parent Name</label><input type="text" id="bParentName"></div>
          <div class="form-group"><label>Parent Phone</label><input type="tel" id="bParentPhone"></div>
          <div class="form-group"><label>Parent Email</label><input type="email" id="bParentEmail"></div>
          <div class="form-group"><label>Address</label><input type="text" id="bAddress"></div>
          <div class="form-group"><label>Medical Info</label><input type="text" id="bMedical"></div>
          <div class="form-group"><label>Emergency Contact</label><input type="text" id="bEmergency"></div>
          <button type="submit" class="btn btn-gold btn-block">🎯 Enrol Brigade</button>
        </form>
      </div>
    </div>

    <!-- ENROL CHURCH SCHOOL -->
    <div id="enrol-churchschool" class="page hidden">
      <div class="card">
        <div class="card-header">📚 Enrol Church School Learner</div>
        <div id="csMessage" style="margin-bottom:12px; font-weight:500; min-height:24px;"></div>
        <form onsubmit="enrolCS(event)">
          <div class="form-group"><label>Full Name *</label><input type="text" id="csName" required></div>
          <div class="form-group"><label>Phone</label><input type="tel" id="csPhone"></div>
          <div class="form-group"><label>Email</label><input type="email" id="csEmail"></div>
          <div class="form-group"><label>Congregation *</label>
            <select id="csCongregation" required><option>Kasarani</option><option>Joyvalley</option></select>
          </div>
          <div class="form-group"><label>Class</label>
            <select id="csClass"><option value="">Select</option><option>Pre-Primary</option><option>Lower Primary</option><option>Upper Primary</option><option>Junior High</option></select>
          </div>
          <div class="form-group"><label>Age</label><input type="number" id="csAge"></div>
          <div class="form-group"><label>Gender</label>
            <select id="csGender"><option value="">Select</option><option>Male</option><option>Female</option></select>
          </div>
          <hr>
          <div class="form-group"><label>Parent Name</label><input type="text" id="csParentName"></div>
          <div class="form-group"><label>Parent Phone</label><input type="tel" id="csParentPhone"></div>
          <div class="form-group"><label>Parent Email</label><input type="email" id="csParentEmail"></div>
          <div class="form-group"><label>Address</label><input type="text" id="csAddress"></div>
          <div class="form-group"><label>Medical Info</label><input type="text" id="csMedical"></div>
          <button type="submit" class="btn btn-gold btn-block">📖 Enrol Church School</button>
        </form>
      </div>
    </div>

    <!-- ATTENDANCE -->
    <div id="attendance" class="page hidden">
      <div class="card">
        <div class="card-header">✅ Take Attendance</div>
        <div id="attMessage" style="margin-bottom:12px; font-weight:500; min-height:24px;"></div>
        <div class="form-group"><label>Department</label>
          <select id="attDept" onchange="loadAttendanceLearners()"><option value="brigade">Brigade</option><option value="church-school">Church School</option></select>
        </div>
        <div class="form-group"><label>Congregation</label>
          <select id="attCong" onchange="loadAttendanceLearners()"><option>Kasarani</option><option>Joyvalley</option></select>
        </div>
        <div class="form-group"><label>Class / Badge (optional)</label><input type="text" id="attClass"></div>
        <div class="form-group"><label>Date *</label><input type="date" id="attDate"></div>
        <div class="flex-between mb-16">
          <span style="font-weight:600;">Tap to mark present/absent</span>
          <button type="button" class="btn btn-sm" onclick="markAllPresent()">✅ Mark All Present</button>
        </div>
        <div id="attendanceGrid" class="attendance-grid"></div>
        <button class="btn btn-gold btn-block mt-16" onclick="saveAttendance()">💾 Save Attendance</button>
      </div>
    </div>

    <!-- ADMIN -->
    <div id="admin" class="page hidden">
      <div class="card">
        <div class="card-header">👤 Admin Panel</div>
        <div id="adminMessage" style="margin-bottom:12px; font-weight:500; min-height:24px;"></div>
        <h3 style="margin-bottom:8px;">👥 Users</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Cong</th><th>Dept</th><th>Status</th><th>Action</th></tr></thead>
            <tbody id="userTableBody"></tbody>
          </table>
        </div>
        <hr>
        <h3 style="margin-bottom:12px;">➕ Create User</h3>
        <form onsubmit="createUser(event)">
          <div class="form-group"><label>Name *</label><input type="text" id="newName" required></div>
          <div class="form-group"><label>Email *</label><input type="email" id="newEmail" required></div>
          <div class="form-group"><label>Password *</label><input type="password" id="newPassword" required></div>
          <div class="form-group"><label>Role</label>
            <select id="newRole"><option value="teacher">Teacher</option><option value="officer">Officer</option><option value="admin">Admin</option></select>
          </div>
          <div class="form-group"><label>Congregation</label>
            <select id="newCong"><option value="">None</option><option>Kasarani</option><option>Joyvalley</option></select>
          </div>
          <div class="form-group"><label>Department</label>
            <select id="newDept"><option value="">None</option><option>Brigade</option><option>Church School</option><option>Both</option></select>
          </div>
          <div class="form-group"><label>Classes (comma‑separated)</label><input type="text" id="newClasses"></div>
          <div class="form-group"><label>Badges (comma‑separated)</label><input type="text" id="newBadges"></div>
          <button type="submit" class="btn btn-block">👤 Create User</button>
        </form>
        <hr>
        <h3 style="margin-bottom:12px;">📢 Post Announcement</h3>
        <form onsubmit="postAnnouncement(event)">
          <div class="form-group"><label>Title *</label><input type="text" id="annTitle" required></div>
          <div class="form-group"><label>Content *</label><textarea id="annContent" required></textarea></div>
          <div class="form-group"><label>Congregation</label>
            <select id="annCong"><option value="All">All</option><option>Kasarani</option><option>Joyvalley</option></select>
          </div>
          <div class="form-group"><label>Department</label>
            <select id="annDept"><option value="All">All</option><option>Brigade</option><option>Church School</option></select>
          </div>
          <div class="form-group"><label>Priority</label>
            <select id="annPriority"><option value="Normal">Normal</option><option>Medium</option><option>High</option></select>
          </div>
          <button type="submit" class="btn btn-gold btn-block">📢 Post Announcement</button>
        </form>
      </div>
    </div>

    <!-- CONFIG -->
    <div id="config" class="page hidden">
      <div class="card">
        <div class="card-header">🔧 Configuration</div>
        <div id="configMessage" style="margin-bottom:12px; font-weight:500; min-height:24px;"></div>
        <form onsubmit="saveConfig(event)">
          <div class="form-group"><label>Brigade Enrolment Form URL</label><input type="url" id="cfgBrigadeForm" placeholder="https://..."></div>
          <div class="form-group"><label>Church School Enrolment Form URL</label><input type="url" id="cfgCSForm" placeholder="https://..."></div>
          <div class="form-group"><label>Brigade Attendance Form URL</label><input type="url" id="cfgBrigadeAtt" placeholder="https://..."></div>
          <div class="form-group"><label>Church School Attendance Form URL</label><input type="url" id="cfgCSAtt" placeholder="https://..."></div>
          <div class="form-group"><label>Announcements Form URL</label><input type="url" id="cfgAnnForm" placeholder="https://..."></div>
          <button type="submit" class="btn btn-block">💾 Save Configuration</button>
        </form>
      </div>
    </div>
  `;

  // Hide admin-only nav items if user is not admin
  // This is done dynamically on login via CSS – we'll handle it with a class
  // We'll apply a filter in the navigation display later.
  // For now, we show all nav items; the backend will reject admin-only API calls if not admin.
  // But we also hide the tabs visually:
  function updateNavForRole() {
    const isAdmin = currentUser && currentUser.role === 'admin';
    document.querySelectorAll('.nav-scroll a.admin-only').forEach(el => {
      el.style.display = isAdmin ? 'inline-block' : 'none';
    });
  }
  // Override navigateTo to call updateNav
  const originalNavigate = navigateTo;
  navigateTo = function(page) {
    updateNavForRole();
    originalNavigate(page);
  };
  // Also call on login
  const originalLogin = handleLogin;
  handleLogin = async function(e) {
    await originalLogin(e);
    if (currentUser) updateNavForRole();
  };

  showPage('login');
});

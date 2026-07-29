// app.js – Frontend for PCEA Ministry
// CHANGE THIS LINE TO YOUR DEPLOYED SCRIPT URL
const API_BASE = 'https://script.google.com/macros/s/AKfycbyFBi5X18gxETVCU_9p6i8Vksa1lstqq_3T_iG0SjOBaDwXmvBuFcqK4Rcq_6XHEeJe/exec';

let currentUser = null;
let learners = [];

// ---- Helper ----
function apiCall(method, params) {
  const url = `${API_BASE}?method=${method}&data=${encodeURIComponent(JSON.stringify(params))}`;
  return fetch(url).then(r => r.json());
}

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
    alert('Login failed: ' + (result.error || 'Invalid credentials'));
  }
}

// ---- Page navigation ----
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const page = document.getElementById(pageId);
  if (page) page.classList.remove('hidden');
}

function navigateTo(page) {
  if (!currentUser && page !== 'login') { showPage('login'); return; }
  showPage(page);
  if (page === 'dashboard') loadDashboard();
  if (page === 'attendance') loadAttendanceLearners();
  if (page === 'admin') loadUsers();
  if (page === 'config') loadConfig();
}

// ---- Dashboard ----
async function loadDashboard() {
  const ann = await apiCall('getAnnouncements', {});
  const container = document.getElementById('announcementsList');
  container.innerHTML = ann.length ? ann.map(a => `<div><strong>${a.title}</strong><p>${a.content}</p></div>`).join('') : '<p>No announcements</p>';
  // Counts
  const brigade = await apiCall('getLearners', { department: 'brigade' });
  const cs = await apiCall('getLearners', { department: 'church-school' });
  document.getElementById('brigadeCount').textContent = brigade.length;
  document.getElementById('csCount').textContent = cs.length;
}

// ---- Enrolment functions (same as before) ----
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
  alert(result.message || 'Enrolled');
  e.target.reset();
}

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
  alert(result.message || 'Enrolled');
  e.target.reset();
}

// ---- Attendance ----
async function loadAttendanceLearners() {
  const dept = document.getElementById('attDept').value;
  const cong = document.getElementById('attCong').value;
  const data = await apiCall('getLearners', { department: dept, congregation: cong });
  learners = data;
  const container = document.getElementById('attendanceGrid');
  container.innerHTML = data.map((l, idx) => {
    const name = l.Name || l.name || 'Unknown';
    return `<div class="attendance-btn present" data-index="${idx}" onclick="toggleAttendance(${idx})">${name}<br><span class="status">✓</span></div>`;
  }).join('');
  window.attendanceState = data.map(() => true);
}

function toggleAttendance(idx) {
  const state = window.attendanceState;
  state[idx] = !state[idx];
  const btn = document.querySelector(`.attendance-btn[data-index="${idx}"]`);
  btn.className = `attendance-btn ${state[idx] ? 'present' : 'absent'}`;
  btn.querySelector('.status').textContent = state[idx] ? '✓' : '✗';
}

async function saveAttendance() {
  const dept = document.getElementById('attDept').value;
  const cong = document.getElementById('attCong').value;
  const cls = document.getElementById('attClass').value;
  const date = document.getElementById('attDate').value;
  if (!date) { alert('Please select a date'); return; }
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
  alert(result.message || 'Attendance saved');
}

// ---- Admin ----
async function loadUsers() {
  const users = await apiCall('adminUsers', {});
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = users.map((u, i) => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${u.congregation || '-'}</td>
      <td>${u.department || '-'}</td>
      <td>${u.active === 'false' ? 'Inactive' : 'Active'}</td>
      <td><button onclick="deactivateUser(${i})">Deactivate</button></td>
    </tr>
  `).join('');
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
  alert(result.message || 'User created');
  loadUsers();
  e.target.reset();
}

async function deactivateUser(rowIndex) {
  if (!confirm('Deactivate this user?')) return;
  // We need a way to identify the user – we can pass email, but for simplicity we'll use index
  // This requires a more robust implementation; for now we just alert.
  alert('Deactivation feature can be implemented further.');
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
  alert(result.message || 'Posted');
  e.target.reset();
  loadDashboard();
}

// ---- Config ----
async function loadConfig() {
  const config = await apiCall('getConfig', {});
  document.getElementById('cfgBrigadeForm').value = config.brigade_form_url || '';
  document.getElementById('cfgCSForm').value = config.cs_form_url || '';
  document.getElementById('cfgBrigadeAtt').value = config.brigade_attendance_form_url || '';
  document.getElementById('cfgCSAtt').value = config.cs_attendance_form_url || '';
  document.getElementById('cfgAnnForm').value = config.announcements_form_url || '';
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
  alert(result.message || 'Config saved');
}

// ---- Render the app when page loads ----
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  // We embed the entire HTML structure inside app (as before)
  app.innerHTML = `
    <!-- Login -->
    <div id="login" class="page">
      <div class="card" style="max-width:400px;margin:40px auto;">
        <h2>⛪ PCEA Children Ministry</h2>
        <form onsubmit="handleLogin(event)">
          <input type="email" id="loginEmail" placeholder="Email" required>
          <input type="password" id="loginPassword" placeholder="Password" required>
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
    <!-- Dashboard -->
    <div id="dashboard" class="page hidden">
      <header>
        <h1>PCEA Children Ministry</h1>
        <p>Welcome, <span id="userNameDisplay">User</span></p>
      </header>
      <div class="nav">
        <a href="#" onclick="navigateTo('dashboard')" class="active">Dashboard</a>
        <a href="#" onclick="navigateTo('enrol-brigade')">Enrol Brigade</a>
        <a href="#" onclick="navigateTo('enrol-churchschool')">Enrol Church School</a>
        <a href="#" onclick="navigateTo('attendance')">Attendance</a>
        <a href="#" onclick="navigateTo('admin')">Admin</a>
        <a href="#" onclick="navigateTo('config')">Config</a>
        <a href="#" onclick="currentUser=null; showPage('login')">Logout</a>
      </div>
      <div class="card">
        <h3>📊 Overview</h3>
        <p>Brigade Learners: <strong id="brigadeCount">0</strong></p>
        <p>Church School Learners: <strong id="csCount">0</strong></p>
        <h4>📢 Announcements</h4>
        <div id="announcementsList"></div>
      </div>
    </div>
    <!-- Enrol Brigade -->
    <div id="enrol-brigade" class="page hidden">
      <div class="card">
        <h2>🎖️ Enrol Brigade Learner</h2>
        <form onsubmit="enrolBrigade(event)">
          <input type="text" id="bName" placeholder="Full Name *" required>
          <input type="tel" id="bPhone" placeholder="Phone">
          <input type="email" id="bEmail" placeholder="Email">
          <select id="bCongregation" required><option>Kasarani</option><option>Joyvalley</option></select>
          <select id="bBadge"><option value="">Badge</option><option>Anchor</option><option>Compass</option><option>Pathfinder</option><option>Pioneer</option><option>Ranger</option><option>Explorer</option></select>
          <input type="number" id="bAge" placeholder="Age">
          <select id="bGender"><option value="">Gender</option><option>Male</option><option>Female</option></select>
          <input type="text" id="bParentName" placeholder="Parent Name">
          <input type="tel" id="bParentPhone" placeholder="Parent Phone">
          <input type="email" id="bParentEmail" placeholder="Parent Email">
          <input type="text" id="bAddress" placeholder="Address">
          <input type="text" id="bMedical" placeholder="Medical Info">
          <input type="text" id="bEmergency" placeholder="Emergency Contact">
          <button type="submit">Enrol Brigade</button>
        </form>
      </div>
    </div>
    <!-- Enrol Church School -->
    <div id="enrol-churchschool" class="page hidden">
      <div class="card">
        <h2>📚 Enrol Church School Learner</h2>
        <form onsubmit="enrolCS(event)">
          <input type="text" id="csName" placeholder="Full Name *" required>
          <input type="tel" id="csPhone" placeholder="Phone">
          <input type="email" id="csEmail" placeholder="Email">
          <select id="csCongregation" required><option>Kasarani</option><option>Joyvalley</option></select>
          <select id="csClass"><option value="">Class</option><option>Pre-Primary</option><option>Lower Primary</option><option>Upper Primary</option><option>Junior High</option></select>
          <input type="number" id="csAge" placeholder="Age">
          <select id="csGender"><option value="">Gender</option><option>Male</option><option>Female</option></select>
          <input type="text" id="csParentName" placeholder="Parent Name">
          <input type="tel" id="csParentPhone" placeholder="Parent Phone">
          <input type="email" id="csParentEmail" placeholder="Parent Email">
          <input type="text" id="csAddress" placeholder="Address">
          <input type="text" id="csMedical" placeholder="Medical Info">
          <button type="submit">Enrol Church School</button>
        </form>
      </div>
    </div>
    <!-- Attendance -->
    <div id="attendance" class="page hidden">
      <div class="card">
        <h2>✅ Take Attendance</h2>
        <select id="attDept" onchange="loadAttendanceLearners()"><option value="brigade">Brigade</option><option value="church-school">Church School</option></select>
        <select id="attCong" onchange="loadAttendanceLearners()"><option>Kasarani</option><option>Joyvalley</option></select>
        <input type="text" id="attClass" placeholder="Class / Badge (optional)">
        <input type="date" id="attDate">
        <div id="attendanceGrid" class="attendance-grid"></div>
        <button onclick="saveAttendance()">Save Attendance</button>
      </div>
    </div>
    <!-- Admin -->
    <div id="admin" class="page hidden">
      <div class="card">
        <h2>👤 Admin Panel</h2>
        <h3>Users</h3>
        <table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Cong</th><th>Dept</th><th>Status</th><th>Action</th></tr></thead>
          <tbody id="userTableBody"></tbody>
        </table>
        <hr>
        <h3>Create User</h3>
        <form onsubmit="createUser(event)">
          <input type="text" id="newName" placeholder="Name *" required>
          <input type="email" id="newEmail" placeholder="Email *" required>
          <input type="password" id="newPassword" placeholder="Password *" required>
          <select id="newRole"><option value="teacher">Teacher</option><option value="officer">Officer</option><option value="admin">Admin</option></select>
          <select id="newCong"><option value="">Congregation</option><option>Kasarani</option><option>Joyvalley</option></select>
          <select id="newDept"><option value="">Department</option><option>Brigade</option><option>Church School</option><option>Both</option></select>
          <input type="text" id="newClasses" placeholder="Classes (comma separated)">
          <input type="text" id="newBadges" placeholder="Badges (comma separated)">
          <button type="submit">Create User</button>
        </form>
        <hr>
        <h3>Post Announcement</h3>
        <form onsubmit="postAnnouncement(event)">
          <input type="text" id="annTitle" placeholder="Title *" required>
          <textarea id="annContent" placeholder="Content *" required></textarea>
          <select id="annCong"><option value="All">All Congregations</option><option>Kasarani</option><option>Joyvalley</option></select>
          <select id="annDept"><option value="All">All Departments</option><option>Brigade</option><option>Church School</option></select>
          <select id="annPriority"><option value="Normal">Normal</option><option>Medium</option><option>High</option></select>
          <button type="submit">Post</button>
        </form>
      </div>
    </div>
    <!-- Config -->
    <div id="config" class="page hidden">
      <div class="card">
        <h2>🔧 Configuration</h2>
        <form onsubmit="saveConfig(event)">
          <label>Brigade Enrolment Form URL</label>
          <input type="url" id="cfgBrigadeForm" placeholder="https://...">
          <label>Church School Enrolment Form URL</label>
          <input type="url" id="cfgCSForm" placeholder="https://...">
          <label>Brigade Attendance Form URL</label>
          <input type="url" id="cfgBrigadeAtt" placeholder="https://...">
          <label>Church School Attendance Form URL</label>
          <input type="url" id="cfgCSAtt" placeholder="https://...">
          <label>Announcements Form URL</label>
          <input type="url" id="cfgAnnForm" placeholder="https://...">
          <button type="submit">Save Configuration</button>
        </form>
      </div>
    </div>
  `;
  showPage('login');
});
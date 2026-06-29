/* ══════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════ */
const API = "http://localhost:3000";

/* ══════════════════════════════════════════════
   DRAWER
══════════════════════════════════════════════ */
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

/* ══════════════════════════════════════════════
   PAGE ROUTING
══════════════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function switchTab(tab) {
  ['dashboard', 'profile', 'settings'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === tab ? 'block' : 'none';
    ['nav-', 'dnav-', 'bnav-'].forEach(pre => {
      const el = document.getElementById(pre + t);
      if (el) el.classList.toggle('active', t === tab);
    });
  });
  if (tab === 'profile') loadProfile();
  if (tab === 'settings') syncSettingsUI();
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════════
   CURRENT USER HELPERS
══════════════════════════════════════════════ */
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser'));
}

function setCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem('currentUser');
}

/* ══════════════════════════════════════════════
   REGISTER  →  calls POST /register
══════════════════════════════════════════════ */
async function doRegister() {
  const v = id => document.getElementById(id).value.trim();
  const full_name = v('regName');
  const email     = v('regEmail');
  const username  = v('regUsername');
  const pw        = document.getElementById('regPassword').value;
  const conf      = document.getElementById('regConfirm').value;

  const err = document.getElementById('registerError');
  const suc = document.getElementById('registerSuccess');
  err.style.display = 'none';
  suc.style.display = 'none';

  if (!full_name || !email || !username || !pw) {
    err.textContent = 'All fields are required.';
    err.style.display = 'block';
    return;
  }
  if (pw.length < 6) {
    err.textContent = 'Password must be at least 6 characters.';
    err.style.display = 'block';
    return;
  }
  if (pw !== conf) {
    err.textContent = 'Passwords do not match.';
    err.style.display = 'block';
    return;
  }

  try {
    const res  = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, username, password: pw })
    });
    const data = await res.json();

    if (!res.ok) {
      err.textContent = data.message || 'Registration failed.';
      err.style.display = 'block';
      return;
    }

    suc.textContent = 'Account created! Redirecting to login…';
    suc.style.display = 'block';
    setTimeout(() => showPage('page-login'), 1400);

  } catch (e) {
    err.textContent = 'Cannot reach server. Is it running?';
    err.style.display = 'block';
  }
}

/* ══════════════════════════════════════════════
   LOGIN  →  calls POST /login
══════════════════════════════════════════════ */
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pw    = document.getElementById('loginPassword').value;
  const err   = document.getElementById('loginError');
  err.style.display = 'none';

  if (!email || !pw) {
    err.textContent = 'Please enter email and password.';
    err.style.display = 'block';
    return;
  }

  try {
    const res  = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw })
    });
    const data = await res.json();

    if (!res.ok) {
      err.textContent = data.message || 'Invalid email or password.';
      err.style.display = 'block';
      return;
    }

    // ✅ Store THIS user's data — every login overwrites with the new user
    setCurrentUser(data.user);

    if (document.getElementById('rememberMe').checked) {
      localStorage.setItem('savedEmail', email);
    } else {
      localStorage.removeItem('savedEmail');
    }

    await enterDashboard();

  } catch (e) {
    err.textContent = 'Cannot reach server. Is it running?';
    err.style.display = 'block';
  }
}

/* ── shared setup after login ─────────────────── */
async function enterDashboard() {
  showPage('page-dashboard');
  switchTab('dashboard');
  await loadTasks();
  loadProfile();
  syncSettingsUI();
}

/* ══════════════════════════════════════════════
   FORGOT PASSWORD
══════════════════════════════════════════════ */
function doForgot() {
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) return;
  const suc = document.getElementById('forgotSuccess');
  suc.textContent = 'If this email is registered, a reset link was sent.';
  suc.style.display = 'block';
}

/* ══════════════════════════════════════════════
   TASKS  →  all calls use current user's ID
══════════════════════════════════════════════ */
let tasks = [];
let currentFilter = 'all';

/* Load tasks from backend for the logged-in user */
async function loadTasks() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    const res  = await fetch(`${API}/tasks/${user.id}`);
    const data = await res.json();
    tasks = Array.isArray(data) ? data : [];
  } catch (e) {
    tasks = [];
    showToast('Could not load tasks.', 'error');
  }

  renderTasks();
  updateStats();
}

async function addTask() {
  const user  = getCurrentUser();
  if (!user) return;

  const input = document.getElementById('taskInput');
  const title = input.value.trim();
  if (!title) { showToast('Please enter a task!', 'error'); return; }

  const body = {
    user_id:     user.id,
    title,
    description: '',
    priority:    document.getElementById('priority').value,
    due_date:    document.getElementById('dueDate').value || null
  };

  try {
    const res = await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) { showToast('Failed to add task.', 'error'); return; }

    input.value = '';
    document.getElementById('dueDate').value = '';
    await loadTasks();
    showToast('Task added!');
  } catch (e) {
    showToast('Server error.', 'error');
  }
}

function renderTasks() {
  const list = document.getElementById('taskList');
  if (!list) return;

  const q = (document.getElementById('searchTask')?.value || '').toLowerCase();

  const filtered = tasks.filter(t => {
    const title = (t.title || t.text || '').toLowerCase();
    const ms    = title.includes(q);
    const done  = t.status === 'Completed';

    if (currentFilter === 'all')       return ms;
    if (currentFilter === 'pending')   return ms && !done;
    if (currentFilter === 'completed') return ms && done;
    return ms && t.priority === currentFilter;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><div>No tasks found.<br>Add one above!</div></div>`;
    return;
  }

  list.innerHTML = filtered.map(t => {
    const done  = t.status === 'Completed';
    const title = esc(t.title || t.text || '');
    const due   = t.due_date ? `<span class="due-label">📅 ${t.due_date.split('T')[0]}</span>` : '';
    return `<div class="task ${done ? 'completed' : ''}">
      <div class="task-info">
        <strong>${title}</strong>
        <div class="task-meta">
          <span class="priority-badge priority-${t.priority}">${t.priority}</span>
          ${due}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-done ${done ? 'is-done' : ''}" onclick="toggleTask(${t.id}, '${done ? 'Pending' : 'Completed'}')">${done ? '↩️' : '✓'}</button>
        <button class="btn-del" onclick="deleteTask(${t.id})">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function toggleTask(id, newStatus) {
  try {
    await fetch(`${API}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    await loadTasks();
  } catch (e) {
    showToast('Update failed.', 'error');
  }
}

async function deleteTask(id) {
  try {
    await fetch(`${API}/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
    showToast('Task deleted.');
  } catch (e) {
    showToast('Delete failed.', 'error');
  }
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-bar button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function updateStats() {
  const total = tasks.length;
  const done  = tasks.filter(t => t.status === 'Completed').length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);
  const set   = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('totalTasks',      total);
  set('completedTasks',  done);
  set('pendingTasks',    total - done);
  set('progressPercent', pct + '%');
}

/* ══════════════════════════════════════════════
   PROFILE  →  GET /profile/:id  &  PUT /profile/:id
══════════════════════════════════════════════ */
function loadProfile() {
  const u = getCurrentUser();
  if (!u) return;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const name = u.full_name || u.name || '';
  set('profileName',  name);
  set('profileEmail', u.email || '');

  const av = document.getElementById('profileAvatar');
  if (av) av.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}`;

  const nn = document.getElementById('newName');  if (nn) nn.value = name;
  const ne = document.getElementById('newEmail'); if (ne) ne.value = u.email || '';
}

async function updateProfile() {
  const user = getCurrentUser();
  if (!user) return;

  const full_name = document.getElementById('newName').value.trim()  || user.full_name;
  const email     = document.getElementById('newEmail').value.trim() || user.email;

  try {
    const res = await fetch(`${API}/profile/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email })
    });

    if (!res.ok) { showToast('Update failed.', 'error'); return; }

    // Keep localStorage in sync
    setCurrentUser({ ...user, full_name, email });
    loadProfile();

    const suc = document.getElementById('profileSuccess');
    suc.textContent = 'Profile updated!';
    suc.style.display = 'block';
    setTimeout(() => suc.style.display = 'none', 2500);
    showToast('Profile updated!');
  } catch (e) {
    showToast('Server error.', 'error');
  }
}

/* ══════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════ */
function syncSettingsUI() {
  const dt = document.getElementById('darkToggle');
  if (dt) dt.checked = document.body.classList.contains('dark');
  const nt = document.getElementById('notifToggle');
  if (nt) nt.checked = localStorage.getItem('notif') === 'true';
}

async function clearTasks() {
  const user = getCurrentUser();
  if (!user) return;
  if (!confirm('Delete ALL your tasks? This cannot be undone.')) return;

  try {
    await fetch(`${API}/tasks/user/${user.id}`, { method: 'DELETE' });
    await loadTasks();
    showToast('All tasks deleted.', 'error');
  } catch (e) {
    showToast('Failed to clear tasks.', 'error');
  }
}

/* ══════════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════════ */
function logout() {
  clearCurrentUser();           // ✅ Remove THIS user — next login sets a fresh one
  tasks = [];
  showPage('page-welcome');
  switchTab('dashboard');
  showToast('Logged out.');
}

function toggleNotif() {
  const on = document.getElementById('notifToggle').checked;
  localStorage.setItem('notif', on);
  if (on && Notification && Notification.permission === 'default') Notification.requestPermission();
}

/* ══════════════════════════════════════════════
   DARK MODE
══════════════════════════════════════════════ */
function toggleDark() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('darkMode', isDark);
  const dt = document.getElementById('darkToggle');
  if (dt) dt.checked = isDark;
}

/* ══════════════════════════════════════════════
   ENTER KEY
══════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('taskInput') === document.activeElement) addTask();
});

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
(async function init() {
  if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark');

  const saved = localStorage.getItem('savedEmail');
  if (saved) {
    const el = document.getElementById('loginEmail');
    if (el) el.value = saved;
  }

  // Re-enter dashboard if user is still stored (tab refresh)
  const user = getCurrentUser();
  if (user) {
    await enterDashboard();
  }
})();

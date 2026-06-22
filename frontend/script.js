/* ── DRAWER ──────────────────────────────────── */
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

/* ── PAGE ROUTING ────────────────────────────── */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function switchTab(tab) {
  ['dashboard','profile','settings'].forEach(t => {
    document.getElementById('tab-'+t).style.display = t===tab ? 'block' : 'none';
    ['nav-','dnav-','bnav-'].forEach(pre => {
      const el = document.getElementById(pre+t);
      if (el) el.classList.toggle('active', t===tab);
    });
  });
  if (tab==='profile') loadProfile();
  if (tab==='settings') syncSettingsUI();
  window.scrollTo(0,0);
}

/* ── TOAST ───────────────────────────────────── */
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ── REGISTER ────────────────────────────────── */
function doRegister() {
  const v = id => document.getElementById(id).value.trim();
  const name=v('regName'), email=v('regEmail'), username=v('regUsername'),
        pw=document.getElementById('regPassword').value,
        conf=document.getElementById('regConfirm').value;
  const err = document.getElementById('registerError');
  const suc = document.getElementById('registerSuccess');
  err.style.display='none'; suc.style.display='none';
  if (!name||!email||!username||!pw) { err.textContent='All fields are required.'; err.style.display='block'; return; }
  if (pw.length<6) { err.textContent='Password must be at least 6 characters.'; err.style.display='block'; return; }
  if (pw!==conf) { err.textContent='Passwords do not match.'; err.style.display='block'; return; }
  localStorage.setItem('user', JSON.stringify({name,email,username,password:pw}));
  suc.textContent='Account created! Redirecting…'; suc.style.display='block';
  setTimeout(()=>showPage('page-login'), 1400);
}

/* ── LOGIN ───────────────────────────────────── */
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');
  err.style.display='none';
  const stored = JSON.parse(localStorage.getItem('user'));
  if (stored && stored.email===email && stored.password===pw) {
    localStorage.setItem('loggedIn','true');
    if (document.getElementById('rememberMe').checked) localStorage.setItem('savedEmail',email);
    showPage('page-dashboard');
    renderTasks(); loadProfile(); updateStats(); syncSettingsUI();
  } else {
    err.textContent='Invalid email or password.'; err.style.display='block';
  }
}

/* ── FORGOT ──────────────────────────────────── */
function doForgot() {
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) return;
  const suc = document.getElementById('forgotSuccess');
  suc.textContent='If this email is registered, a reset link was sent.'; suc.style.display='block';
}

/* ── TASKS ───────────────────────────────────── */
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  updateStats();
}

function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) { showToast('Please enter a task!', 'error'); return; }
  tasks.unshift({ id: Date.now(), text, priority: document.getElementById('priority').value, dueDate: document.getElementById('dueDate').value, completed: false });
  saveTasks(); input.value=''; renderTasks(); showToast('Task added!');
}

function renderTasks() {
  const list = document.getElementById('taskList');
  if (!list) return;
  const q = (document.getElementById('searchTask')?.value||'').toLowerCase();
  const filtered = tasks.filter(t => {
    const ms = t.text.toLowerCase().includes(q);
    if (currentFilter==='all') return ms;
    if (currentFilter==='pending') return ms && !t.completed;
    if (currentFilter==='completed') return ms && t.completed;
    return ms && t.priority===currentFilter;
  });
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><div>No tasks found.<br>Add one above!</div></div>`;
    return;
  }
  list.innerHTML = filtered.map(t => {
    const due = t.dueDate ? `<span class="due-label">📅 ${t.dueDate}</span>` : '';
    return `<div class="task ${t.completed?'completed':''}">
      <div class="task-info">
        <strong>${esc(t.text)}</strong>
        <div class="task-meta">
          <span class="priority-badge priority-${t.priority}">${t.priority}</span>
          ${due}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-done ${t.completed?'is-done':''}" onclick="toggleTask(${t.id})">${t.completed?'↩️':'✓'}</button>
        <button class="btn-del" onclick="deleteTask(${t.id})">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toggleTask(id) {
  const t = tasks.find(t=>t.id===id);
  if (t) { t.completed=!t.completed; saveTasks(); renderTasks(); }
}

function deleteTask(id) {
  tasks = tasks.filter(t=>t.id!==id);
  saveTasks(); renderTasks(); showToast('Task deleted.');
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-bar button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function updateStats() {
  const total=tasks.length, done=tasks.filter(t=>t.completed).length;
  const pct = total===0?0:Math.round((done/total)*100);
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('totalTasks',total); set('completedTasks',done); set('pendingTasks',total-done); set('progressPercent',pct+'%');
}

/* ── PROFILE ─────────────────────────────────── */
function loadProfile() {
  const u = JSON.parse(localStorage.getItem('user')); if(!u) return;
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('profileName',u.name||''); set('profileEmail',u.email||'');
  const av=document.getElementById('profileAvatar');
  if (av) av.src=`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name||'U')}`;
  const nn=document.getElementById('newName'); if(nn) nn.value=u.name||'';
  const ne=document.getElementById('newEmail'); if(ne) ne.value=u.email||'';
}

function updateProfile() {
  const u = JSON.parse(localStorage.getItem('user'))||{};
  u.name = document.getElementById('newName').value.trim()||u.name;
  u.email = document.getElementById('newEmail').value.trim()||u.email;
  localStorage.setItem('user',JSON.stringify(u));
  loadProfile();
  const suc=document.getElementById('profileSuccess');
  suc.textContent='Profile updated!'; suc.style.display='block';
  setTimeout(()=>suc.style.display='none',2500);
  showToast('Profile updated!');
}

/* ── SETTINGS ────────────────────────────────── */
function syncSettingsUI() {
  const dt=document.getElementById('darkToggle'); if(dt) dt.checked=document.body.classList.contains('dark');
  const nt=document.getElementById('notifToggle'); if(nt) nt.checked=localStorage.getItem('notif')==='true';
}

function clearTasks() {
  if (!confirm('Delete all tasks? This cannot be undone.')) return;
  tasks=[]; saveTasks(); renderTasks(); showToast('All tasks deleted.','error');
}

function logout() {
  localStorage.removeItem('loggedIn');
  showPage('page-welcome');
  switchTab('dashboard');
  showToast('Logged out.');
}

function toggleNotif() {
  const on=document.getElementById('notifToggle').checked;
  localStorage.setItem('notif',on);
  if (on && Notification && Notification.permission==='default') Notification.requestPermission();
}

/* ── DARK MODE ───────────────────────────────── */
function toggleDark() {
  document.body.classList.toggle('dark');
  const isDark=document.body.classList.contains('dark');
  localStorage.setItem('darkMode',isDark);
  const dt=document.getElementById('darkToggle'); if(dt) dt.checked=isDark;
}

/* ── ENTER KEY ───────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key==='Enter' && document.getElementById('taskInput')===document.activeElement) addTask();
});

/* ── INIT ────────────────────────────────────── */
(function init() {
  if (localStorage.getItem('darkMode')==='true') document.body.classList.add('dark');
  const saved=localStorage.getItem('savedEmail');
  if (saved) { const el=document.getElementById('loginEmail'); if(el) el.value=saved; }
  if (localStorage.getItem('loggedIn')==='true') {
    showPage('page-dashboard');
    renderTasks(); loadProfile(); updateStats(); syncSettingsUI();
  }
})();
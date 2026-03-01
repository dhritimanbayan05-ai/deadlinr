// Dashboard Logic with User Switching and Functional Stats
let appData = null;      // populated async on load
let activeUser = null;   // set after appData is ready
let roastInterval = null;

async function saveData() {
  await StorageManager.save(appData);
}

// ========================================
// USER DASHBOARD SWITCHING
// ========================================

function initUserSwitcher() {
  const switcher = document.getElementById('user-switcher');
  const safeName = (n) => n.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  switcher.innerHTML = appData.users.map(user => `
    <div class="user-pill ${user.name === activeUser ? 'active' : ''}" 
         data-user="${safeName(user.name)}">
      <span class="user-pill-indicator"></span>${safeName(user.name)}
    </div>
  `).join('');

  // Event delegation — safe from XSS
  switcher.onclick = (e) => {
    const pill = e.target.closest('[data-user]');
    if (pill) switchUserDashboard(pill.dataset.user);
  };
}

function switchUserDashboard(userName) {
  if (userName === activeUser) return; // Already active

  const dashboardHero = document.getElementById('dashboard-hero');

  // Fade out with glassmorphism effect
  dashboardHero.classList.add('transitioning');

  setTimeout(() => {
    activeUser = userName;
    refreshDashboard();

    // Fade back in
    dashboardHero.classList.remove('transitioning');
  }, 350);
}

// ========================================
// STATS CALCULATIONS (FUNCTIONAL)
// ========================================

function calculateRealTimeStats() {
  const stats = {
    teamMomentum: calculateTeamMomentum(appData.users),
    rivalLeader: getRivalLeader(),
    roast: generateDynamicRoast()
  };
  return stats;
}

function getRivalLeader() {
  // Rank users by streak + today's completion rate
  const todayStr = new Date().toISOString().split('T')[0];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()];
  let leaderData = { name: null, role: null, score: -1 };

  appData.users.forEach(user => {
    // Count today's tasks and check-ins
    let todayTotal = 0, todayChecked = 0;
    Object.keys(user.timetable || {}).forEach(key => {
      const hyphenIdx = key.indexOf('-');
      if (key.substring(0, hyphenIdx) === todayName) {
        todayTotal++;
        if (user.checkIns && user.checkIns[todayStr] && user.checkIns[todayStr][key]) {
          todayChecked++;
        }
      }
    });

    const completionRate = todayTotal > 0 ? todayChecked / todayTotal : 0;
    const score = (user.streak * 2) + (completionRate * 10) + todayChecked;

    if (score > leaderData.score) {
      leaderData = { name: user.name, role: user.role, score };
    }
  });

  return leaderData.name ? `${leaderData.name} (${leaderData.role})` : 'No Leader';
}

function calculateDaysUntilReset() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  // Monday = 1, so: Mon→0, Tue→6, Wed→5, Thu→4, Fri→3, Sat→2, Sun→1
  const daysUntilMonday = (8 - dayOfWeek) % 7;
  return daysUntilMonday;
}

function generateDynamicRoast() {
  // Find user with worst performance today (lowest check-in rate + lowest streak)
  const todayStr = new Date().toISOString().split('T')[0];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()];

  let worstUser = null;
  let worstScore = Infinity;

  appData.users.forEach(user => {
    let todayTotal = 0, todayChecked = 0;
    Object.keys(user.timetable || {}).forEach(key => {
      const hyphenIdx = key.indexOf('-');
      if (key.substring(0, hyphenIdx) === todayName) {
        todayTotal++;
        if (user.checkIns && user.checkIns[todayStr] && user.checkIns[todayStr][key]) {
          todayChecked++;
        }
      }
    });

    const missed = todayTotal - todayChecked;
    const score = todayChecked + (user.streak * 2) - (missed * 3);

    if (score < worstScore) {
      worstScore = score;
      worstUser = { ...user, todayTotal, todayChecked, missed };
    }
  });

  if (!worstUser) return "Everyone's crushing it today!";

  const { name, role, streak, todayTotal, todayChecked, missed } = worstUser;
  const pct = todayTotal > 0 ? Math.round((todayChecked / todayTotal) * 100) : 0;

  const roasts = [
    missed > 0 ? `${name} missed ${missed} task${missed > 1 ? 's' : ''} today. The tribunal watches.` : `${name} is clear... for now.`,
    `${name}'s streak is ${streak}. ${streak === 0 ? 'Pathetic.' : streak < 3 ? 'Barely alive.' : 'Decent, but not enough.'}`,
    `The ${role} is at ${pct}% today. ${pct < 50 ? 'Unacceptable.' : pct < 100 ? 'Could do better.' : 'Impressive.'}`,
    missed > 2 ? `${name} left ${missed} tasks undone. Fraud detected. 🚨` : `${name}, where's the hustle? 🤔`,
    `Momentum check: ${name} has ${todayChecked}/${todayTotal} today. ${todayChecked === 0 ? 'Ghost mode activated.' : 'Keep pushing.'}`
  ];

  return roasts[Math.floor(Math.random() * roasts.length)];
}

function updateStatsDisplay() {
  const stats = calculateRealTimeStats();

  // Team Momentum
  document.getElementById('team-momentum').textContent = stats.teamMomentum;

  // Rival Mode
  document.getElementById('rival-leader').textContent = stats.rivalLeader;
  const resetDays = calculateDaysUntilReset();
  document.getElementById('rival-reset').textContent = resetDays === 0 ? 'Resets today!' : `Reset in ${resetDays} day${resetDays !== 1 ? 's' : ''}`;

  // Roast Feed (initial)
  document.getElementById('roast-text').textContent = `"${stats.roast}"`;
}

function startRoastRotation() {
  // Rotate roasts every 10 seconds
  if (roastInterval) clearInterval(roastInterval);

  roastInterval = setInterval(() => {
    const roast = generateDynamicRoast();
    document.getElementById('roast-text').textContent = `"${roast}"`;
  }, 10000);
}

// ========================================
// TASK MANAGEMENT
// ========================================

function initDashboardControls() {
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskNameInput = document.getElementById('task-name-input');

  addTaskBtn.addEventListener('click', addTaskToDashboard);

  // Allow Enter key to add task
  taskNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTaskToDashboard();
    }
  });
}

function addTaskToDashboard() {
  // Ownership check: only allow adding tasks to your own dashboard
  const loggedInUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
  if (activeUser !== loggedInUser) return;

  const taskName = document.getElementById('task-name-input').value.trim();
  const taskType = document.getElementById('task-type-select').value;
  const taskDay = document.getElementById('task-day-select').value;
  const taskTime = document.getElementById('task-time-select').value;

  if (!taskName) {
    alert('Please enter a task name');
    return;
  }

  // Find active user
  const user = appData.users.find(u => u.name === activeUser);
  if (!user) return;

  // Create timetable key
  const timetableKey = `${taskDay}-${taskTime}`;

  // Add to timetable
  if (!user.timetable) user.timetable = {};
  user.timetable[timetableKey] = {
    name: taskName,
    type: taskType
  };

  // Save and refresh
  saveData();
  refreshDashboard();

  // Clear input
  document.getElementById('task-name-input').value = '';

  // Show success feedback
  const addBtn = document.getElementById('add-task-btn');
  const originalText = addBtn.textContent;
  addBtn.textContent = '✓ Added!';
  addBtn.style.background = 'rgba(34, 197, 94, 0.3)';

  setTimeout(() => {
    addBtn.textContent = originalText;
    addBtn.style.background = '';
  }, 1500);
}

function markTaskDone(timetableKey) {
  // Ownership check: only owner can toggle check-ins
  const loggedInUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
  if (activeUser !== loggedInUser) return;

  const user = appData.users.find(u => u.name === activeUser);
  if (!user) return;

  // Initialize checkIns if missing
  if (!user.checkIns) user.checkIns = {};
  const todayStr = new Date().toISOString().split('T')[0];
  if (!user.checkIns[todayStr]) user.checkIns[todayStr] = {};

  // Toggle check-in
  const isCurrentlyDone = user.checkIns[todayStr][timetableKey] === true;
  user.checkIns[todayStr][timetableKey] = !isCurrentlyDone;

  saveData();
  renderTodayTasks();
  updateStatsDisplay();
}

// ========================================
// DASHBOARD DISPLAY
// ========================================

function renderTodayTasks() {
  const user = appData.users.find(u => u.name === activeUser);
  if (!user) return;

  const todayTasks = getNextTasks(user, 50); // Get all tasks for today
  const container = document.getElementById('today-tasks-list');

  if (todayTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-text">No tasks scheduled for today</div>
      </div>
    `;
    return;
  }

  // Get today's check-in data
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckIns = (user.checkIns && user.checkIns[todayStr]) || {};

  const loggedInUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
  const isOwner = (activeUser === loggedInUser);

  container.innerHTML = todayTasks.map(task => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[new Date().getDay()];
    const timetableKey = `${currentDay}-${task.time}`;
    const isDone = todayCheckIns[timetableKey] === true;

    return `
      <div class="dashboard-task-item fade-in ${isDone ? 'task-done' : ''}" data-task-key="${timetableKey}">
        <div class="task-info">
          <span class="task-time">${task.time}</span>
          <span class="task-name" style="${isDone ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${task.name}</span>
          <span class="task-type-badge task-${task.type}">${task.type}</span>
        </div>
        <div class="task-actions">
          ${isOwner ? `<button class="task-action-btn done" style="${isDone ? 'background: rgba(16,185,129,0.3); color: #10b981; pointer-events: auto;' : 'pointer-events: auto;'}" onclick="markTaskDone('${timetableKey}');">
            ${isDone ? 'Undo' : 'Done'}
          </button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function refreshDashboard() {
  // Update user switcher
  initUserSwitcher();

  // Update dashboard title with active user
  const user = appData.users.find(u => u.name === activeUser);
  if (user) {
    document.getElementById('dashboard-title').textContent = `${user.name}'s Dashboard`;
    document.getElementById('user-streak').textContent = user.streak;
    document.getElementById('user-momentum').textContent = calculateMomentum(
      Object.keys(user.timetable || {}).length > 0 ? Math.min(user.streak * 15, 100) : 0,
      user.streak
    );
  }

  // Render today's tasks for active user
  renderTodayTasks();

  // Update stats
  updateStatsDisplay();

  // Enforce frontend restrictions
  const loggedInUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
  const isOwner = (activeUser === loggedInUser);
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskInputs = document.querySelectorAll('.task-form input, .task-form select');

  if (addTaskBtn) {
    if (isOwner) {
      addTaskBtn.style.display = 'block';
      taskInputs.forEach(input => input.disabled = false);
    } else {
      addTaskBtn.style.display = 'none';
      taskInputs.forEach(input => input.disabled = true);
    }
  }
}

function initDashboard() {
  // Set default day to today
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  document.getElementById('task-day-select').value = today;

  // Initialize controls
  initDashboardControls();

  // Initial render
  refreshDashboard();

  // Start roast rotation
  startRoastRotation();
}

// Run on page load (async bootstrap)
document.addEventListener('DOMContentLoaded', async () => {
  appData = await StorageManager.load();

  // Determine active user after data is loaded
  if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
    activeUser = AuthManager.getCurrentUser();
  } else {
    activeUser = appData.users[0].name;
  }

  initDashboard();
});

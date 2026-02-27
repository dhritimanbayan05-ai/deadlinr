// Dashboard Logic with User Switching and Functional Stats
let appData = StorageManager.load();

// Check if user is logged in via auth system
let activeUser = null;
if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
  activeUser = AuthManager.getCurrentUser();
} else {
  activeUser = appData.users[0].name; // Default to first user if not logged in
}

let roastInterval = null;

function saveData() {
  StorageManager.save(appData);
}

// ========================================
// USER DASHBOARD SWITCHING
// ========================================

function initUserSwitcher() {
  const switcher = document.getElementById('user-switcher');
  switcher.innerHTML = appData.users.map(user => `
    <div class="user-pill ${user.name === activeUser ? 'active' : ''}" 
         onclick="switchUserDashboard('${user.name}')">
      <span class="user-pill-indicator"></span>${user.name}
    </div>
  `).join('');
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
  }, 200);
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
  let leaderData = { name: null, role: null, count: 0 };

  appData.users.forEach(user => {
    // Count tasks in timetable
    const taskCount = Object.keys(user.timetable || {}).length;

    if (taskCount > leaderData.count) {
      leaderData = {
        name: user.name,
        role: user.role,
        count: taskCount
      };
    }
  });

  return leaderData.name ? `${leaderData.name} (${leaderData.role})` : 'No Leader';
}

function calculateDaysUntilReset() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  return daysUntilMonday;
}

function generateDynamicRoast() {
  // Find user with lowest task count or broken streak
  let targetUser = null;
  let lowestScore = Infinity;

  appData.users.forEach(user => {
    const taskCount = Object.keys(user.timetable || {}).length;
    const score = taskCount + (user.streak * 2);

    if (score < lowestScore) {
      lowestScore = score;
      targetUser = user;
    }
  });

  if (!targetUser) return "Everyone's crushing it today!";

  const roasts = [
    `${targetUser.name} has ${Object.keys(targetUser.timetable || {}).length} tasks. The tribunal is watching.`,
    `Momentum alert: ${targetUser.name} needs to step it up.`,
    `${targetUser.name}'s streak is ${targetUser.streak}. Not impressive.`,
    `The ${targetUser.role} is falling behind. Unacceptable.`,
    `${targetUser.name}, where's the hustle? 🤔`
  ];

  return roasts[Math.floor(Math.random() * roasts.length)];
}

function updateStatsDisplay() {
  const stats = calculateRealTimeStats();

  // Team Momentum
  document.getElementById('team-momentum').textContent = stats.teamMomentum;

  // Rival Mode
  document.getElementById('rival-leader').textContent = stats.rivalLeader;
  document.getElementById('rival-reset').textContent = `Reset in ${calculateDaysUntilReset()} days`;

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

  const todayTasks = getNextTasks(user, 10); // Get all tasks for today
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
          <button class="task-action-btn done" style="${isDone ? 'background: rgba(16,185,129,0.3); color: #10b981;' : ''}" onclick="markTaskDone('${timetableKey}')">
            ${isDone ? 'Undo' : 'Done'}
          </button>
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
    document.getElementById('user-momentum').textContent = Math.min(user.streak * 10, 100);
  }

  // Render today's tasks for active user
  renderTodayTasks();

  // Update stats
  updateStatsDisplay();
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

// Run on page load
document.addEventListener('DOMContentLoaded', initDashboard);

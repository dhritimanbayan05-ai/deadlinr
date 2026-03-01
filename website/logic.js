// ═══════════════════════════════════════════════════════════════
// Storage Manager  –– MongoDB-backed with localStorage fallback
// ═══════════════════════════════════════════════════════════════
const StorageManager = {
    STORAGE_KEY: 'protocol_data',
    MIGRATED_KEY: 'protocol_migrated_to_mongo',
    DATA_VERSION: 3,
    API_BASE: '/api',          // relative URL – works when served by the backend

    // ── Default seed data ──────────────────────────────────────
    getDefaultData() {
        return {
            _version: this.DATA_VERSION,
            users: [
                {
                    name: 'Prayash',
                    role: 'Coder OP',
                    age: 20,
                    dob: '2004-03-15',
                    collegeStartDate: '2022-07-01',
                    gapYears: 0,
                    streak: 0,
                    tasks: [],
                    checkIns: {},
                    isWeekLocked: false,
                    weekPlan: null,
                    timetable: {}
                },
                {
                    name: 'Piyush',
                    role: 'Singer OP',
                    age: 19,
                    dob: '2005-08-20',
                    collegeStartDate: '2023-07-01',
                    gapYears: 0,
                    streak: 0,
                    tasks: [],
                    checkIns: {},
                    isWeekLocked: false,
                    weekPlan: null,
                    timetable: {}
                },
                {
                    name: 'Dhritiman',
                    role: 'Writer OP',
                    age: 20,
                    dob: '2004-11-10',
                    collegeStartDate: '2023-07-01',
                    gapYears: 1,
                    streak: 0,
                    tasks: [],
                    checkIns: {},
                    isWeekLocked: false,
                    weekPlan: null,
                    timetable: {}
                },
                {
                    name: 'Kallul',
                    role: 'Gamer OP',
                    age: 20,
                    dob: '2004-06-25',
                    collegeStartDate: '2022-07-01',
                    gapYears: 0,
                    streak: 0,
                    tasks: [],
                    checkIns: {},
                    isWeekLocked: false,
                    weekPlan: null,
                    timetable: {}
                },
                {
                    name: 'Hirak',
                    role: 'Artist OP',
                    age: 20,
                    dob: '2004-09-12',
                    collegeStartDate: '2022-07-01',
                    gapYears: 0,
                    streak: 0,
                    tasks: [],
                    checkIns: {},
                    isWeekLocked: false,
                    weekPlan: null,
                    timetable: {}
                }
            ],
            votes: [],
            weekStartDate: new Date().toISOString()
        };
    },

    // ── Schema migration helper (applied after load) ───────────
    _migrate(data) {
        if (!data._version || data._version < this.DATA_VERSION) {
            const defaults = this.getDefaultData();
            const existingNames = data.users.map(u => u.name);
            defaults.users.forEach(du => {
                if (!existingNames.includes(du.name)) data.users.push(du);
            });
            data.users.forEach(u => {
                if (!u.checkIns) u.checkIns = {};
                if (u.isWeekLocked === undefined) u.isWeekLocked = false;
                if (!u.weekPlan) u.weekPlan = null;
            });
            data._version = this.DATA_VERSION;
        }
        return data;
    },

    // ── Load from backend; fall back to localStorage ───────────
    async load() {
        try {
            // First check if we need to migrate localStorage → MongoDB
            await this._maybeUploadLocalData();

            const res = await fetch(`${this.API_BASE}/data`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!data || !data.users) throw new Error('Invalid payload');
            const migrated = this._migrate(data);
            pruneOldCheckIns(migrated);
            updateStreaks(migrated);
            return migrated;
        } catch (err) {
            console.warn('[StorageManager] Backend unavailable, using localStorage:', err.message);
            const local = this._loadLocal();
            pruneOldCheckIns(local);
            updateStreaks(local);
            return local;
        }
    },

    // ── Save to backend; also keep localStorage in sync ────────
    async save(data) {
        // Always keep localStorage in sync as a fallback cache
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

        let headers = { 'Content-Type': 'application/json' };
        if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
            headers['x-user-name'] = AuthManager.getCurrentUser();
        }

        try {
            const res = await fetch(`${this.API_BASE}/data`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (err) {
            console.warn('[StorageManager] Save to backend failed (kept in localStorage):', err.message);
        }
    },

    // ── Reset (dev utility) ────────────────────────────────────
    async reset() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.MIGRATED_KEY);
        try {
            await fetch(`${this.API_BASE}/data`, { method: 'DELETE' });
        } catch (_) { }
        return this.getDefaultData();
    },

    // ── Internal: localStorage fallback ───────────────────────
    _loadLocal() {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : this.getDefaultData();
        return this._migrate(data);
    },

    // ── One-time migration: push localStorage → MongoDB ───────
    async _maybeUploadLocalData() {
        if (localStorage.getItem(this.MIGRATED_KEY)) return; // already done
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (!raw) { localStorage.setItem(this.MIGRATED_KEY, '1'); return; }

        try {
            // Only upload if backend has no data yet
            const check = await fetch(`${this.API_BASE}/data`);
            if (!check.ok) return;
            const existing = await check.json();

            if (!existing.users || existing.users.length === 0) {
                console.log('[StorageManager] Migrating localStorage data to MongoDB…');
                const local = JSON.parse(raw);
                await fetch(`${this.API_BASE}/data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(local)
                });
            }
            localStorage.setItem(this.MIGRATED_KEY, '1');
            console.log('[StorageManager] Migration complete.');
        } catch (err) {
            console.warn('[StorageManager] Migration skipped:', err.message);
        }
    }
};

// Gamification Logic
function calculateMomentum(completionRate, streak) {
    const streakFactor = Math.min(streak / 30, 1) * 100;
    const momentum = (completionRate * 0.7) + (streakFactor * 0.3);
    return Math.round(momentum);
}

function calculateTeamMomentum(users) {
    const todayStr = new Date().toISOString().split('T')[0];
    const DAYS_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = DAYS_LIST[new Date().getDay()];

    let totalTasks = 0;
    let totalChecked = 0;
    let avgStreak = 0;

    users.forEach(user => {
        // Count today's tasks and check-ins from the timetable
        Object.keys(user.timetable || {}).forEach(key => {
            const hyphenIdx = key.indexOf('-');
            if (key.substring(0, hyphenIdx) === todayName) {
                totalTasks++;
                if (user.checkIns && user.checkIns[todayStr] && user.checkIns[todayStr][key]) {
                    totalChecked++;
                }
            }
        });
        avgStreak += user.streak;
    });

    avgStreak = users.length > 0 ? avgStreak / users.length : 0;
    const completionRate = totalTasks > 0 ? (totalChecked / totalTasks) * 100 : 0;

    return calculateMomentum(completionRate, avgStreak);
}

function generateRoast(userName) {
    const roasts = [
        `${userName} was caught lacking. The tribunal is disappointed.`,
        `Momentum dropped. ${userName} is failing the mission.`,
        `Fraud detected. ${userName} tried to cheat the system.`,
        `Alert: ${userName} missed a checkpoint. Shame mode activated.`
    ];
    return roasts[Math.floor(Math.random() * roasts.length)];
}

// ── Streak Calculator ──────────────────────────────────────────
// Updates user.streak based on consecutive days with ≥1 check-in
function updateStreaks(data) {
    const DAYS_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    data.users.forEach(user => {
        if (!user.timetable || !user.checkIns) {
            user.streak = 0;
            return;
        }

        let streak = 0;
        const today = new Date();

        // Walk backwards from yesterday (today is still in progress)
        for (let d = 1; d <= 365; d++) {
            const date = new Date(today);
            date.setDate(today.getDate() - d);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = DAYS_LIST[date.getDay()];

            // Count how many tasks were scheduled for that day
            let totalTasks = 0;
            Object.keys(user.timetable).forEach(key => {
                const hyphenIdx = key.indexOf('-');
                const keyDay = key.substring(0, hyphenIdx);
                if (keyDay === dayName) totalTasks++;
            });

            if (totalTasks === 0) continue; // No tasks = skip (don't break streak)

            // Count how many were checked in
            const dayCheckIns = user.checkIns[dateStr] || {};
            let checked = 0;
            Object.keys(user.timetable).forEach(key => {
                const hyphenIdx = key.indexOf('-');
                const keyDay = key.substring(0, hyphenIdx);
                if (keyDay === dayName && dayCheckIns[key]) checked++;
            });

            if (checked > 0) {
                streak++;
            } else {
                break; // Streak broken
            }
        }

        user.streak = streak;
    });
}

// ── CheckIns Pruner ────────────────────────────────────────────
// Remove check-in entries older than maxDays (default 60)
function pruneOldCheckIns(data, maxDays = 60) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    data.users.forEach(user => {
        if (!user.checkIns) return;
        Object.keys(user.checkIns).forEach(dateStr => {
            if (dateStr < cutoffStr) {
                delete user.checkIns[dateStr];
            }
        });
    });
}

// Scheduler Logic
function isEditAllowed(editCredits, currentDate = new Date()) {
    const dayOfMonth = currentDate.getDate();

    const isStartOfMonth = dayOfMonth <= 3;
    const isThirdWeek = dayOfMonth >= 15 && dayOfMonth <= 21;

    if (isStartOfMonth || isThirdWeek) {
        return { allowed: true, reason: 'Scheduled Window' };
    }

    if (editCredits > 0) {
        return { allowed: true, reason: 'Credit Available', consumeCredit: true };
    }

    return { allowed: false, reason: 'Locked Mode' };
}

// Life Weeks Calculator
function calculateLifeWeeks(age) {
    const TOTAL_WEEKS = 80 * 52; // Assuming 80-year lifespan
    const weeksLived = age * 52;
    const currentWeek = weeksLived;
    const weeksRemaining = TOTAL_WEEKS - weeksLived;

    return {
        total: TOTAL_WEEKS,
        lived: weeksLived,
        current: currentWeek,
        remaining: weeksRemaining
    };
}

// Timetable Helper
function getNextTasks(user, limit = 3) {
    if (!user.timetable) return [];

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDayIndex = now.getDay(); // 0 = Sunday
    const currentDay = days[currentDayIndex];
    const currentHour = now.getHours();

    const tasks = [];

    // Parse timetable keys
    Object.keys(user.timetable).forEach(key => {
        const hyphenIdx = key.indexOf('-');
        const day = key.substring(0, hyphenIdx);
        const timeStr = key.substring(hyphenIdx + 1);
        if (day !== currentDay) return;

        // Convert timeStr (e.g., "9 AM", "12 PM") to 24h number
        let time = 0;
        const [hourStr, period] = timeStr.split(' ');
        let hour = parseInt(hourStr);

        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;

        let taskData = user.timetable[key];
        let name = typeof taskData === 'string' ? taskData : taskData.name;
        let type = typeof taskData === 'string' ? 'other' : taskData.type;

        tasks.push({
            time: timeStr,
            hour24: hour, // for sorting
            name: name,
            type: type
        });
    });

    // Sort by time and take top 'limit'
    return tasks.sort((a, b) => a.hour24 - b.hour24).slice(0, limit);
}

// Detailed Life Weeks Calculator with Timeline
function calculateDetailedLifeWeeks(dob, collegeStartDate, gapYears) {
    const TOTAL_WEEKS = 80 * 52;
    const WEEKS_PER_YEAR = 52;

    const birthDate = new Date(dob);
    const now = new Date();
    const collegeStart = new Date(collegeStartDate);

    // Calculate age in years (decimal)
    const ageInMs = now - birthDate;
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
    const weeksLived = Math.floor(ageInYears * WEEKS_PER_YEAR);

    // Calculate school end (age 18)
    const schoolEndDate = new Date(birthDate);
    schoolEndDate.setFullYear(birthDate.getFullYear() + 18);
    const schoolWeeks = 18 * WEEKS_PER_YEAR;

    // Calculate gap period
    const gapWeeks = gapYears * WEEKS_PER_YEAR;
    const gapEndWeek = schoolWeeks + gapWeeks;

    // Calculate college start week
    const collegeStartMs = collegeStart - birthDate;
    const collegeStartWeek = Math.floor(collegeStartMs / (1000 * 60 * 60 * 24 * 7));

    return {
        total: TOTAL_WEEKS,
        lived: weeksLived,
        current: weeksLived,
        remaining: TOTAL_WEEKS - weeksLived,
        schoolWeeks: schoolWeeks,
        gapStartWeek: schoolWeeks,
        gapEndWeek: gapEndWeek,
        collegeStartWeek: Math.max(collegeStartWeek, gapEndWeek)
    };
}

// ========================================
// CHECK-IN & HABIT TRACKING HELPERS
// ========================================

// Get today's date string in YYYY-MM-DD format
function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

// Get the ISO week start date (Monday) for a given date
function getWeekStartStr(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    return d.toISOString().split('T')[0];
}

// Get the current day name
function getCurrentDayName() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
}

// Calculate productivity for a specific day from check-ins
function calculateDayProductivity(user, dateStr) {
    if (!user.checkIns || !user.checkIns[dateStr]) return { total: 0, checked: 0, rate: 0 };

    const dayCheckIns = user.checkIns[dateStr];
    const dayName = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });

    // Count planned tasks for that day
    let totalTasks = 0;
    let checkedTasks = 0;

    Object.keys(user.timetable || {}).forEach(key => {
        if (key.startsWith(dayName + '-')) {
            totalTasks++;
            if (dayCheckIns[key]) checkedTasks++;
        }
    });

    return {
        total: totalTasks,
        checked: checkedTasks,
        rate: totalTasks > 0 ? Math.round((checkedTasks / totalTasks) * 100) : 0
    };
}

// Get the past N days as date strings
function getPastDays(n) {
    const dates = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

// Calculate weekly check-in streak (consecutive days with >0 check-ins)
function calculateCheckInStreak(user) {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData = user.checkIns ? user.checkIns[dateStr] : null;

        if (dayData && Object.values(dayData).some(v => v === true)) {
            streak++;
        } else if (i > 0) {
            break; // streak broken
        }
    }

    return streak;
}

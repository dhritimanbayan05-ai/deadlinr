// Storage Manager
const StorageManager = {
    STORAGE_KEY: 'protocol_data',
    DATA_VERSION: 3, // Bump this when default users or schema change

    load() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return this.getDefaultData();

        const parsed = JSON.parse(data);

        // Auto-migrate: add any missing users and fields from defaults
        if (!parsed._version || parsed._version < this.DATA_VERSION) {
            const defaults = this.getDefaultData();
            const existingNames = parsed.users.map(u => u.name);

            // Add missing users
            defaults.users.forEach(defaultUser => {
                if (!existingNames.includes(defaultUser.name)) {
                    parsed.users.push(defaultUser);
                }
            });

            // Patch existing users with new fields
            parsed.users.forEach(user => {
                if (!user.checkIns) user.checkIns = {};
                if (user.isWeekLocked === undefined) user.isWeekLocked = false;
                if (!user.weekPlan) user.weekPlan = null;
            });

            parsed._version = this.DATA_VERSION;
            this.save(parsed);
        }

        return parsed;
    },

    save(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

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
                    timetable: {
                        'Monday-9 AM': { name: 'Deep Work', type: 'work' },
                        'Monday-11 AM': { name: 'Team Sync', type: 'work' },
                        'Monday-5 PM': { name: 'Gym', type: 'gym' },
                        'Tuesday-9 AM': { name: 'Code Review', type: 'work' },
                        'Tuesday-6 PM': { name: 'Running', type: 'gym' }
                    }
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
                    timetable: {
                        'Monday-10 AM': { name: 'Vocal Warmup', type: 'work' },
                        'Monday-2 PM': { name: 'Recording', type: 'work' },
                        'Monday-9 PM': { name: 'Chill Stream', type: 'fun' }
                    }
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
                    timetable: {
                        'Monday-8 AM': { name: 'Morning Pages', type: 'work' },
                        'Monday-1 PM': { name: 'Editing', type: 'work' },
                        'Monday-10 PM': { name: 'Reading', type: 'sleep' }
                    }
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
                    timetable: {
                        'Monday-10 AM': { name: 'Strategy Session', type: 'work' },
                        'Monday-3 PM': { name: 'Practice Rounds', type: 'fun' },
                        'Monday-7 PM': { name: 'Gym', type: 'gym' }
                    }
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
                    timetable: {
                        'Monday-9 AM': { name: 'Sketch Session', type: 'work' },
                        'Monday-2 PM': { name: 'Digital Art', type: 'work' },
                        'Monday-8 PM': { name: 'Portfolio Review', type: 'work' }
                    }
                }
            ],
            votes: [],
            weekStartDate: new Date().toISOString()
        };
    },

    reset() {
        localStorage.removeItem(this.STORAGE_KEY);
        return this.getDefaultData();
    }
};

// Gamification Logic
function calculateMomentum(completionRate, streak) {
    const streakFactor = Math.min(streak / 30, 1) * 100;
    const momentum = (completionRate * 0.7) + (streakFactor * 0.3);
    return Math.round(momentum);
}

function calculateTeamMomentum(users) {
    let totalTasks = 0;
    let totalCompleted = 0;
    let avgStreak = 0;

    users.forEach(user => {
        totalTasks += user.tasks.length;
        totalCompleted += user.tasks.filter(t => t.completed).length;
        avgStreak += user.streak;
    });

    avgStreak = avgStreak / users.length;
    const completionRate = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

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
        const [day, timeStr] = key.split('-');
        if (day !== currentDay) return;

        // Convert timeStr (e.g., "9 AM", "12 PM") to 24h number
        let time = 0;
        const [hourStr, period] = timeStr.split(' ');
        let hour = parseInt(hourStr);

        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;

        if (hour >= currentHour) {
            let taskData = user.timetable[key];
            let name = typeof taskData === 'string' ? taskData : taskData.name;
            let type = typeof taskData === 'string' ? 'other' : taskData.type;

            tasks.push({
                time: timeStr,
                hour24: hour, // for sorting
                name: name,
                type: type
            });
        }
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

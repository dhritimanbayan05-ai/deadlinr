const mongoose = require('mongoose');

// Timetable is a flexible map of slot-key => { name, type }
const TimetableSchema = new mongoose.Schema({}, { strict: false });

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    role: { type: String, default: '' },
    age: { type: Number, default: 0 },
    dob: { type: String, default: '' },
    collegeStartDate: { type: String, default: '' },
    gapYears: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    tasks: { type: Array, default: [] },
    // checkIns: { "YYYY-MM-DD": { "Day-Slot": true/false } }
    checkIns: { type: mongoose.Schema.Types.Mixed, default: {} },
    isWeekLocked: { type: Boolean, default: false },
    weekPlan: { type: mongoose.Schema.Types.Mixed, default: null },
    // timetable: { "Day-Slot": { name, type } }
    timetable: { type: mongoose.Schema.Types.Mixed, default: {} },
});

// Top-level document — one per app instance / group
const AppDataSchema = new mongoose.Schema({
    _version: { type: Number, default: 3 },
    users: [UserSchema],
    votes: { type: Array, default: [] },
    weekStartDate: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

module.exports = mongoose.model('AppData', AppDataSchema);

const mongoose = require('mongoose');

// Top-level document — one per app instance / group
const AppDataSchema = new mongoose.Schema({
    _version: { type: Number, default: 4 },
    payload: { type: Buffer },
    // Legacy fields for seamless migration (we don't strictly enforce them anymore, but needed if reading old data)
    users: { type: mongoose.Schema.Types.Mixed },
    votes: { type: mongoose.Schema.Types.Mixed },
    weekStartDate: { type: String }
}, { timestamps: { createdAt: false, updatedAt: true }, versionKey: false, minimize: true, strict: false });

module.exports = mongoose.model('AppData', AppDataSchema);

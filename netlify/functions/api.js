// ═══════════════════════════════════════════════════════════════
// Netlify Serverless Function — wraps the Express app
// ═══════════════════════════════════════════════════════════════
const serverless = require('serverless-http');
const app = require('../../backend/server');

module.exports.handler = serverless(app);

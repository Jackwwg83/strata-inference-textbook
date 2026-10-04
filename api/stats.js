'use strict';
const { handleStats } = require('../lib/analytics.cjs');
const { getDb } = require('../lib/db.cjs');

module.exports = async (req, res) => {
  try {
    const r = await handleStats(req, { db: getDb(), token: process.env.ADMIN_TOKEN });
    if (r.body) res.status(r.status).json(r.body);
    else res.status(r.status).end();
  } catch (err) {
    console.error('stats failed:', err.message);
    res.status(500).json({ error: 'stats failed' });
  }
};

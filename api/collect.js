'use strict';
const { handleCollect } = require('../lib/analytics.cjs');
const { getDb } = require('../lib/db.cjs');

module.exports = async (req, res) => {
  try {
    const r = await handleCollect(req, { db: getDb(), salt: process.env.ANALYTICS_SALT });
    res.status(r.status).end();
  } catch (err) {
    console.error('collect failed:', err.message);
    res.status(500).end();
  }
};

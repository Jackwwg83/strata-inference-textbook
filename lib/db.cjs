'use strict';
// Neon Postgres over HTTP, adapted to the `query(text, params) -> rows` shape used by lib/analytics.cjs.
const { neon } = require('@neondatabase/serverless');

let db = null;

function getDb() {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  const sql = neon(url);
  db = { query: (text, params) => sql.query(text, params) };
  return db;
}

module.exports = { getDb };

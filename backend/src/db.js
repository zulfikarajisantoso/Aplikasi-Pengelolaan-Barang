const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // eslint-disable-next-line no-console
  console.warn('[db] DATABASE_URL is not set - the API will fail on first query.');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] unexpected error on idle client', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query('SELECT * FROM stalls');
    console.log("Stalls in DB:", res.rows);
  } catch (err) {
    console.error("Database query failed:", err.message);
  } finally {
    await pool.end();
  }
}

check();

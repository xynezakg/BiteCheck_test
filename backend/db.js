const { Pool } = require('pg');

// Render INTERNAL connections do NOT support SSL.
// Render EXTERNAL connections REQUIRE SSL.
// This safely checks if you are using an external URL (.render.com)
const isExternal = process.env.PGHOST && process.env.PGHOST.includes('render.com');
const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
    connectionString
        ? {
              connectionString,
              ssl: { rejectUnauthorized: false }
          }
        : {
              host: process.env.PGHOST || 'localhost',
              port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
              user: process.env.PGUSER,
              password: process.env.PGPASSWORD,
              database: process.env.PGDATABASE,
              ssl: isExternal ? { rejectUnauthorized: false } : false
          }
);

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                ua_id VARCHAR(50) UNIQUE NOT NULL, 
                full_name VARCHAR(100) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'student', 
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS feedbacks (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(100),
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                signature TEXT NOT NULL,
                public_key TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS attachment TEXT;`);
        await pool.query(`ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS is_quarantined BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`);

         await pool.query(`
            CREATE TABLE IF NOT EXISTS stalls (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
        `);
        
        // Add the image column to the database
        await pool.query(`ALTER TABLE stalls ADD COLUMN IF NOT EXISTS image TEXT;`);
        await pool.query(`ALTER TABLE stalls ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;`);
        await pool.query(`ALTER TABLE stalls ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE stalls ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);`);

        // Academic level column for JHS / SHS / College routing
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_level VARCHAR(20);`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;`);

        // Canteen group column for stalls (highschool | college | null = general)
        await pool.query(`ALTER TABLE stalls ADD COLUMN IF NOT EXISTS canteen_group VARCHAR(20);`);

        console.log("✅ Database initialized: 'users', 'feedbacks', and 'stalls' tables are ready.");

    } catch (err) {
        console.error("❌ Failed to create table:", err.message);
    }
}

initDB();

const addFeedback = async ({ user_id, customer_name, rating, comment, signature, public_key, attachment }) => {
    const query = `
        INSERT INTO feedbacks (user_id, customer_name, rating, comment, signature, public_key, attachment)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at
    `;
    const values = [user_id, customer_name, rating, comment, signature, public_key, attachment];
    const res = await pool.query(query, values);
    return res.rows[0];
};

async function getAllFeedback() {
    const result = await pool.query(`SELECT * FROM feedbacks ORDER BY created_at DESC`);
    return result.rows;
}

async function getFeedbackPhoto(id) {
    const result = await pool.query(`SELECT attachment FROM feedbacks WHERE id = $1`, [id]);
    return result.rows[0];
}

async function quarantineFeedback(id) {
    await pool.query("UPDATE feedbacks SET is_quarantined = TRUE WHERE id = $1", [id]);
}

async function deleteFeedback(id) {
    await pool.query("DELETE FROM feedbacks WHERE id = $1", [id]);
}

async function getAllStalls() {
    const result = await pool.query(`SELECT * FROM stalls ORDER BY name ASC`);
    return result.rows;
}

// Saves the image
async function addStall(name, image, email = null, verification_token = null, canteen_group = null) {
    const result = await pool.query(
        `INSERT INTO stalls (name, image, email, verification_token, canteen_group) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, image, email, verification_token, canteen_group]
    );
    return result.rows[0];
}

// Function for the Edit feature!
async function editStall(id, name, image, email = null, is_email_verified = false, verification_token = null, canteen_group = null) {
    const result = await pool.query(
        `UPDATE stalls SET name = $1, image = $2, email = $3, is_email_verified = $4, verification_token = $5, canteen_group = $6 WHERE id = $7 RETURNING *`,
        [name, image, email, is_email_verified, verification_token, canteen_group, id]
    );
    return result.rows[0];
}

async function getStallById(id) {
    const result = await pool.query(`SELECT * FROM stalls WHERE id = $1`, [id]);
    return result.rows[0];
}

async function getStallByToken(token) {
    const result = await pool.query(`SELECT * FROM stalls WHERE verification_token = $1`, [token]);
    return result.rows[0];
}

async function verifyStallEmail(id) {
    await pool.query(`UPDATE stalls SET is_email_verified = TRUE, verification_token = NULL WHERE id = $1`, [id]);
}

async function deleteStall(id) {
    await pool.query(`DELETE FROM stalls WHERE id = $1`, [id]);
}

async function getFeedbacksByStallName(stallName) {
    const result = await pool.query(
        `SELECT id, attachment FROM feedbacks WHERE comment LIKE $1`,
        [`[Stall: ${stallName}]%`]
    );
    return result.rows;
}

async function deleteFeedbacksByStallName(stallName) {
    await pool.query(
        `DELETE FROM feedbacks WHERE comment LIKE $1`,
        [`[Stall: ${stallName}]%`]
    );
}

module.exports = {
    pool, addFeedback, getAllFeedback, deleteFeedback, quarantineFeedback,
    getFeedbackPhoto,
    getAllStalls, addStall, editStall, deleteStall,
    getStallByToken, verifyStallEmail, getStallById,
    getFeedbacksByStallName, deleteFeedbacksByStallName
};
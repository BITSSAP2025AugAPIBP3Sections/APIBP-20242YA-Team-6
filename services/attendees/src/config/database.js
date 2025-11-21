import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'attendees-db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendees',
  user: process.env.DB_USER || 'attendees',
  password: process.env.DB_PASSWORD || 'attendeespw',
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendees (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        event_id VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'invited',
        rsvp_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT status_check CHECK (status IN ('invited', 'going', 'interested', 'not_going')),
        UNIQUE(user_id, event_id)
      );
    `);
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
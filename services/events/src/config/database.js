import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'events-db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'events',
  user: process.env.DB_USER || 'events',
  password: process.env.DB_PASSWORD || 'eventspw',
});

// Initialize database schema
export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        start_at TIMESTAMP NOT NULL,
        end_at TIMESTAMP NOT NULL,
        organizer_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
export { pool };

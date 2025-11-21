import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'tasks-db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tasks',
    user: process.env.DB_USER || 'tasks',
    password: process.env.DB_PASSWORD || 'taskspw',
});

export async function initDB() {
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        event_id VARCHAR(50) NOT NULL,
        vendor_id VARCHAR(50),
        organizer_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT status_check CHECK (status IN ('pending', 'in_progress', 'completed'))
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

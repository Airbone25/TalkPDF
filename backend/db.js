const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined
})

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error', error)
})

module.exports = pool

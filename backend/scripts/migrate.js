const fs = require('fs')
const path = require('path')
const config = require('../config')
const pool = require('../db')

async function migrate() {
    if (!config.JWT_SECRET) {
        console.warn('JWT_SECRET is not set; auth endpoints will fail until it is added')
    }
    const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8')
    await pool.query(sql)
    console.log('Schema applied')
}

migrate()
    .then(() => pool.end())
    .catch((error) => {
        console.error('Migration failed:', error.message)
        process.exitCode = 1
        return pool.end()
    })

const pool = require('../db')

function createUser({ email, passwordHash }) {
    return pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [email, passwordHash]
    ).then((result) => result.rows[0])
}

function findUserByEmail(email) {
    return pool.query(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        [email]
    ).then((result) => result.rows[0] || null)
}

function findUserById(id) {
    return pool.query(
        'SELECT id, email, created_at FROM users WHERE id = $1',
        [id]
    ).then((result) => result.rows[0] || null)
}

module.exports = { createUser, findUserByEmail, findUserById }

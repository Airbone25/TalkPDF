const pool = require('../db')

function createConversation(userId, title = null) {
    return pool.query(
        'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, user_id, title, created_at',
        [userId, title]
    ).then((result) => result.rows[0])
}

function listByUser(userId) {
    return pool.query(
        `SELECT c.id, c.title, c.created_at,
                m.content AS last_message
         FROM conversations c
         LEFT JOIN LATERAL (
             SELECT content FROM messages
             WHERE conversation_id = c.id
             ORDER BY created_at DESC
             LIMIT 1
         ) m ON TRUE
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC`,
        [userId]
    ).then((result) => result.rows)
}

function findByIdAndUser(id, userId) {
    return pool.query(
        'SELECT id, user_id, title, created_at FROM conversations WHERE id = $1 AND user_id = $2',
        [id, userId]
    ).then((result) => result.rows[0] || null)
}

function updateTitle(id, title) {
    return pool.query(
        'UPDATE conversations SET title = $1 WHERE id = $2 RETURNING id, title',
        [title, id]
    ).then((result) => result.rows[0])
}

function deleteByIdAndUser(id, userId) {
    return pool.query(
        'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
    ).then((result) => result.rows[0] || null)
}

module.exports = {
    createConversation,
    listByUser,
    findByIdAndUser,
    updateTitle,
    deleteByIdAndUser
}

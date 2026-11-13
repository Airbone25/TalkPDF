const pool = require('../db')

function createMessage({ conversationId, role, content }) {
    return pool.query(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, $2, $3)
         RETURNING id, conversation_id, role, content, created_at`,
        [conversationId, role, content]
    ).then((result) => result.rows[0])
}

function listRecent(conversationId, limit) {
    return pool.query(
        `SELECT id, role, content, created_at FROM (
             SELECT id, role, content, created_at
             FROM messages
             WHERE conversation_id = $1
             ORDER BY created_at DESC
             LIMIT $2
         ) recent
         ORDER BY created_at ASC`,
        [conversationId, limit]
    ).then((result) => result.rows)
}

function listAll(conversationId) {
    return pool.query(
        `SELECT id, role, content, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conversationId]
    ).then((result) => result.rows)
}

module.exports = { createMessage, listRecent, listAll }

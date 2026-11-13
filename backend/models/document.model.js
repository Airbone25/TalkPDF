const pool = require('../db')

function createDocument({ userId, conversationId, filename, filePath = null }) {
    return pool.query(
        `INSERT INTO documents (user_id, conversation_id, filename, file_path)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, conversation_id, filename, file_path, status, created_at`,
        [userId, conversationId, filename, filePath]
    ).then((result) => result.rows[0])
}

function updateStatus(id, status) {
    return pool.query(
        'UPDATE documents SET status = $1 WHERE id = $2 RETURNING id, status',
        [status, id]
    ).then((result) => result.rows[0])
}

function listReadyByConversation(conversationId) {
    return pool.query(
        `SELECT id, filename FROM documents
         WHERE conversation_id = $1 AND status = 'ready'`,
        [conversationId]
    ).then((result) => result.rows)
}

function listByConversation(conversationId) {
    return pool.query(
        `SELECT id, filename, status, created_at FROM documents
         WHERE conversation_id = $1
         ORDER BY created_at DESC`,
        [conversationId]
    ).then((result) => result.rows)
}

module.exports = { createDocument, updateStatus, listReadyByConversation, listByConversation }

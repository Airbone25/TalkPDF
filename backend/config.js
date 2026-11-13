const path = require('path')
const fs = require('fs')

const envCandidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', 'rag', '.env')
]
const envPath = envCandidates.find((candidate) => fs.existsSync(candidate))
require('dotenv').config(envPath ? { path: envPath } : {})

module.exports = {
    PORT: process.env.PORT || 3000,
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
    JWT_SECRET: process.env.JWT_SECRET,
    MAX_UPLOAD_BYTES: 25 * 1024 * 1024,
    HISTORY_LIMIT: 6
}

const jwt = require('jsonwebtoken')
const config = require('../config')

function authRequired(req, res, next) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' })
    }

    try {
        const payload = jwt.verify(token, config.JWT_SECRET)
        req.user = { id: payload.sub, email: payload.email }
        next()
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired session' })
    }
}

module.exports = { authRequired }

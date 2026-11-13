const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const config = require('../config')
const userModel = require('../models/user.model')

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.scryptSync(password, salt, 64).toString('hex')
    return `scrypt$${salt}$${hash}`
}

function verifyPassword(password, stored) {
    const [scheme, salt, hash] = (stored || '').split('$')
    if (scheme !== 'scrypt' || !salt || !hash) {
        return false
    }
    const candidate = crypto.scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return (
        candidate.length === expected.length &&
        crypto.timingSafeEqual(candidate, expected)
    )
}

function signToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email },
        config.JWT_SECRET,
        { expiresIn: '7d' }
    )
}

async function register(req, res) {
    const { email, password } = req.body || {}

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'A valid email is required' })
    }
    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const existing = await userModel.findUserByEmail(normalizedEmail)
    if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' })
    }

    const user = await userModel.createUser({
        email: normalizedEmail,
        passwordHash: hashPassword(password)
    })

    res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email } })
}

async function login(req, res) {
    const { email, password } = req.body || {}

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await userModel.findUserByEmail(String(email).trim().toLowerCase())
    if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid email or password' })
    }

    res.json({ token: signToken(user), user: { id: user.id, email: user.email } })
}

async function me(req, res) {
    const user = await userModel.findUserById(req.user.id)
    if (!user) {
        return res.status(404).json({ error: 'User not found' })
    }
    res.json({ user: { id: user.id, email: user.email } })
}

module.exports = { register, login, me }

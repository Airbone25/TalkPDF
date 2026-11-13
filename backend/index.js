const express = require('express')
const cors = require('cors')
const config = require('./config')
const pool = require('./db')

const authRoutes = require('./routes/auth.routes')
const conversationRoutes = require('./routes/conversation.routes')
const { errorHandler } = require('./middlewares/error.middleware')

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/hi', async (req, res) => {
    try {
        const response = await fetch(`${config.AI_SERVICE_URL}/hi`)
        if (!response.ok) {
            return res
                .status(response.status)
                .json({ error: `AI service responded with ${response.status}` })
        }
        res.json(await response.json())
    } catch (error) {
        res.status(502).json({
            error: 'Failed to reach AI service',
            details: error.message
        })
    }
})

app.get('/api/db/hi', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT 'hi' AS message")
        res.json(rows[0])
    } catch (error) {
        res.status(500).json({
            error: 'Database query failed',
            details: error.message
        })
    }
})

app.use('/api/auth', authRoutes)
app.use('/api/conversations', conversationRoutes)

app.use(errorHandler)

if (!config.JWT_SECRET) {
    console.warn('JWT_SECRET is not set; auth will fail until it is added to the env file')
}

app.listen(config.PORT, () => {
    console.log(`Server is running at ${config.PORT}`)
})

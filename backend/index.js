const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const express = require('express')
const cors = require('cors')
const pool = require('./db')

const app = express()
const PORT = process.env.PORT || 3000
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'

app.use(cors())
app.use(express.json())

app.get('/api/hi', async (req, res) => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/hi`)

        if (!response.ok) {
            return res.status(response.status).json({
                error: `AI service responded with ${response.status}`
            })
        }

        const data = await response.json()
        res.json(data)
    } catch (error) {
        res.status(502).json({
            error: 'Failed to reach RAG service',
            details: error.message
        })
    }
})

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`)
})

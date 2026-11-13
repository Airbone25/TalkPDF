const path = require('path')
const fs = require('fs')
const fsp = require('fs/promises')
require('dotenv').config(
    fs.existsSync(path.join(__dirname, '..', '.env'))
        ? { path: path.join(__dirname, '..', '.env') }
        : { path: path.join(__dirname, '..', 'rag', '.env') }
)
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const os = require('os')
const pool = require('./db')

const app = express()
const PORT = process.env.PORT || 3000
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

app.use(cors())
app.use(express.json())

const upload = multer({
    dest: os.tmpdir(),
    limits: { fileSize: MAX_UPLOAD_BYTES }
})

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

app.post('/api/upload', upload.array('files', 10), async (req, res) => {
    const files = req.files || []

    if (files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' })
    }

    if (files.some((f) => !f.originalname.toLowerCase().endsWith('.pdf'))) {
        return res.status(400).json({ error: 'Only PDF files are supported' })
    }

    try {
        const results = []
        for (const file of files) {
            const form = new FormData()
            const buffer = await fsp.readFile(file.path)
            form.append('files', new Blob([buffer]), file.originalname)

            try {
                const response = await fetch(`${AI_SERVICE_URL}/upload`, {
                    method: 'POST',
                    body: form
                })
                const data = await response.json().catch(() => ({}))

                if (response.ok) {
                    results.push({
                        name: file.originalname,
                        status: 'embedded',
                        chunks: data.total_chunks,
                        files: data.files
                    })
                } else {
                    results.push({
                        name: file.originalname,
                        status: 'failed',
                        error: data.error || data.detail || `AI service responded with ${response.status}`
                    })
                }
            } catch (error) {
                results.push({
                    name: file.originalname,
                    status: 'failed',
                    error: `Failed to reach AI service: ${error.message}`
                })
            } finally {
                await fsp.unlink(file.path).catch(() => {})
            }
        }

        res.json({ results })
    } catch (error) {
        res.status(502).json({
            error: 'Upload processing failed',
            details: error.message
        })
    }
})

app.post('/api/chat', async (req, res) => {
    const query = req.body?.query

    if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Field "query" is required' })
    }

    try {
        const response = await fetch(`${AI_SERVICE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        })
        const data = await response.json().catch(() => ({}))

        if (response.ok) {
            return res.json(data)
        }
        return res.status(response.status).json({
            error: data.error || data.detail || `AI service responded with ${response.status}`
        })
    } catch (error) {
        res.status(502).json({
            error: 'Failed to reach AI service',
            details: error.message
        })
    }
})

app.use((error, req, res, next) => {
    if (error && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large (max 25MB)' })
    }
    if (error && error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            error: 'Too many files or wrong field name (use "files")'
        })
    }
    next(error)
})

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`)
})

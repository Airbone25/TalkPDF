function errorHandler(error, req, res, next) {
    if (error && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large (max 25MB)' })
    }
    if (error && error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            error: 'Too many files or wrong field name (use "file")'
        })
    }
    if (error && error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON body' })
    }

    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
}

module.exports = { errorHandler }

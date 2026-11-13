const documentModel = require('../models/document.model')
const conversationModel = require('../models/conversation.model')
const config = require('../config')

async function upload(req, res) {
    const conversation = await conversationModel.findByIdAndUser(
        req.params.id,
        req.user.id
    )
    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
    }

    const file = req.file
    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' })
    }
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({ error: 'Only PDF files are supported' })
    }

    const document = await documentModel.createDocument({
        userId: req.user.id,
        conversationId: conversation.id,
        filename: file.originalname
    })

    try {
        const form = new FormData()
        form.append('files', new Blob([file.buffer]), file.originalname)
        form.append('doc_key', document.id)

        const response = await fetch(`${config.AI_SERVICE_URL}/upload`, {
            method: 'POST',
            body: form
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
            throw new Error(data.error || data.detail || `AI service responded with ${response.status}`)
        }

        await documentModel.updateStatus(document.id, 'ready')
        res.status(201).json({
            document: { id: document.id, filename: file.originalname, status: 'ready' }
        })
    } catch (error) {
        await documentModel.updateStatus(document.id, 'failed').catch(() => {})
        res.status(502).json({
            error: 'Document processing failed',
            details: error.message
        })
    }
}

async function list(req, res) {
    const conversation = await conversationModel.findByIdAndUser(
        req.params.id,
        req.user.id
    )
    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
    }

    const documents = await documentModel.listByConversation(conversation.id)
    res.json({ documents })
}

module.exports = { upload, list }

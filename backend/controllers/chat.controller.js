const conversationModel = require('../models/conversation.model')
const messageModel = require('../models/message.model')
const documentModel = require('../models/document.model')
const config = require('../config')

async function stream(req, res) {
    const conversation = await conversationModel.findByIdAndUser(
        req.params.id,
        req.user.id
    )
    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
    }

    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : ''
    if (!query) {
        return res.status(400).json({ error: 'Field "query" is required' })
    }

    const history = await messageModel.listRecent(conversation.id, config.HISTORY_LIMIT)
    const documents = await documentModel.listReadyByConversation(conversation.id)

    await messageModel.createMessage({ conversationId: conversation.id, role: 'user', content: query })

    if (history.length === 0) {
        await conversationModel.updateTitle(conversation.id, query.slice(0, 60))
    }

    let upstream
    try {
        upstream = await fetch(`${config.AI_SERVICE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                history: history.map((m) => ({ role: m.role, content: m.content })),
                sources: documents.map((d) => d.id)
            })
        })
    } catch (error) {
        return res.status(502).json({
            error: 'Failed to reach AI service',
            details: error.message
        })
    }

    if (!upstream.ok || !upstream.body) {
        const data = await upstream.json().catch(() => ({}))
        return res.status(upstream.status).json({
            error: data.error || data.detail || `AI service responded with ${upstream.status}`
        })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()
    let sseBuffer = ''
    let answer = ''
    let streamError = null

    try {
        for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            res.write(chunk)
            sseBuffer += chunk

            let sep
            while ((sep = sseBuffer.indexOf('\n\n')) !== -1) {
                const rawEvent = sseBuffer.slice(0, sep)
                sseBuffer = sseBuffer.slice(sep + 2)
                const dataLine = rawEvent
                    .split('\n')
                    .find((line) => line.startsWith('data: '))
                if (!dataLine) {
                    continue
                }
                try {
                    const payload = JSON.parse(dataLine.slice(6))
                    if (payload.token) {
                        answer += payload.token
                    }
                    if (payload.error) {
                        streamError = payload.error
                    }
                } catch (parseError) {
                    // skip malformed event
                }
            }
        }
    } catch (error) {
        streamError = streamError || error.message
    } finally {
        res.end()
    }

    if (answer) {
        await messageModel
            .createMessage({ conversationId: conversation.id, role: 'assistant', content: answer })
            .catch((error) => console.error('Failed to save assistant message:', error.message))
    } else if (streamError) {
        await messageModel
            .createMessage({
                conversationId: conversation.id,
                role: 'assistant',
                content: `⚠ ${streamError}`
            })
            .catch((error) => console.error('Failed to save error message:', error.message))
    }
}

module.exports = { stream }

const conversationModel = require('../models/conversation.model')
const messageModel = require('../models/message.model')
const documentModel = require('../models/document.model')

async function create(req, res) {
    const conversation = await conversationModel.createConversation(
        req.user.id,
        'New chat'
    )
    res.status(201).json({ conversation })
}

async function list(req, res) {
    const conversations = await conversationModel.listByUser(req.user.id)
    res.json({ conversations })
}

async function getMessages(req, res) {
    const conversation = await conversationModel.findByIdAndUser(
        req.params.id,
        req.user.id
    )
    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
    }

    const [messages, documents] = await Promise.all([
        messageModel.listAll(conversation.id),
        documentModel.listByConversation(conversation.id)
    ])

    res.json({ conversation, messages, documents })
}

async function remove(req, res) {
    const deleted = await conversationModel.deleteByIdAndUser(
        req.params.id,
        req.user.id
    )
    if (!deleted) {
        return res.status(404).json({ error: 'Conversation not found' })
    }
    res.json({ deleted: deleted.id })
}

module.exports = { create, list, getMessages, remove }

const express = require('express')
const conversationController = require('../controllers/conversation.controller')
const documentController = require('../controllers/document.controller')
const chatController = require('../controllers/chat.controller')
const { authRequired } = require('../middlewares/auth.middleware')
const { upload } = require('../middlewares/upload.middleware')

const router = express.Router()

router.use(authRequired)

router.post('/', conversationController.create)
router.get('/', conversationController.list)
router.get('/:id/messages', conversationController.getMessages)
router.delete('/:id', conversationController.remove)

router.post('/:id/documents', upload.single('file'), documentController.upload)
router.get('/:id/documents', documentController.list)

router.post('/:id/chat', chatController.stream)

module.exports = router

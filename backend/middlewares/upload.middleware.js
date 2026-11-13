const multer = require('multer')
const config = require('../config')

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.MAX_UPLOAD_BYTES }
})

module.exports = { upload }

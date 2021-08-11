const express = require('express')
const authMiddleware = require('../middlewares/auth')

const pairRoutes = express.Router()

pairRoutes.use(authMiddleware)

pairRoutes.get('/', async (req, res) => {
  res.send({ ok: true, user: req.userId })
})

module.exports = pairRoutes

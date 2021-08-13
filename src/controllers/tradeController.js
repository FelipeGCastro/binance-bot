const express = require('express')
const Trade = require('../src/models/trade')

const tradeRoutes = express.Router()

tradeRoutes.get('/', async (req, res) => {
  const trades = await Trade({})
  res.send(trades)
})

module.exports = tradeRoutes

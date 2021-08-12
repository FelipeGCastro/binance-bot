const mongoose = require('../database')

const TradeSchema = new mongoose.Schema({
  pair: {
    type: String,
    require: true
  },
  side: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true,
    select: false
  },
  quantity: {
    type: String,
    required: true,
    select: false
  },
  profit: {
    type: String,
    required: true,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Trade = mongoose.model('Trade', TradeSchema)

module.exports = Trade

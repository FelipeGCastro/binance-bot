const EMA = require('trading-signals').EMA
const tools = require('../tools/index.js')

function checkingEma (candles, period = 150) {
  const ema = new EMA(period)
  const candlesClose = tools.extractData(candles)
  candlesClose.forEach(price => {
    ema.update(price)
  })
  if (ema.isStable) {
    return ema.getResult().toPrecision(12)
  }
}

module.exports = { checkingEma }

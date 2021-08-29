const EMA = require('trading-signals').EMA
const tools = require('../tools/index.js')
const { POSITION_SIDE, CANDLE } = require('../tools/constants')

const periodEma200 = 200
const periodEma50 = 50

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

function validateEma200And50 (candles, overOrBellowEMA = false) {
  const lastCandle = candles[candles.length - 1]
  const ema200 = checkingEma(candles, periodEma200)
  const ema50 = checkingEma(candles, periodEma50)
  const data = { ema200, ema50, position: '' }
  if (ema200 < ema50) {
    if (overOrBellowEMA && lastCandle[CANDLE.CLOSE] < ema200) return false
    data.position = POSITION_SIDE.LONG
  } else {
    if (overOrBellowEMA && lastCandle[CANDLE.CLOSE] > ema200) return false
    data.position = POSITION_SIDE.SHORT
  }
  return data
}

module.exports = { checkingEma, validateEma200And50 }

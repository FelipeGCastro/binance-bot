
const api = require('../services/api.js')
const POSITION = require('../tools/constants').POSITION_SIDE
const CANDLE = require('../tools/constants').CANDLE

async function verifyOpenOrders (symbol) {
  const openOrders = await api.getAllOpenOrders(symbol)
  if (openOrders[0]) {
    return true
  } else {
    return false
  }
}

function handleAddCandle (newCandle, allCandles) {
  const candles = allCandles
  const newCandleMapped = [
    newCandle.k.t,
    newCandle.k.o,
    newCandle.k.h,
    newCandle.k.l,
    newCandle.k.c,
    newCandle.k.v,
    newCandle.k.T,
    newCandle.k.q,
    newCandle.k.n,
    newCandle.k.V,
    newCandle.k.Q
  ]
  candles.push(newCandleMapped)
  return candles
}

function handleTrendingValidation (trendingEma, candles) {
  if (
    trendingEma.position === POSITION.SHORT &&
    trendingEma.ema200 < candles[candles.length - 1][CANDLE.CLOSE]
  ) {
    return false
  } else if (
    trendingEma.position === POSITION.LONG &&
    trendingEma.ema200 > candles[candles.length - 1][CANDLE.CLOSE]
  ) {
    return false
  } else {
    return true
  }
}

module.exports = {
  verifyOpenOrders,
  handleAddCandle,
  handleTrendingValidation
}

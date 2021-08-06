const rsi = require('../indicators/rsi.js')
const EMA = require('../indicators/ema.js')
const stoch = require('../indicators/stoch.js')
const tools = require('../tools/index')
const CANDLE = require('../tools/constants').CANDLE

const periodTime = '1m'
const rsiPeriod = 14// 80 - 20
const stochPeriod = 14 // 80 - 20

function validateEntry (candles) {
  const validatedEma = validateEma(candles)
  const validatedStoch = validateStoch(candles)
  const validatedRsi = validateDivergence(candles)
  if (!validatedStoch) {
    return false
  }
  if (!validatedRsi) {
    return false
  } else {
    if (validateStoch === validatedEma) {
      const validatedRsi = validateDivergence(candles, validateStoch)
      if (validatedRsi) {
        return {
          side: validateStoch,
          stopPrice: validatedRsi.lastPivotPrice,
          stopPercentage: 0.5,
          gainPercentage: 0.5
        }
      } else { return false }
    } else { return false }
  }
}

function getInterval () {
  return periodTime
}

function validateEma (candles) {
  const ema200 = EMA.checkingEma(candles, 200)
  const ema50 = EMA.checkingEma(candles, 50)
  if (ema200 < ema50) {
    return 'LONG'
  } else {
    return 'SHORT'
  }
}

function validateDivergence (candles, side) {
  const rsiArray = rsi.checkingRsi(candles, rsiPeriod)
  const lastsRsi = tools.getLasts(rsiArray, 26)
  const lastsCandles = tools.getLasts(candles, 26)
  const lastSixCandles = tools.getLasts(lastsCandles, 6)
  const lastSixRsi = tools.getLasts(rsiArray, 6)
  const firstsCandles = tools.getFirsts(lastsCandles, 20)
  const firstsRsi = tools.getFirsts(lastsRsi, 20)
  let lastPivotRsi, firstPivotRsi
  let lastPivotPrice, firstPivotPrice
  let lastSideCandleIndex, firstSideCandleIndex
  let lastPriceIndex, firstPriceIndex
  let lastPrice = 0
  let firstPrice = 0

  if (side === 'SHORT') {
    lastSixCandles.forEach((candle, i) => {
      if (tools.isBlueCandle(candle)) lastSideCandleIndex = i
    })

    if (lastSideCandleIndex < 2) return false

    lastSixCandles.forEach((candle, i) => {
      if (candle[CANDLE.HIGH] > lastPrice) {
        lastPriceIndex = i
        lastPrice = candle[CANDLE.HIGH]
      }
    })

    if (lastPriceIndex < 2 || lastPriceIndex === 5) return false
    lastPivotRsi = lastSixRsi[lastPriceIndex]
    lastPivotPrice = lastSixCandles[lastPriceIndex][CANDLE.HIGH]

    if (!tools.isBlueCandle(lastSixCandles[lastPriceIndex]) ||
    !tools.isBlueCandle(lastSixCandles[lastPriceIndex - 1])) return false

    // firsts 20 candles

    firstsCandles.forEach((candle, i) => {
      if (tools.isBlueCandle(candle)) firstSideCandleIndex = i
    })

    if (firstSideCandleIndex < 2) return false

    firstsCandles.forEach((candle, i) => {
      if (candle[CANDLE.HIGH] > firstPrice) {
        firstPriceIndex = i
        firstPrice = candle[CANDLE.HIGH]
      }
    })

    if (firstPriceIndex < 2) return false
    firstPivotRsi = firstsRsi[firstPriceIndex]
    firstPivotPrice = firstsCandles[firstPriceIndex][CANDLE.HIGH]

    if (!tools.isBlueCandle(firstsCandles[firstPriceIndex]) ||
    !tools.isBlueCandle(firstsCandles[firstPriceIndex - 1])) return false

    const candleDivergence = firstPivotPrice > lastPivotPrice
    const rsiDivergence = firstPivotRsi < lastPivotRsi
    if (!!candleDivergence && !!rsiDivergence) {
      return { lastPivotPrice }
    }
  } else {
    lastSixCandles.forEach((candle, i) => {
      if (tools.isRedCandle(candle)) lastSideCandleIndex = i
    })

    if (lastSideCandleIndex < 2) return false

    lastSixCandles.forEach((candle, i) => {
      if (firstPrice === 0) {
        lastPriceIndex = i
        lastPrice = candle[CANDLE.LOW]
      } else if (candle[CANDLE.LOW] < lastPrice) {
        lastPriceIndex = i
        lastPrice = candle[CANDLE.LOW]
      }
    })

    if (lastPriceIndex < 2 || lastPriceIndex === 5) return false
    lastPivotRsi = lastSixRsi[lastPriceIndex]
    lastPivotPrice = lastSixCandles[lastPriceIndex][CANDLE.LOW]

    if (!tools.isRedCandle(lastSixCandles[lastPriceIndex]) ||
      !tools.isRedCandle(lastSixCandles[lastPriceIndex - 1])) return false

    // firsts 20 candles

    firstsCandles.forEach((candle, i) => {
      if (tools.isRedCandle(candle)) firstSideCandleIndex = i
    })

    if (firstSideCandleIndex < 2) return false

    firstsCandles.forEach((candle, i) => {
      if (firstPrice === 0) {
        firstPriceIndex = i
        firstPrice = candle[CANDLE.LOW]
      } else if (candle[CANDLE.LOW] < firstPrice) {
        firstPriceIndex = i
        firstPrice = candle[CANDLE.LOW]
      }
    })

    if (firstPriceIndex < 2) return false
    firstPivotRsi = firstsRsi[firstPriceIndex]
    firstPivotPrice = firstsCandles[firstPriceIndex][CANDLE.LOW]

    if (!tools.isRedCandle(firstsCandles[firstPriceIndex]) ||
      !tools.isRedCandle(firstsCandles[firstPriceIndex - 1])) return false

    const candleDivergence = firstPivotPrice < lastPivotPrice
    const rsiDivergence = firstPivotRsi > lastPivotRsi
    if (!!candleDivergence && !!rsiDivergence) {
      return { lastPivotPrice }
    }
  }

  return false
}

function validateStoch (candles) {
  const stochArray = stoch.checkingStoch(candles, stochPeriod)
  const lastTwoStoch = tools.getLasts(stochArray, 2)
  const lastK = lastTwoStoch[1].k
  const beforeK = lastTwoStoch[0].k
  const lastD = lastTwoStoch[1].d
  const beforeD = lastTwoStoch[0].d
  const crossDown = lastK < lastD && beforeK > beforeD ? 'SHORT' : false
  const crossUp = lastK > lastD && beforeK < beforeD ? 'LONG' : false
  if (crossDown) {
    return crossDown
  } else if (crossUp) {
    return crossUp
  } else {
    return false
  }
}

module.exports = {
  getInterval,
  validateEntry
}

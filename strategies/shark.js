const rsi = require('../indicators/rsi.js')
const EMA = require('../indicators/ema.js')
const tools = require('../tools/index')
const CANDLE = require('../tools/constants').CANDLE
const STRATEGIES = require('../tools/constants').STRATEGIES
const POSITION = require('../tools/constants').POSITION_SIDE
const hasCrossStoch = require('../tools/validations').hasCrossStoch

const periodTime = '5m'
const rsiPeriod = 3// 80 - 20
const stochPeriod = 3 // 80 - 20
const emaPeriod = 100
const stopPerc = 0.5
const profitPerc = 0.5

function validateEntry (candles) {
  const lastCandle = candles[candles.length - 1]
  const checkinPosition = emaValue(candles)
  const crossStoch = hasCrossStoch(candles, stochPeriod)
  const validatedRsi = validateRsi(candles)
  if (!checkinPosition) return false
  if (!crossStoch) return false
  if (crossStoch !== checkinPosition) return false
  if (!validatedRsi) {
    return false
  } else {
    const stopAndTarget = handleTpslOrder(lastCandle[CANDLE.CLOSE], crossStoch)
    if (stopAndTarget) {
      return {
        strategy: STRATEGIES.SHARK,
        timeLastCandle: lastCandle[CANDLE.OPEN_TIME],
        side: crossStoch,
        stopPrice: stopAndTarget.stopPrice,
        targetPrice: stopAndTarget.targetPrice,
        closePrice: lastCandle[CANDLE.CLOSE]
      }
    } else {
      console.log('SAIDA 1.5 - Erro ao setar stop price and target price ')
      return false
    }
  }
}

function getInterval () {
  return periodTime
}

function handleTpslOrder (closePrice, side) {
  const isSell = side === POSITION.SHORT
  let stopPrice = isSell
    ? Number(closePrice) + (closePrice * (stopPerc / 100))
    : Number(closePrice) - (closePrice * (stopPerc / 100))
  let targetPrice = isSell
    ? Number(closePrice) - (closePrice * (profitPerc / 100))
    : Number(closePrice) + (closePrice * (profitPerc / 100))

  targetPrice = tools.ParseFloatByFormat(targetPrice, closePrice)
  stopPrice = tools.ParseFloatByFormat(stopPrice, closePrice)
  if (targetPrice && stopPrice) {
    return { targetPrice, stopPrice }
  } else {
    console.log('Error handleTpslOrder')
    return false
  }
}

function emaValue (candles) {
  const emaValue = EMA.checkingEma(candles, emaPeriod)
  const lastClosePrice = candles[candles.length - 1][CANDLE.CLOSE]
  if (!emaValue && !lastClosePrice) return false
  if (emaValue < lastClosePrice) {
    return POSITION.LONG
  } else {
    return POSITION.SHORT
  }
}

function validateRsi (candles) {
  const rsiArray = rsi.checkingRsi(candles, rsiPeriod)
  const lastTwoRsi = tools.getLasts(rsiArray, 2)
  const over80 = lastTwoRsi[0] > 80 || lastTwoRsi[1] > 80
  const under20 = lastTwoRsi[0] < 20 || lastTwoRsi[1] < 20
  console.log(lastTwoRsi[1], 'validateRsi')
  if (over80) return POSITION.SHORT
  if (under20) return POSITION.LONG
  return false
}

module.exports = {
  getInterval,
  validateEntry
}

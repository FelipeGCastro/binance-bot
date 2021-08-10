const rsi = require('../indicators/rsi.js')
const EMA = require('../indicators/ema.js')
const tools = require('../tools/index')
const stoch = require('../indicators/stoch.js')
const CANDLE = require('../tools/constants').CANDLE
const STRATEGIES = require('../tools/constants').STRATEGIES
const POSITION = require('../tools/constants').POSITION_SIDE

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
function hasCrossStoch (candles, stochPeriod) {
  const stochArray = stoch.checkingStoch(candles, stochPeriod)
  const lastTwoStoch = tools.getLasts(stochArray, 2)
  const lastK = lastTwoStoch[1].k
  const beforeK = lastTwoStoch[0].k
  const lastD = lastTwoStoch[1].d
  const beforeD = lastTwoStoch[0].d
  const crossDown = lastK <= lastD && beforeK > beforeD ? POSITION.SHORT : false
  const crossUp = lastK >= lastD && beforeK < beforeD ? POSITION.LONG : false
  const kOver80 = lastK > 80 || beforeK > 80
  const dOver80 = lastD > 80 || beforeD > 80
  const kUnder20 = lastK < 20 || beforeK < 20
  const dUnder20 = lastD < 20 || beforeD < 20

  if (crossDown) {
    if (kOver80 && dOver80) return false
    return crossDown
  } else if (crossUp) {
    if (kUnder20 && dUnder20) return false
    return crossUp
  } else {
    console.log('SAIDA 17')
    return false
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

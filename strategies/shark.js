const rsi = require('../indicators/rsi.js')
const tools = require('../tools/index')
const stoch = require('../indicators/stoch.js')
const CANDLE = require('../tools/constants').CANDLE
const STRATEGIES = require('../tools/constants').STRATEGIES
const POSITION = require('../tools/constants').POSITION_SIDE
const INDICATORS_OBJ = require('../tools/constants').INDICATORS_OBJ

const periodTime = '5m'
const rsiPeriod = 3// 80 - 20
const stochPeriod = 3 // 80 - 20
const stopPerc = 0.5
const profitPerc = 0.5

function validateEntry (candles, setLastIndicatorsData) {
  const lastCandle = candles[candles.length - 1]
  const crossStoch = hasCrossStoch(candles, stochPeriod, setLastIndicatorsData)
  const validatedRsi = validateRsi(candles, setLastIndicatorsData)
  if (!crossStoch) return false
  if (!checkLastCandle(candles, crossStoch)) return false
  if (!validatedRsi) return false
  else {
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
      return false
    }
  }
}

function checkLastCandle (candles, position) {
  const lastCandle = candles[candles.length - 1]
  const isBlueCandle = tools.isBlueCandle(lastCandle)
  if (position === POSITION.SHORT && isBlueCandle) return false
  if (position === POSITION.LONG && !isBlueCandle) return false
  return true
}
function hasCrossStoch (candles, stochPeriod, setLastIndicatorsData) {
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
  setLastIndicatorsData(INDICATORS_OBJ.STOCH, [lastK, lastD])
  console.log('k:', lastK, 'd:', lastD, candles[candles.length - 2][1], candles[candles.length - 1][1])
  if (crossDown) {
    console.log('crossDown 1')
    if (!kOver80 && !dOver80) return false
    console.log('crossDown 2')
    return crossDown
  } else if (crossUp) {
    console.log('crossUp 1')
    if (!kUnder20 && !dUnder20) return false
    console.log('crossUp 2')
    return crossUp
  } else {
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
    return false
  }
}

function validateRsi (candles, setLastIndicatorsData) {
  const rsiArray = rsi.checkingRsi(candles, rsiPeriod)
  const lastTwoRsi = tools.getLasts(rsiArray, 2)
  const over80 = lastTwoRsi[0] > 80 || lastTwoRsi[1] > 80
  const under20 = lastTwoRsi[0] < 20 || lastTwoRsi[1] < 20
  setLastIndicatorsData(INDICATORS_OBJ.RSI, lastTwoRsi[1])
  if (over80) return POSITION.SHORT
  if (under20) return POSITION.LONG
  return false
}

module.exports = {
  getInterval,
  validateEntry
}

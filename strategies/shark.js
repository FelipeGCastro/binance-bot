const rsi = require('../indicators/rsi.js')
const tools = require('../tools/index')
const stoch = require('../indicators/stoch.js')
const { validateEma200And50 } = require('../indicators/ema.js')
const CANDLE = require('../tools/constants').CANDLE
const STRATEGIES = require('../tools/constants').STRATEGIES
const POSITION = require('../tools/constants').POSITION_SIDE
const { SIDE } = require('../tools/constants')
const Highest = require('technicalindicators').Highest
const Lowest = require('technicalindicators').Lowest

const periodTime = '5m'
const rsiPeriod = 3// 80 - 20
const stochPeriod = 3 // 80 - 20
const stopPerc = 0.5
const profitPerc = 0.5
const breakEvenPerc = 0.5
const riseStopPerc = 0.8
const breakevenIsOn = false

function validateEntry (candles, symbol) {
  const trendingEma = validateEma200And50(candles)
  const lastCandle = candles[candles.length - 1]
  const crossStoch = hasCrossStoch(candles, symbol)
  const validatedRsi = validateRsi(candles)
  if (!crossStoch) return false
  if (!checkLastCandle(candles, crossStoch)) return false
  if (!validatedRsi) return false
  if (crossStoch !== trendingEma.position) return false
  else {
    const lastThreeCandles = tools.getLasts(candles, 3)
    const stopAndTarget = getStopAndTargetPrice(lastCandle[CANDLE.CLOSE], crossStoch)
    const stopPrice = getStopLossFlex(lastThreeCandles, stopAndTarget.stopPrice, crossStoch, lastCandle[CANDLE.CLOSE])
    if (stopAndTarget) {
      return {
        strategy: STRATEGIES.SHARK,
        timeLastCandle: lastCandle[CANDLE.OPEN_TIME],
        side: crossStoch,
        stopPrice,
        targetPrice: stopAndTarget.targetPrice,
        closePrice: lastCandle[CANDLE.CLOSE],
        symbol
      }
    } else {
      return false
    }
  }
}

function getStopLossFlex (lastThreeCandles, stopLossDefault, positionSide, closePrice) {
  let stopPrice25
  if (positionSide === POSITION.SHORT) {
    stopPrice25 = Number(closePrice) + (closePrice * (0.25 / 100))
    const highPricesOnly = tools.extractData(lastThreeCandles, 'HIGH')
    let highestPrice = Highest.calculate({ values: highPricesOnly, period: 3 })[0]
    if (highestPrice < stopLossDefault) {
      stopPrice25 = tools.ParseFloatByFormat(stopPrice25, closePrice)
      highestPrice = tools.ParseFloatByFormat(highestPrice, closePrice)
      if (highestPrice < stopPrice25) return stopPrice25
      else return highestPrice
    } else return stopLossDefault
  } else if (positionSide === POSITION.LONG) {
    stopPrice25 = Number(closePrice) - (closePrice * (0.25 / 100))
    const lowPricesOnly = tools.extractData(lastThreeCandles, 'LOW')
    let lowestPrice = Lowest.calculate({ values: lowPricesOnly, period: 3 })[0]
    if (lowestPrice > stopLossDefault) {
      stopPrice25 = tools.ParseFloatByFormat(stopPrice25, closePrice)
      lowestPrice = tools.ParseFloatByFormat(lowestPrice, closePrice)
      if (lowestPrice > stopPrice25) return stopPrice25
      else return lowestPrice
    } else return stopLossDefault
  } else return false
}

function checkLastCandle (candles, position) {
  const lastCandle = candles[candles.length - 1]
  const isBlueCandle = tools.isBlueCandle(lastCandle)
  if (position === POSITION.SHORT && isBlueCandle) return false
  if (position === POSITION.LONG && !isBlueCandle) return false
  return true
}
function hasCrossStoch (candles, symbol) {
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
  console.log('k:', lastK, 'd:', lastD, '---> Before: ', 'k:', beforeK, 'd:', beforeD)
  if (crossDown) {
    if (!kOver80 && !dOver80) return false
    return crossDown
  } else if (crossUp) {
    if (!kUnder20 && !dUnder20) return false
    return crossUp
  } else {
    return false
  }
}

function getInterval () {
  return periodTime
}

function getStopAndTargetPrice (entryPrice, side) {
  const isSell = side === POSITION.SHORT || side === SIDE.SELL
  let stopPrice, targetPrice, breakevenTriggerPrice, riseStopTriggerPrice
  if (isSell) {
    stopPrice = Number(entryPrice) + (entryPrice * (stopPerc / 100))
    targetPrice = Number(entryPrice) - (entryPrice * (profitPerc / 100))
    breakevenTriggerPrice = Number(entryPrice) - (entryPrice * (breakEvenPerc / 100))
    riseStopTriggerPrice = Number(entryPrice) - (entryPrice * (riseStopPerc / 100))
  } else {
    stopPrice = Number(entryPrice) - (entryPrice * (stopPerc / 100))
    targetPrice = Number(entryPrice) + (entryPrice * (profitPerc / 100))
    breakevenTriggerPrice = Number(entryPrice) + (entryPrice * (breakEvenPerc / 100))
    riseStopTriggerPrice = Number(entryPrice) + (entryPrice * (riseStopPerc / 100))
  }

  targetPrice = tools.ParseFloatByFormat(targetPrice, entryPrice)
  stopPrice = tools.ParseFloatByFormat(stopPrice, entryPrice)
  breakevenTriggerPrice = tools.ParseFloatByFormat(breakevenTriggerPrice, entryPrice)
  riseStopTriggerPrice = tools.ParseFloatByFormat(riseStopTriggerPrice, entryPrice)
  if (targetPrice && stopPrice) {
    const data = { targetPrice, stopPrice }
    if (breakevenIsOn) {
      data.breakevenTriggerPrice = breakevenTriggerPrice
      data.riseStopTriggerPrice = riseStopTriggerPrice
    }
    return data
  } else {
    return false
  }
}

function validateRsi (candles) {
  const rsiArray = rsi.checkingRsi(candles, rsiPeriod)
  const lastTwoRsi = tools.getLasts(rsiArray, 2)
  const over80 = lastTwoRsi[0] > 80 || lastTwoRsi[1] > 80
  const under20 = lastTwoRsi[0] < 20 || lastTwoRsi[1] < 20

  if (over80) return POSITION.SHORT
  if (under20) return POSITION.LONG
  return false
}

module.exports = {
  getInterval,
  validateEntry,
  getStopAndTargetPrice
}

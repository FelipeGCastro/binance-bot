
const { validateEma200And50 } = require('../indicators/ema.js')
const tools = require('../tools/index')
const CANDLE = require('../tools/constants').CANDLE
const STRATEGIES = require('../tools/constants').STRATEGIES
const POSITION = require('../tools/constants').POSITION_SIDE
const hasCrossStoch = require('../tools/validations').hasCrossStoch
const validateDivergence = require('./validations/divergence')

const periodTime = '1m'
const stochPeriod = 14 // 80 - 20

const getInterval = () => periodTime

function validateEntry (candles, symbol) {
  const trendingEma = validateEma200And50(candles)
  const crossStoch = hasCrossStoch(candles, stochPeriod)
  if (!crossStoch) {
    return false
  }
  if (trendingEma.position === POSITION.SHORT &&
      trendingEma.ema50 < candles[candles.length - 1][CANDLE.CLOSE]
  ) return false
  if (trendingEma.position === POSITION.LONG &&
      trendingEma.ema50 > candles[candles.length - 1][CANDLE.CLOSE]
  ) return false

  if (crossStoch === trendingEma.position) {
    const divergence = validateDivergence(candles, crossStoch)
    if (divergence) {
      const stopAndTarget = getStopAndTargetPrice(divergence.lastTopOrBottomPrice, divergence.lastClosePrice)
      if (stopAndTarget) {
        return {
          strategy: STRATEGIES.HIDDEN_DIVERGENCE,
          timeLastCandle: candles[candles.length - 1][0],
          side: crossStoch,
          stopPrice: stopAndTarget.stopPrice,
          targetPrice: stopAndTarget.targetPrice,
          closePrice: divergence.lastClosePrice,
          breakevenTriggerPrice: stopAndTarget.breakevenTriggerPrice,
          riseStopTriggerPrice: stopAndTarget.riseStopTriggerPrice,
          symbol
        }
      } else {
        return false
      }
    } else {
      return false
    }
  } else {
    return false
  }
}
// breakevenTriggerPrice
// riseStopTriggerPrice
function getStopAndTargetPrice (stopPrice, entryPrice) {
  let targetPrice = ((entryPrice - stopPrice) * 2) + Number(entryPrice)
  let breakevenTriggerPrice = ((entryPrice - stopPrice) * 1.5) + Number(entryPrice)
  let riseStopTriggerPrice = ((entryPrice - stopPrice) * 1.8) + Number(entryPrice)
  const percentage = tools.getPercentage(entryPrice, stopPrice)
  if (percentage > 1) return false

  targetPrice = tools.ParseFloatByFormat(targetPrice, entryPrice)
  stopPrice = tools.ParseFloatByFormat(stopPrice, stopPrice)
  breakevenTriggerPrice = tools.ParseFloatByFormat(breakevenTriggerPrice, stopPrice)
  riseStopTriggerPrice = tools.ParseFloatByFormat(riseStopTriggerPrice, stopPrice)
  if (targetPrice && stopPrice) {
    return { targetPrice, stopPrice, breakevenTriggerPrice, riseStopTriggerPrice }
  } else {
    return false
  }
}

module.exports = {
  getInterval,
  validateEntry,
  getStopAndTargetPrice
}

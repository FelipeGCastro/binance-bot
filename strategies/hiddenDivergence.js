const rsi = require('../indicators/rsi.js')
const EMA = require('../indicators/ema.js')
const tools = require('../tools/index')
const CANDLE = require('../tools/constants').CANDLE
const Highest = require('technicalindicators').Highest
const Lowest = require('technicalindicators').Lowest
const STRATEGIES = require('../tools/constants').STRATEGIES
const POSITION = require('../tools/constants').POSITION_SIDE
const hasCrossStoch = require('../tools/validations').hasCrossStoch
const INDICATORS_OBJ = require('../tools/constants').INDICATORS_OBJ

const periodTime = '1m'
const rsiPeriod = 14// 80 - 20
const stochPeriod = 14 // 80 - 20
const lookBackPeriod = 26
const lastPivotRange = 6
const EMA1Period = 200
const EMA2Period = 50

const getInterval = () => periodTime

function validateEntry (candles, setLastIndicatorsData) {
  const trendingEma = validateEma(candles, setLastIndicatorsData)
  const crossStoch = hasCrossStoch(candles, stochPeriod, setLastIndicatorsData)
  if (!crossStoch) {
    return false
  }
  if (trendingEma.position === POSITION.SHORT &&
      trendingEma.value < candles[candles.length - 1][CANDLE.CLOSE]
  ) return false
  if (trendingEma.position === POSITION.LONG &&
      trendingEma.value > candles[candles.length - 1][CANDLE.CLOSE]
  ) return false

  if (crossStoch === trendingEma.position) {
    const divergence = validateDivergence(candles, crossStoch, setLastIndicatorsData)
    if (divergence) {
      const stopAndTarget = handleTpslOrder(divergence.lastTopOrBottomPrice, divergence.lastClosePrice)
      if (stopAndTarget) {
        return {
          strategy: STRATEGIES.HIDDEN_DIVERGENCE,
          timeLastCandle: candles[candles.length - 1][0],
          side: crossStoch,
          stopPrice: stopAndTarget.stopPrice,
          targetPrice: stopAndTarget.targetPrice,
          closePrice: divergence.lastClosePrice
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

function handleTpslOrder (stopPrice, closePrice) {
  let targetPrice = ((closePrice - stopPrice) * 2) + Number(closePrice)
  const percentage = tools.getPercentage(closePrice, stopPrice)
  if (percentage > 1) return false

  targetPrice = tools.ParseFloatByFormat(targetPrice, closePrice)
  stopPrice = tools.ParseFloatByFormat(stopPrice, stopPrice)
  if (targetPrice && stopPrice) {
    return { targetPrice, stopPrice }
  } else {
    return false
  }
}

function validateEma (candles, setLastIndicatorsData) {
  const ema200 = EMA.checkingEma(candles, EMA1Period)
  const ema50 = EMA.checkingEma(candles, EMA2Period)
  const data = { value: ema50, position: '' }
  setLastIndicatorsData(INDICATORS_OBJ.EMA, { 200: ema200, 50: ema50 })
  if (ema200 < ema50) {
    console.log('LONG')
    data.position = POSITION.LONG
  } else {
    console.log('SHORT')
    data.position = POSITION.SHORT
  }
  return data
}

function validateDivergence (candles, side, setLastIndicatorsData) {
  const rsiArray = rsi.checkingRsi(candles, rsiPeriod)
  const lastsRsi = tools.getLasts(rsiArray, lookBackPeriod)
  const lastsCandles = tools.getLasts(candles, lookBackPeriod)
  const lastSixCandles = tools.getLasts(lastsCandles, lastPivotRange)
  const lastSixRsi = tools.getLasts(rsiArray, lastPivotRange)
  const firstsCandlesLength = lookBackPeriod - lastPivotRange
  const firstsCandles = tools.getFirsts(lastsCandles, firstsCandlesLength)
  const firstsRsi = tools.getFirsts(lastsRsi, firstsCandlesLength)
  const lastClosePrice = lastSixCandles[lastSixCandles.length - 1][CANDLE.CLOSE]
  setLastIndicatorsData(INDICATORS_OBJ.RSI, lastsRsi[lastsRsi.length - 1])
  let lastPivot, firstPivot
  let lastPivotRsi, firstPivotRsi

  let lastPriceIndex, firstPriceIndex
  let lastTopOrBottomPrice
  if (side === POSITION.SHORT) {
    lastSixCandles.forEach((candle, i) => {
      // CHECKING IF CANDLE BEFORE EXIST AND IF MEET REQUIREMENTS
      const candleBeforeCondition = lastSixCandles[i - 1]
        ? tools.isBlueCandle(lastSixCandles[i - 1]) ||
        lastSixCandles[i - 1][CANDLE.OPEN] <= candle[CANDLE.CLOSE]
        : false
      // CONDITIONS FOR PIVOT HIGH
      const last = !lastSixCandles[i + 1]
      lastPivot = lastPivot || candle
      if (candle[CANDLE.HIGH] > lastPivot[CANDLE.HIGH] &&
        candleBeforeCondition &&
        !last &&
        tools.isBlueCandle(candle) &&
        tools.isRedCandle(lastSixCandles[i + 1])) {
        lastPriceIndex = i
        lastPivot = candle
        lastTopOrBottomPrice = Highest.calculate({
          values: [
            lastSixCandles[i - 1][CANDLE.HIGH],
            lastSixCandles[i][CANDLE.HIGH],
            lastSixCandles[i + 1][CANDLE.HIGH]
          ],
          period: 3
        })[0]
      }
    })

    if (lastPriceIndex < 2 || lastPriceIndex === 5) {
      return false
    }

    if (!lastPriceIndex) {
      return false
    }

    lastPivotRsi = lastSixRsi[lastPriceIndex]

    // FIRSTS 20 CANDLES
    // ----------------------------
    // ----------------------------
    // ----------------------------

    const firstsCandlesReversed = firstsCandles.slice().reverse()
    const hasDivergence = firstsCandlesReversed.find((candle, i) => {
      const normalIndex = ((firstsCandlesLength - 1) - i)
      const last = !firstsCandles[normalIndex + 1]
      firstPivot = firstPivot || candle
      // CHECKING IF CANDLE BEFORE EXIST AND IF MEET REQUIREMENTS
      const candleBeforeCondition = firstsCandles[normalIndex - 1]
        ? tools.isBlueCandle(firstsCandles[normalIndex - 1]) ||
      firstsCandles[normalIndex - 1][CANDLE.OPEN] <= candle[CANDLE.CLOSE]
        : false
      // CONDITIONS TO BE CONSIDERED A PIVOT
      if (candle[CANDLE.HIGH] > lastPivot[CANDLE.HIGH] &&
        candleBeforeCondition &&
        candle[CANDLE.HIGH] >= firstPivot[CANDLE.HIGH] &&
        tools.isBlueCandle(candle) &&
        !last &&
        tools.isRedCandle(firstsCandles[normalIndex + 1])) {
        firstPriceIndex = normalIndex
        firstPivotRsi = firstsRsi[firstPriceIndex]
        firstPivot = candle
        const candleDivergence = firstPivot[CANDLE.HIGH] > lastPivot[CANDLE.HIGH]
        const candleCloseDivergence = firstPivot[CANDLE.CLOSE] > lastPivot[CANDLE.CLOSE]
        const rsiDivergence = firstPivotRsi < lastPivotRsi
        return (!!candleDivergence && !!rsiDivergence && !!candleCloseDivergence)
      }
      return false
    })

    if (hasDivergence) return { lastTopOrBottomPrice, lastClosePrice }
  } else {
    lastSixCandles.forEach((candle, i) => {
      // CHECKING IF CANDLE BEFORE EXIST AND IF MEET REQUIREMENTS
      const candleBeforeCondition = lastSixCandles[i - 1]
        ? tools.isRedCandle(lastSixCandles[i - 1]) ||
      lastSixCandles[i - 1][CANDLE.OPEN] >= candle[CANDLE.CLOSE]
        : false
      // CHECKING LAST PRICE
      lastPivot = lastPivot || candle
      const last = !lastSixCandles[i + 1]
      if (candle[CANDLE.LOW] <= lastPivot[CANDLE.LOW] &&
        candleBeforeCondition &&
        !last &&
        tools.isRedCandle(candle) &&
        tools.isBlueCandle(lastSixCandles[i + 1])) {
        lastPriceIndex = i
        lastPivot = candle
        lastTopOrBottomPrice = Lowest.calculate({
          values: [
            lastSixCandles[i - 1][CANDLE.LOW],
            lastSixCandles[i][CANDLE.LOW],
            lastSixCandles[i + 1][CANDLE.LOW]
          ],
          period: 3
        })[0]
      } else {
        return false
      }
    })

    if (lastPriceIndex < 2 || lastPriceIndex === 5) {
      return false
    }

    if (!lastPriceIndex) {
      return false
    }
    lastPivotRsi = lastSixRsi[lastPriceIndex]

    // firsts 20 candles
    // ----------------------------
    // ----------------------------
    // ----------------------------

    const firstsCandlesReversed = firstsCandles.slice().reverse()
    const isDivergence = firstsCandlesReversed.find((candle, i) => {
      // minPivotPrice = !minPivotPrice ? candle[CANDLE.LOW] :
      const normalIndex = ((firstsCandlesLength - 1) - i)
      const last = !firstsCandles[normalIndex + 1]
      // CHECKING IF CANDLE BEFORE EXIST AND IF MEET REQUIREMENTS
      const candleBeforeCondition = firstsCandles[normalIndex - 1]
        ? tools.isRedCandle(firstsCandles[normalIndex - 1]) ||
      firstsCandles[normalIndex - 1][CANDLE.OPEN] >= candle[CANDLE.CLOSE]
        : false
      // CHECKING FIRST PIVOT PRICE
      firstPivot = firstPivot || candle
      // CONDITIONS TO BE CONSIDERED A PIVOT
      if (candle[CANDLE.LOW] < lastPivot[CANDLE.LOW] &&
        candleBeforeCondition &&
        candle[CANDLE.LOW] <= firstPivot[CANDLE.LOW] &&
        tools.isRedCandle(candle) &&
        !last &&
        tools.isBlueCandle(firstsCandles[normalIndex + 1])) {
        firstPriceIndex = normalIndex
        firstPivotRsi = firstsRsi[firstPriceIndex]
        firstPivot = candle
        // CONDITIONS TO BE CONSIDERED A DIVERGENCE
        const candleDivergence = firstPivot[CANDLE.LOW] < lastPivot[CANDLE.LOW]
        const candleCloseDivergence = firstPivot[CANDLE.CLOSE] < lastPivot[CANDLE.CLOSE]
        const rsiDivergence = firstPivotRsi > lastPivotRsi
        return (!!candleDivergence && !!rsiDivergence && !!candleCloseDivergence)
      }
      return false
    })

    if (isDivergence) return { lastTopOrBottomPrice, lastClosePrice }
  }

  return false
}

module.exports = {
  getInterval,
  validateEntry
}

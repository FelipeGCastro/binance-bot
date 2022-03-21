const rsi = require('../indicators/rsi.js')
const tools = require('../tools/index')

const CANDLE = require('../tools/constants').CANDLE
const Highest = require('technicalindicators').Highest
const Lowest = require('technicalindicators').Lowest
const POSITION = require('../tools/constants').POSITION_SIDE

const rsiPeriod = 14// 80 - 20
const lookBackPeriod = 26
const lastPivotRange = 6

function validateRegularDivergence (candles, side) {
  const rsiArray = rsi.checkingRsi(candles, rsiPeriod)
  const lastsRsi = tools.getLasts(rsiArray, lookBackPeriod)
  const lastsCandles = tools.getLasts(candles, lookBackPeriod)
  const lastSixCandles = tools.getLasts(lastsCandles, lastPivotRange)
  const lastSixRsi = tools.getLasts(rsiArray, lastPivotRange)
  const firstsCandlesLength = lookBackPeriod - lastPivotRange
  const firstsCandles = tools.getFirsts(lastsCandles, firstsCandlesLength)
  const firstsRsi = tools.getFirsts(lastsRsi, firstsCandlesLength)
  const lastClosePrice = lastSixCandles[lastSixCandles.length - 1][CANDLE.CLOSE]
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
        const candleDivergence = firstPivot[CANDLE.HIGH] < lastPivot[CANDLE.HIGH]
        const candleCloseDivergence = firstPivot[CANDLE.CLOSE] < lastPivot[CANDLE.CLOSE]
        const rsiDivergence = firstPivotRsi > lastPivotRsi
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
        const candleDivergence = firstPivot[CANDLE.LOW] > lastPivot[CANDLE.LOW]
        const candleCloseDivergence = firstPivot[CANDLE.CLOSE] > lastPivot[CANDLE.CLOSE]
        const rsiDivergence = firstPivotRsi < lastPivotRsi
        return (!!candleDivergence && !!rsiDivergence && !!candleCloseDivergence)
      }
      return false
    })

    if (isDivergence) return { lastTopOrBottomPrice, lastClosePrice }
  }

  return false
}

module.exports = validateRegularDivergence

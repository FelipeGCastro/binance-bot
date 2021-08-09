const rsi = require('../indicators/rsi.js')
const EMA = require('../indicators/ema.js')
const stoch = require('../indicators/stoch.js')
const tools = require('../tools/index')
const CANDLE = require('../tools/constants').CANDLE
const Highest = require('technicalindicators').Highest
const Lowest = require('technicalindicators').Lowest
const STRATEGIES = require('../tools/constants').STRATEGIES
const POSITION = require('../tools/constants').POSITION_SIDE

const periodTime = '1m'
const rsiPeriod = 14// 80 - 20
const stochPeriod = 14 // 80 - 20
const lookBackPeriod = 26
const lastPivotRange = 6

const getInterval = () => periodTime

function validateEntry (candles) {
  const trendingEma = validateEma(candles)
  const hasCrossStoch = validateStoch(candles)
  if (!hasCrossStoch) {
    console.log('SAIDA 1')
    return false
  } else {
    if (hasCrossStoch === trendingEma) {
      const divergence = validateDivergence(candles, hasCrossStoch)
      if (divergence) {
        const stopAndTarget = handleTpslOrder(divergence.lastTopOrBottomPrice, divergence.lastClosePrice)
        if (stopAndTarget) {
          return {
            strategy: STRATEGIES.HIDDEN_DIVERGENCE,
            timeLastCandle: candles[candles.length - 1][0],
            side: hasCrossStoch,
            stopPrice: stopAndTarget.stopPrice,
            targetPrice: stopAndTarget.targetPrice,
            closePrice: divergence.lastClosePrice
          }
        } else {
          console.log('SAIDA 1.5 - Erro ao setar stop price and target price ')
          return false
        }
      } else {
        console.log('SAIDA 2')
        return false
      }
    } else {
      console.log('SAIDA 3')
      return false
    }
  }
}

function handleTpslOrder (stopPrice, closePrice) {
  let targetPrice = ((closePrice - stopPrice) * 2) + Number(closePrice)

  targetPrice = tools.ParseFloatByFormat(targetPrice, closePrice)
  stopPrice = tools.ParseFloatByFormat(stopPrice, stopPrice)
  if (targetPrice && stopPrice) {
    return { targetPrice, stopPrice }
  } else {
    console.log('Error handleTpslOrder')
    return false
  }
}

function validateEma (candles) {
  const ema200 = EMA.checkingEma(candles, 200)
  const ema50 = EMA.checkingEma(candles, 50)
  console.log('EMA 200:', ema200, 'EMA50:', ema50)
  if (ema200 < ema50) {
    return POSITION.LONG
  } else {
    return POSITION.SHORT
  }
}

function validateStoch (candles) {
  const stochArray = stoch.checkingStoch(candles, stochPeriod)
  const lastTwoStoch = tools.getLasts(stochArray, 2)
  const lastK = lastTwoStoch[1].k
  const beforeK = lastTwoStoch[0].k
  const lastD = lastTwoStoch[1].d
  const beforeD = lastTwoStoch[0].d
  const crossDown = lastK <= lastD && beforeK > beforeD ? POSITION.SHORT : false
  const crossUp = lastK >= lastD && beforeK < beforeD ? POSITION.LONG : false
  console.log(lastTwoStoch[1].k, lastTwoStoch[1].d, 'validateStoch')
  if (crossDown) {
    return crossDown
  } else if (crossUp) {
    return crossUp
  } else {
    console.log('SAIDA 17')
    return false
  }
}

function validateDivergence (candles, side) {
  const rsiArray = rsi.checkingRsi(candles, rsiPeriod)
  const lastsRsi = tools.getLasts(rsiArray, lookBackPeriod)
  const lastsCandles = tools.getLasts(candles, lookBackPeriod)
  const lastSixCandles = tools.getLasts(lastsCandles, lastPivotRange)
  const lastSixRsi = tools.getLasts(rsiArray, lastPivotRange)
  const firstsCandlesLength = lookBackPeriod - lastPivotRange
  const firstsCandles = tools.getFirsts(lastsCandles, firstsCandlesLength)
  const firstsRsi = tools.getFirsts(lastsRsi, firstsCandlesLength)
  const lastClosePrice = lastSixCandles[lastSixCandles.length - 1][CANDLE.CLOSE]
  let lastPivotRsi, firstPivotRsi
  let lastPivotPrice, firstPivotPrice

  let lastPriceIndex, firstPriceIndex
  let lastPrice = 0
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
      if (candle[CANDLE.HIGH] > lastPrice &&
        candleBeforeCondition &&
        !last &&
        tools.isBlueCandle(candle) &&
        tools.isRedCandle(lastSixCandles[i + 1])) {
        lastPriceIndex = i
        lastPrice = candle[CANDLE.HIGH]
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
      console.log('SAIDA 5')
      return false
    }

    if (!lastPriceIndex) {
      console.log('SAIDA 6')
      return false
    }
    console.log(lastSixCandles.length, lastPriceIndex, 'linha132')
    lastPivotRsi = lastSixRsi[lastPriceIndex]
    lastPivotPrice = lastSixCandles[lastPriceIndex][CANDLE.HIGH]

    // FIRSTS 20 CANDLES
    // ----------------------------
    // ----------------------------
    // ----------------------------

    const firstsCandlesReversed = firstsCandles.slice().reverse()
    const isDivergence = firstsCandlesReversed.find((candle, i) => {
      const normalIndex = ((firstsCandlesLength - 1) - i)
      const last = !firstsCandles[normalIndex + 1]
      firstPivotPrice = firstPivotPrice || candle[CANDLE.HIGH]
      // CHECKING IF CANDLE BEFORE EXIST AND IF MEET REQUIREMENTS
      const candleBeforeCondition = firstsCandles[normalIndex - 1]
        ? tools.isBlueCandle(firstsCandles[normalIndex - 1]) ||
      firstsCandles[normalIndex - 1][CANDLE.OPEN] <= candle[CANDLE.CLOSE]
        : false
      // CONDITIONS TO BE CONSIDERED A PIVOT
      if (candle[CANDLE.HIGH] > lastPrice &&
        candleBeforeCondition &&
        candle[CANDLE.HIGH] >= firstPivotPrice &&
        tools.isBlueCandle(candle) &&
        !last &&
        tools.isRedCandle(firstsCandles[normalIndex + 1])) {
        firstPriceIndex = normalIndex
        firstPivotRsi = firstsRsi[firstPriceIndex]
        firstPivotPrice = firstsCandles[firstPriceIndex][CANDLE.HIGH]
        const candleDivergence = firstPivotPrice > lastPivotPrice
        const rsiDivergence = firstPivotRsi < lastPivotRsi
        return (!!candleDivergence && !!rsiDivergence)
      }
      return false
    })

    if (isDivergence) return { lastPivotPrice, lastTopOrBottomPrice, lastClosePrice }
  } else {
    lastSixCandles.forEach((candle, i) => {
      // CHECKING IF CANDLE BEFORE EXIST AND IF MEET REQUIREMENTS
      const candleBeforeCondition = lastSixCandles[i - 1]
        ? tools.isRedCandle(lastSixCandles[i - 1]) ||
      lastSixCandles[i - 1][CANDLE.OPEN] >= candle[CANDLE.CLOSE]
        : false
      // CHECKING LAST PRICE
      lastPrice = lastPrice || candle[CANDLE.LOW]
      const last = !lastSixCandles[i + 1]
      if (candle[CANDLE.LOW] <= lastPrice &&
        candleBeforeCondition &&
        !last &&
        tools.isRedCandle(candle) &&
        tools.isBlueCandle(lastSixCandles[i + 1])) {
        lastPriceIndex = i
        lastPrice = candle[CANDLE.LOW]
        lastTopOrBottomPrice = Lowest.calculate({
          values: [
            lastSixCandles[i - 1][CANDLE.LOW],
            lastSixCandles[i][CANDLE.LOW],
            lastSixCandles[i + 1][CANDLE.LOW]
          ],
          period: 3
        })[0]
      } else {
        console.log('SAIDA 10')
        return false
      }
    })

    if (lastPriceIndex < 2 || lastPriceIndex === 5) {
      console.log('SAIDA 11')
      return false
    }

    if (!lastPriceIndex) {
      console.log('SAIDA 12')
      return false
    }
    lastPivotRsi = lastSixRsi[lastPriceIndex]
    lastPivotPrice = lastSixCandles[lastPriceIndex][CANDLE.LOW]

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
      firstPivotPrice = firstPivotPrice || candle[CANDLE.LOW]
      // CONDITIONS TO BE CONSIDERED A PIVOT
      if (candle[CANDLE.LOW] < lastPrice &&
        candleBeforeCondition &&
        candle[CANDLE.LOW] <= firstPivotPrice &&
        tools.isRedCandle(candle) &&
        !last &&
        tools.isBlueCandle(firstsCandles[normalIndex + 1])) {
        firstPriceIndex = normalIndex
        firstPivotRsi = firstsRsi[firstPriceIndex]
        firstPivotPrice = candle[CANDLE.LOW]
        // CONDITIONS TO BE CONSIDERED A DIVERGENCE
        const candleDivergence = firstPivotPrice < lastPivotPrice
        const rsiDivergence = firstPivotRsi > lastPivotRsi
        return (!!candleDivergence && !!rsiDivergence)
      }
      return false
    })

    if (isDivergence) return { lastPivotPrice, lastTopOrBottomPrice, lastClosePrice }
  }

  console.log('SAIDA 16')

  return false
}

module.exports = {
  getInterval,
  validateEntry
}

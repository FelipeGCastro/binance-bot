const rsi = require('../indicators/rsi.js')
const EMA = require('../indicators/ema.js')
const stoch = require('../indicators/stoch.js')
const tools = require('../tools/index')
const CANDLE = require('../tools/constants').CANDLE

const periodTime = '1m'
const rsiPeriod = 14// 80 - 20
const stochPeriod = 14 // 80 - 20
const lookBackPeriod = 26
const lastPivotRange = 6

function validateEntry (candles) {
  const lastCandleTime = new Date(candles[candles.length - 1][0])
  const trendingEma = validateEma(candles)
  console.log(trendingEma)
  const hasCrossStoch = validateStoch(candles)
  if (!hasCrossStoch) {
    console.log('SAIDA 1')
    return false
  } else {
    // if (hasCrossStoch === trendingEma) {
    const validatedRsi = validateDivergence(candles, hasCrossStoch)
    if (validatedRsi) {
      return {
        timeLastCandle: `Hora: ${lastCandleTime.getHours()} e ${lastCandleTime.getMinutes()} minutos`,
        side: hasCrossStoch,
        stopPrice: validatedRsi.lastPivotPrice,
        stopPercentage: 0.5,
        gainPercentage: 0.5
      }
    } else {
      console.log('SAIDA 2')
      return false
    }
    // } else {
    //   console.log('SAIDA 3')
    //   return false
    // }
  }
}

function getInterval () {
  return periodTime
}

function validateEma (candles) {
  const ema200 = EMA.checkingEma(candles, 200)
  const ema50 = EMA.checkingEma(candles, 50)
  console.log('EMA 200:', ema200, 'EMA50:', ema50)
  if (ema200 < ema50) {
    return 'LONG'
  } else {
    return 'SHORT'
  }
}

function validateStoch (candles) {
  const stochArray = stoch.checkingStoch(candles, stochPeriod)
  const lastTwoStoch = tools.getLasts(stochArray, 2)
  const lastK = lastTwoStoch[1].k
  const beforeK = lastTwoStoch[0].k
  const lastD = lastTwoStoch[1].d
  const beforeD = lastTwoStoch[0].d
  const crossDown = lastK <= lastD && beforeK > beforeD ? 'SHORT' : false
  const crossUp = lastK >= lastD && beforeK < beforeD ? 'LONG' : false
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
  console.log(firstsCandles.length, firstsRsi.length, firstsCandlesLength, 'linha 84')
  let lastPivotRsi, firstPivotRsi
  let lastPivotPrice, firstPivotPrice
  // let lastSideCandleIndex, firstSideCandleIndex
  let lastPriceIndex, firstPriceIndex
  let lastPrice = 0
  if (side === 'SHORT') {
    // lastSixCandles.forEach((candle, i) => {
    //   if (tools.isBlueCandle(candle)) lastSideCandleIndex = i
    // })

    // if (lastSideCandleIndex < 2) {
    //   console.log('SAIDA 4')
    //   return false
    // }

    lastSixCandles.forEach((candle, i) => {
      if (candle[CANDLE.HIGH] > lastPrice &&
        tools.isBlueCandle(candle) &&
        tools.isRedCandle(lastSixCandles[i + 1])) {
        lastPriceIndex = i
        lastPrice = candle[CANDLE.HIGH]
      }
    })

    if (lastPriceIndex < 2 || lastPriceIndex === 5) {
      console.log('SAIDA 5')
      return false
    }
    lastPivotRsi = lastSixRsi[lastPriceIndex]
    lastPivotPrice = lastSixCandles[lastPriceIndex][CANDLE.HIGH]

    if (!tools.isBlueCandle(lastSixCandles[lastPriceIndex]) ||
    !tools.isBlueCandle(lastSixCandles[lastPriceIndex - 1])) {
      console.log('SAIDA 6')
      return false
    }

    // FIRSTS 20 CANDLES
    // ----------------------------
    // ----------------------------
    // ----------------------------

    // firstsCandles.forEach((candle, i) => {
    //   if (tools.isBlueCandle(candle)) firstSideCandleIndex = i
    // })

    // if (firstSideCandleIndex < 2) {
    //   console.log('SAIDA 7')
    //   return false
    // }
    const firstsCandlesReversed = firstsCandles.slice().reverse()
    const isDivergence = firstsCandlesReversed.find((candle, i) => {
      const normalIndex = ((firstsCandlesLength - 1) - i) + 1 === firstsCandlesLength ? ((firstsCandlesLength - 1) - i) : ((firstsCandlesLength - 1) - i) + 1
      const last = !firstsCandles[normalIndex + 1]
      if (candle[CANDLE.HIGH] > lastPrice &&
        tools.isBlueCandle(candle) &&
        !last &&
        tools.isRedCandle(firstsCandles[normalIndex + 1])) {
        firstPriceIndex = normalIndex
        firstPivotRsi = firstsRsi[firstPriceIndex]
        console.log(firstsCandles.length, firstsCandlesLength, firstPriceIndex, 'isDivergence, linha 143')
        firstPivotPrice = firstsCandles[firstPriceIndex][CANDLE.HIGH]

        const candleDivergence = firstPivotPrice > lastPivotPrice
        const rsiDivergence = firstPivotRsi < lastPivotRsi
        return (!!candleDivergence && !!rsiDivergence)
      }
      return false
    })

    if (isDivergence) return { lastPivotPrice }

    // firstsCandles.forEach((candle, i) => {
    //   if (candle[CANDLE.HIGH] > firstPrice) {
    //     firstPriceIndex = i
    //     firstPrice = candle[CANDLE.HIGH]
    //   }
    // })

    // if (firstPriceIndex < 2) {
    //   console.log('SAIDA 8')
    //   return false
    // }
    // firstPivotRsi = firstsRsi[firstPriceIndex]
    // firstPivotPrice = firstsCandles[firstPriceIndex][CANDLE.HIGH]

    // if (!tools.isBlueCandle(firstsCandles[firstPriceIndex]) ||
    // !tools.isBlueCandle(firstsCandles[firstPriceIndex - 1])) {
    //   console.log('SAIDA 9')
    //   return false
    // }

    // const candleDivergence = firstPivotPrice > lastPivotPrice
    // const rsiDivergence = firstPivotRsi < lastPivotRsi
    // if (!!candleDivergence && !!rsiDivergence) {
    //   return { lastPivotPrice }
    // }
  } else {
    // lastSixCandles.forEach((candle, i) => {
    //   if (tools.isRedCandle(candle)) lastSideCandleIndex = i
    // })

    // if (lastSideCandleIndex < 2) {
    //   console.log('SAIDA 10')
    //   return false
    // }

    lastSixCandles.forEach((candle, i) => {
      if (lastPrice === 0) {
        lastPriceIndex = i
        lastPrice = 1000000
      } else if (candle[CANDLE.LOW] < lastPrice &&
        tools.isRedCandle(candle) &&
        tools.isBlueCandle(lastSixCandles[i + 1])) {
        lastPriceIndex = i
        lastPrice = candle[CANDLE.LOW]
      }
    })

    if (lastPriceIndex < 2 || lastPriceIndex === 5) {
      console.log('SAIDA 11')
      return false
    }
    lastPivotRsi = lastSixRsi[lastPriceIndex]
    lastPivotPrice = lastSixCandles[lastPriceIndex][CANDLE.LOW]

    if (!tools.isRedCandle(lastSixCandles[lastPriceIndex]) ||
      !tools.isBlueCandle(lastSixCandles[lastPriceIndex + 1])) {
      console.log('SAIDA 12')
      return false
    }

    // firsts 20 candles
    // ----------------------------
    // ----------------------------
    // ----------------------------

    // firstsCandles.forEach((candle, i) => {
    //   if (tools.isRedCandle(candle)) firstSideCandleIndex = i
    // })

    // if (firstSideCandleIndex < 2) {
    //   console.log('SAIDA 13')
    //   return false
    // }
    // [1,2,3,4,5,6,7,8,9]
    // [9,8,7,6,5,4,3,2,1] 8 - 6
    const firstsCandlesReversed = firstsCandles.slice().reverse()
    const isDivergence = firstsCandlesReversed.find((candle, i) => {
      const normalIndex = ((firstsCandlesLength - 1) - i) + 1 === firstsCandlesLength ? ((firstsCandlesLength - 1) - i) : ((firstsCandlesLength - 1) - i) + 1
      console.log(firstsCandles.length, normalIndex, firstsCandlesLength, i, 'isDivergence, linha 234')
      const last = !firstsCandles[normalIndex + 1]
      if (candle[CANDLE.LOW] < lastPrice &&
        tools.isRedCandle(candle) &&
        !last &&
        tools.isBlueCandle(firstsCandles[normalIndex + 1])) {
        firstPriceIndex = normalIndex
        firstPivotRsi = firstsRsi[firstPriceIndex]
        console.log(firstsCandles.length, firstsCandlesLength, firstPriceIndex, 'isDivergence, linha 240')
        firstPivotPrice = firstsCandles[firstPriceIndex][CANDLE.LOW]

        const candleDivergence = firstPivotPrice < lastPivotPrice
        const rsiDivergence = firstPivotRsi > lastPivotRsi
        return (!!candleDivergence && !!rsiDivergence)
      }
      console.log('SAIDA 15')
      return false
    })

    if (isDivergence) return { lastPivotPrice }

    // firstsCandles.forEach((candle, i) => {
    //   if (firstPrice === 0) {
    //     firstPriceIndex = i
    //     firstPrice = 1000000
    //   } else if (candle[CANDLE.LOW] < firstPrice &&
    //     tools.isRedCandle(candle) &&
    //     tools.isBlueCandle(lastSixCandles[i + 1])) {
    //     firstPriceIndex = i
    //     firstPrice = candle[CANDLE.LOW]
    //   }
    // })

    // if (firstPriceIndex < 2) {
    //   console.log('SAIDA 14')
    //   return false
    // }
    // firstPivotRsi = firstsRsi[firstPriceIndex]
    // firstPivotPrice = firstsCandles[firstPriceIndex][CANDLE.LOW]

    // if (!tools.isRedCandle(firstsCandles[firstPriceIndex]) ||
    //   !tools.isBlueCandle(firstsCandles[firstPriceIndex + 1])) {
    //   console.log('SAIDA 15')
    //   return false
    // }

    // const candleDivergence = firstPivotPrice < lastPivotPrice
    // const rsiDivergence = firstPivotRsi > lastPivotRsi
    // if (!!candleDivergence && !!rsiDivergence) {
    //   return { lastPivotPrice }
    // }
  }

  console.log('SAIDA 16')

  return false
}

module.exports = {
  getInterval,
  validateEntry
}

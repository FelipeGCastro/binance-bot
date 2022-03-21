
const { Highest, Lowest } = require('technicalindicators')
const api = require('../services/api.js')
const { SIDE } = require('../tools/constants')
const { ParseFloatByFormat, getPercentage, extractData, getLasts } = require('../tools/index.js')
const POSITION = require('../tools/constants').POSITION_SIDE
const CANDLE = require('../tools/constants').CANDLE

async function verifyOpenOrders (symbol) {
  const openOrders = await api.getAllOpenOrders(symbol)
  if (openOrders[0]) {
    return true
  } else {
    return false
  }
}

function handleAddCandle (newCandle, allCandles) {
  const candles = allCandles
  const newCandleMapped = [
    newCandle.k.t,
    newCandle.k.o,
    newCandle.k.h,
    newCandle.k.l,
    newCandle.k.c,
    newCandle.k.v,
    newCandle.k.T,
    newCandle.k.q,
    newCandle.k.n,
    newCandle.k.V,
    newCandle.k.Q
  ]
  candles.push(newCandleMapped)
  return candles
}

function handleTrendingValidation (trendingEma, candles) {
  if (
    trendingEma.position === POSITION.SHORT &&
    trendingEma.ema200 < candles[candles.length - 1][CANDLE.CLOSE]
  ) {
    return false
  } else if (
    trendingEma.position === POSITION.LONG &&
    trendingEma.ema200 > candles[candles.length - 1][CANDLE.CLOSE]
  ) {
    return false
  } else {
    return true
  }
}

function getStopAndTargetPrice ({
  candles,
  entryPrice,
  positionSideOrSide,
  stopLossPercentage = 2,
  takeProfitPercentage = 4
}) {
  const isSell = positionSideOrSide === POSITION.SHORT || positionSideOrSide === SIDE.SELL
  const lastCandles = getLasts(candles, 6)
  let stopPrice
  if (isSell) {
    const onlyHighPrices = extractData(lastCandles, 'HIGH')
    stopPrice = Highest.calculate({
      values: onlyHighPrices,
      period: 6
    })[0]
  } else {
    const onlyLowPrices = extractData(lastCandles, 'LOW')
    stopPrice = Lowest.calculate({
      values: onlyLowPrices,
      period: 6
    })[0]
  }

  let targetPrice
  const percentage = getPercentage(entryPrice, stopPrice)
  const data = {}
  let breakevenTriggerPrice = ((entryPrice - stopPrice) * 1.5) + Number(entryPrice)
  let riseStopTriggerPrice = ((entryPrice - stopPrice) * 1.8) + Number(entryPrice)
  breakevenTriggerPrice = ParseFloatByFormat(breakevenTriggerPrice, stopPrice)
  riseStopTriggerPrice = ParseFloatByFormat(riseStopTriggerPrice, stopPrice)
  data.breakevenTriggerPrice = breakevenTriggerPrice
  data.riseStopTriggerPrice = riseStopTriggerPrice
  const targetCalc = ((entryPrice * takeProfitPercentage) / 100)
  const targetCalculate = isSell ? targetCalc - entryPrice : entryPrice + targetCalc
  targetPrice = ParseFloatByFormat(targetCalculate, entryPrice)
  data.targetPrice = targetPrice
  if (percentage > stopLossPercentage) {
    const stopCalc = ((entryPrice * stopLossPercentage) / 100)
    const stopCalculate = isSell ? stopCalc + entryPrice : entryPrice - stopCalc
    stopPrice = ParseFloatByFormat(stopCalculate, entryPrice)
    data.stopPrice = stopPrice
    return data
  }

  targetPrice = ParseFloatByFormat(targetPrice, entryPrice)
  stopPrice = ParseFloatByFormat(stopPrice, entryPrice)
  if (targetPrice && stopPrice) {
    const data = { targetPrice, stopPrice }
    data.breakevenTriggerPrice = breakevenTriggerPrice
    data.riseStopTriggerPrice = riseStopTriggerPrice

    return data
  } else {
    const stopCalc = ((entryPrice * stopLossPercentage) / 100)
    const stopCalculate = isSell ? stopCalc + entryPrice : entryPrice - stopCalc
    stopPrice = ParseFloatByFormat(stopCalculate, entryPrice)
    data.stopPrice = stopPrice
    return data
  }
}

module.exports = {
  verifyOpenOrders,
  handleAddCandle,
  handleTrendingValidation,
  getStopAndTargetPrice
}

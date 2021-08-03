const api = require('../api')
const highest = require('technicalindicators').Highest
const lowest = require('technicalindicators').Lowest
const tools = require('../tools/index')
const defaultSymbol = process.env.SYMBOL
const ORDER_TYPE = {
  MARKET: handleMarketOrder,
  STOP_MARKET: handleStopMarketOrder,
  TAKE_PROFIT_MARKET: handleTakeProfitMarketOrder
}
let position
async function handleUserDataUpdate (data, candles) {
  if (data.e === 'ACCOUNT_UPDATE') {
    console.log('ACCOUNT_UPDATE')
    const positionFiltered = data.a.P.filter(pos => (pos.s === defaultSymbol))
    if (positionFiltered[0]) position = positionFiltered[0]
  } else if (data.e === 'ORDER_TRADE_UPDATE') {
    if (data.o.s === defaultSymbol) {
      if (data.o.X === 'FILLED') {
        if (position.pa !== '0') {
          const result = ORDER_TYPE[data.o.o](candles, data.o) || null
          if (!result) { console.log('Other type of order') }
        } else {
          hasStopOrProfitOrder()
        }
      } else if (data.o.X === 'CANCELED') {
        console.log('CANCELED')
        hasStopOrProfitOrder()
      } else {
        console.log('type:', data.o.o, 'status:', data.o.X, 'type:', data.o.x)
      }
    } else {
      console.log('Other Coin or Other Status then filled or canceled')
    }
  }
}

async function handleMarketOrder (candles, orderInfo) {
  createTpandSLOrder(orderInfo, candles)
}

async function createTpandSLOrder (orderInfo, candles) {
  const sideOption = orderInfo.S === 'SELL'
  const highOrLow = tools.extractData(candles, sideOption ? 'HIGH' : 'LOW')
  const topOrBottomPrices = tools.getLasts(highOrLow, 6)
  const stopPrice = (sideOption ? highest : lowest).calculate({ values: topOrBottomPrices, period: 6 })[0]
  const stopMarketPrice = tools.handleStopPercentage(orderInfo.L, stopPrice, orderInfo.S)
  const takeProfitPrice = tools.getTargetPrice(orderInfo.L, stopMarketPrice)
  // const { stopPrice: stopMarketPrice, takeProfitPrice } = tools.getTpAndSlByPer(orderInfo.L, orderInfo.S)
  const side = sideOption ? 'BUY' : 'SELL'
  console.log('TP:', takeProfitPrice, 'PRICE:', orderInfo.L, 'SL:', stopMarketPrice, side, 'AP', orderInfo.ap, 'createTpandSLOrder')
  await api.newOrder(defaultSymbol, null, side, 'STOP_MARKET', true, stopMarketPrice)
  await api.newOrder(defaultSymbol, null, side, 'TAKE_PROFIT_MARKET', true, takeProfitPrice)
}

async function hasStopOrProfitOrder () {
  const openOrders = await api.getAllOpenOrders(defaultSymbol)
  const hasStopOrProfit = openOrders.filter(order => (order.type === 'STOP_MARKET' || order.type === 'TAKE_PROFIT_MARKET'))

  if (hasStopOrProfit[0]) {
    console.log('has profit ou stop order')
    await api.cancelAllOrders(defaultSymbol)
  }

  return !!hasStopOrProfit[0]
}

async function handleStopMarketOrder (candles, orderInfo) {
  const cancelOrder = await api.cancelAllOrders(defaultSymbol)
  return cancelOrder
}
async function handleTakeProfitMarketOrder (candles, orderInfo) {
  const cancelOrder = await api.cancelAllOrders(defaultSymbol)
  return cancelOrder
}

// "s":"BTCUSDT",              // Symbol
// "c":"TEST",                 // Client Order Id
// "S":"SELL",                 // Side
// "o":"TRAILING_STOP_MARKET", // Order Type
// "x":"NEW",                  // Execution Type
// "X":"NEW",                  // Order Status
// "ap":"0",                   // Average Price
module.exports = {
  handleUserDataUpdate,
  hasStopOrProfitOrder
}
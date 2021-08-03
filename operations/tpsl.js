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
async function handleOrderUpdate (data, candles) {
  if (data.o.s === defaultSymbol) {
    if (data.o.X === 'FILLED') {
      const result = ORDER_TYPE[data.o.o](candles, data.o) || null
      console.log(data)
      if (!result) { console.log('Other type of order') }
    } else if (data.o.X === 'CANCELED') {
      console.log('CANCELED')
      if (data.o.o === 'MARKET') {
        await hasStopOrProfitOrder()
      }
      console.log(data.o)
    } else {
      console.log('type:', data.o.o, 'status:', data.o.X, 'type:', data.o.x)
    }
  } else {
    console.log('Other Coin or Other Status then filled or canceled')
  }
}

async function handleMarketOrder (candles, orderInfo) {
  console.log(orderInfo, 'HandleMarketOrder')
  const stopOrProfit = await hasStopOrProfitOrder()
  if (stopOrProfit) {
    return 'Canceled All Open orders'
  } else if (orderInfo.x === 'NEW') {
    console.log(orderInfo)
    const sideOption = orderInfo.S === 'SELL'
    const topOrBottomPrices = tools.extractData(candles, sideOption ? 'HIGH' : 'LOW')
    const stopMarketPrice = (sideOption ? highest : lowest).calculate({ values: topOrBottomPrices, period: 3 })[0]
    const takeProfitPrice = tools.getTargetPrice(orderInfo.ap, stopMarketPrice)
    const side = sideOption ? 'BUY' : 'SELL'
    console.log(takeProfitPrice, side)
    // await api.newOrder(defaultSymbol, null, side, 'STOP_MARKET', true, stopMarketPrice)
    // await api.newOrder(defaultSymbol, null, side, 'TAKE_PROFIT_MARKET', true, takeProfitPrice)
  }
}

async function hasStopOrProfitOrder () {
  const openOrders = await api.getAllOpenOrders(defaultSymbol)
  const hasStopOrProfit = openOrders.filter(order => (order.type === 'STOP_MARKET' || order.type === 'TAKE_PROFIT_MARKET'))

  if (hasStopOrProfit[0]) {
    console.log('has profit ou stop order', hasStopOrProfit)
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
  handleOrderUpdate
}

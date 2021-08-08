const api = require('../api')
const telegram = require('../services/telegram')
const home = require('../index')

let stopMarketPrice, takeProfitPrice
let position
const setStopMarketPrice = (price) => { stopMarketPrice = price }
const getStopMarketPrice = () => stopMarketPrice
const setTakeProfitPrice = (price) => { takeProfitPrice = price }
const getTakeProfitPrice = () => takeProfitPrice

async function handleUserDataUpdate (data) {
  const symbol = home.getSymbol()
  if (data.e === 'ACCOUNT_UPDATE') {
    console.log('ACCOUNT_UPDATE')
    setPosition(data)
  } else if (data.e === 'ORDER_TRADE_UPDATE') {
    if (data.o.s === symbol) {
      if (data.o.X === 'FILLED') {
        handleFilledOrder(data.o)
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

// function createNewOrder (data) {

// }

function setPosition (data) {
  const symbol = home.getSymbol()
  const positionFiltered = data.a.P.filter(pos => (pos.s === symbol))
  position = positionFiltered[0] || { pa: '0' }
}

async function handleFilledOrder (order) {
  if (position.pa !== '0') {
    if (order.o === 'MARKET') {
      createTpandSLOrder(order)
    } else if (order.o === 'STOP_MARKET') {
      handleStopMarketOrder()
    } else if (order.o === 'TAKE_PROFIT_MARKET') {
      handleTakeProfitMarketOrder()
    } else { console.log('Other type of order') }
  } else {
    hasStopOrProfitOrder()
  }
  telegram.sendMessage(`Order Type: ${order.o},
  Side: ${order.S},
  Last Price: ${order.L}`)
}

async function createTpandSLOrder (order) {
  const symbol = home.getSymbol()
  const orderIsSell = order.S === 'SELL'
  const side = orderIsSell ? 'BUY' : 'SELL'

  if (!stopMarketPrice || !takeProfitPrice) {
    console.log('No TP or SL price')
    return false
  }
  console.log(symbol, side, stopMarketPrice, takeProfitPrice, 'createTpandSLOrder')

  // await api.newOrder(symbol, null, side, 'STOP_MARKET', true, stopMarketPrice)
  // await api.newOrder(symbol, null, side, 'TAKE_PROFIT_MARKET', true, takeProfitPrice)
}

async function hasStopOrProfitOrder () {
  const symbol = home.getSymbol()
  const openOrders = await api.getAllOpenOrders(symbol)
  const hasStopOrProfit = openOrders.filter(order => (order.type === 'STOP_MARKET' || order.type === 'TAKE_PROFIT_MARKET'))

  if (hasStopOrProfit[0]) {
    console.log('has profit ou stop order')
    await api.cancelAllOrders(symbol)
  }

  return !!hasStopOrProfit[0]
}

async function handleStopMarketOrder () {
  const symbol = home.getSymbol()
  const cancelOrder = await api.cancelAllOrders(symbol)
  return cancelOrder
}
async function handleTakeProfitMarketOrder () {
  const symbol = home.getSymbol()
  const cancelOrder = await api.cancelAllOrders(symbol)
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
  hasStopOrProfitOrder,
  setStopMarketPrice,
  getStopMarketPrice,
  setTakeProfitPrice,
  getTakeProfitPrice
}

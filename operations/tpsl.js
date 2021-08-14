const api = require('../services/api')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const SIDE = require('../tools/constants').SIDE

async function createTpandSLOrder (order) {
  const { stopMarketPrice, takeProfitPrice, symbol } = order.trade
  const orderIsSell = order.S === SIDE.SELL
  const side = orderIsSell ? SIDE.BUY : SIDE.SELL

  if (!stopMarketPrice || !takeProfitPrice) {
    return false
  }

  const stopOrder = await api.newOrder(symbol, null, side, ORDER_TYPE.STOP_MARKET, true, stopMarketPrice)
  const profitOrder = await api.newOrder(symbol, null, side, ORDER_TYPE.TAKE_PROFIT_MARKET, true, takeProfitPrice)
  if (!stopOrder) {
    console.log('Error create stop market order')
    return false
  }
  order.updateTradesOn(symbol, 'stopOrderCreated', true)
  if (!profitOrder) {
    console.log('Error create take profit order')
    return false
  }
  order.updateTradesOn(symbol, 'profitOrderCreated', true)
  return true
}

module.exports = {
  createTpandSLOrder
}

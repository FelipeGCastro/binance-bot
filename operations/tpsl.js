const api = require('../services/api')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const telegram = require('../services/telegram')
const { SIDE, TRADES_ON } = require('../tools/constants')

async function createTpandSLOrder (order) {
  const { stopMarketPrice, takeProfitPrice, symbol } = order.trade
  const orderIsSell = order.S === SIDE.SELL
  const side = orderIsSell ? SIDE.BUY : SIDE.SELL

  if (!stopMarketPrice || !takeProfitPrice) {
    return false
  }
  if (order.symbol !== symbol) {
    console.log('No match in Symbols to create TPSL')
    return false
  }

  await handleVerifyAndCreateTpSl(symbol, side, stopMarketPrice, takeProfitPrice, order.updateTradesOn, order.account)
}

async function handleVerifyAndCreateTpSl (symbol, side, stopMarketPrice, takeProfitPrice, updateTradesOn, account) {
  const openOrders = await api.getAllOpenOrders(account, symbol)

  if (openOrders[0]) {
    const hasStopLossOrder = openOrders.find(order => order.type === 'STOP_MARKET')
    const hasTakeProfitOrder = openOrders.find(order => order.type === 'TAKE_PROFIT_MARKET')

    if (!hasStopLossOrder) await createTpOrSlOrder(ORDER_TYPE.STOP_MARKET, stopMarketPrice)
    if (!hasTakeProfitOrder) await createTpOrSlOrder(ORDER_TYPE.TAKE_PROFIT_MARKET, takeProfitPrice)
  } else {
    const isStopLossCreated = await createTpOrSlOrder(ORDER_TYPE.STOP_MARKET, stopMarketPrice)
    const isTakeProfitCreated = await createTpOrSlOrder(ORDER_TYPE.TAKE_PROFIT_MARKET, takeProfitPrice)
    return isStopLossCreated && isTakeProfitCreated
  }

  async function createTpOrSlOrder (type, price) {
    const ordered = await api.newOrder(account, symbol, null, side, type, true, price)
    const tradesOnKey = type === ORDER_TYPE.TAKE_PROFIT_MARKET ? TRADES_ON.PROFIT_CREATED : TRADES_ON.STOP_CREATED
    if (!ordered) {
      updateTradesOn(account, symbol, tradesOnKey, false)
      telegram.sendMessage(`Problem ao criar ${type} Order para ${symbol}`)
      console.log(`Error creating ${type} order`)
      return false
    } else {
      updateTradesOn(account, symbol, tradesOnKey, true)
      return true
    }
  }
}

module.exports = {
  createTpandSLOrder,
  handleVerifyAndCreateTpSl
}

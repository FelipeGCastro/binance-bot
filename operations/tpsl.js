const api = require('../services/api')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const telegram = require('../services/telegram')
const { SIDE, TRADES_ON } = require('../tools/constants')
const getAccountState = require('../states/account')

async function createTpandSLOrder (order) {
  const { stopMarketPrice, takeProfitPrice, symbol } = order.trade
  const orderIsSell = order.S === SIDE.SELL
  const side = orderIsSell ? SIDE.BUY : SIDE.SELL

  if (!stopMarketPrice || !takeProfitPrice) return false

  return await handleVerifyAndCreateTpSl(symbol, side, stopMarketPrice, takeProfitPrice, order.account)
}

async function handleVerifyAndCreateTpSl (symbol, side, stopMarketPrice, takeProfitPrice, account) {
  const { updateTradesOn } = await getAccountState(account)

  const isStopLossCreated = await createOrder(ORDER_TYPE.STOP_MARKET, stopMarketPrice)
  const isTakeProfitCreated = await createOrder(ORDER_TYPE.TAKE_PROFIT_MARKET, takeProfitPrice)
  return isStopLossCreated && isTakeProfitCreated

  async function createOrder (type, price) {
    const ordered = await api.newOrder(account, symbol, null, side, type, true, price)
    const tradesOnCreatedKey = type === ORDER_TYPE.TAKE_PROFIT_MARKET ? TRADES_ON.PROFIT_CREATED : TRADES_ON.STOP_CREATED
    const tradesOnIDKey = type === ORDER_TYPE.TAKE_PROFIT_MARKET ? TRADES_ON.TAKE_PROFIT_ID : TRADES_ON.STOP_LOSS_ID
    if (!ordered) {
      await updateTradesOn(symbol, tradesOnCreatedKey, false)
      telegram.sendMessage(account, `Problem ao criar ${type} Order para ${symbol},`)
      console.log(`Error creating ${type} order`)
      return false
    } else {
      await updateTradesOn(symbol, tradesOnIDKey, ordered.orderId)
      await updateTradesOn(symbol, tradesOnCreatedKey, true)
      return true
    }
  }
}

module.exports = {
  createTpandSLOrder,
  handleVerifyAndCreateTpSl
}

const api = require('../services/api')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const telegram = require('../services/telegram')
const { SIDE } = require('../tools/constants')

async function createTpandSLOrder ({
  stopPrice,
  targetPrice,
  symbol,
  quantity,
  orderSide
}) {
  const orderIsSell = orderSide === SIDE.SELL
  const side = orderIsSell ? SIDE.BUY : SIDE.SELL

  if (!stopPrice || !targetPrice) return false

  return await handleVerifyAndCreateTpSl({
    symbol,
    side,
    stopPrice,
    targetPrice,
    quantity
  })
}

async function handleVerifyAndCreateTpSl ({
  symbol,
  side,
  stopPrice,
  targetPrice,
  quantity
}) {
  const isStopLossCreated = await createOrder(ORDER_TYPE.STOP_MARKET, stopPrice)
  const isTakeProfitCreated = await createOrder(ORDER_TYPE.TAKE_PROFIT_MARKET, targetPrice)
  return isStopLossCreated && isTakeProfitCreated

  async function createOrder (type, price) {
    const ordered = await api.newOrder(symbol, null, side, type, true, price)
    if (!ordered) {
      telegram.sendMessage(`Problem ao criar ${type} Order para ${symbol}, price: ${price}`, true)
      console.log(`Error creating ${type} order, price: ${price}`)
      const orderedClose = await api.newOrder(symbol, quantity, side, ORDER_TYPE.MARKET)
      if (orderedClose) telegram.sendMessage(`Posição fechada por erro ao criar TPSL: ${type} Order para ${symbol},`, true)
      return false
    } else {
      return true
    }
  }
}

module.exports = {
  createTpandSLOrder
}

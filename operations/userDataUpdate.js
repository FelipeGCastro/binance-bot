const api = require('../services/api')
const telegram = require('../services/telegram')
const { ORDER_TYPE } = require('../tools/constants')
const { createTpandSLOrder } = require('./tpsl')

async function handleUserDataUpdate (order) {
  if (order.X === 'FILLED' && order.o === ORDER_TYPE.MARKET) {
    createTpandSLOrder(order)
  } else if (
    order.X === 'FILLED' &&
      (
        order.o === ORDER_TYPE.STOP_MARKET ||
        order.o === ORDER_TYPE.TAKE_PROFIT_MARKET
      )) {
    await api.cancelAllOrders(order.s)
    tpslOrderFilled()
  }
  console.log('order status: ', order.X, 'order symbol: ', order.s)
}

// STOPPING HERE, CONTINUE REMOVING

async function tpslOrderFilled (order) {
  const balanceData = await api.getBalance()
  const balance = balanceData.filter((coin) => (coin.asset === 'USDT'))[0].availableBalance
  telegram.sendMessage(`Trading finished, balance: ${balance}`)
}

module.exports = {
  handleUserDataUpdate,
  tpslOrderFilled
}

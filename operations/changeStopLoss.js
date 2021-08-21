const api = require('../services/api')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const { SIDE } = require('../tools/constants')
const telegram = require('../services/telegram')

function verifyRiseStop (account, data, trade, updateTradesOn) {
  if (trade.side === SIDE.BUY) {
    if (trade.riseStopTriggerPrice < data.k.c) {
      console.log('riseStopFunction')

      changeStopLoss(account, trade.riseStopTriggerPrice, trade, updateTradesOn)
    } else if (trade.breakevenTriggerPrice < data.k.c) {
      console.log('breakevenFunction')

      changeStopLoss(account, trade.breakevenTriggerPrice, trade, updateTradesOn)
    }
  } else if (trade.side === SIDE.SELL) {
    if (trade.riseStopTriggerPrice > data.k.c) {
      console.log('riseStopFunction')

      changeStopLoss(account, trade.riseStopTriggerPrice, trade, updateTradesOn)
    } else if (trade.breakevenTriggerPrice > data.k.c) {
      console.log('breakevenFunction')
      changeStopLoss(account, trade.breakevenTriggerPrice, trade, updateTradesOn)
    }
  } else return false
}

async function changeStopLoss (account, stopPrice, trade, updateTradesOn) {
  const { side, symbol } = trade
  const stopSide = side === SIDE.SELL ? SIDE.BUY : SIDE.SELL

  const openOrders = await api.getAllOpenOrders(account, symbol)

  if (openOrders[0]) {
    const hasStopLossOrder = openOrders.find(order => order.type === 'STOP_MARKET')
    const createdNewStopLoss = await createStopLossOrder(stopPrice)
    if (createdNewStopLoss && hasStopLossOrder) {
      await api.cancelOrder(account, symbol, hasStopLossOrder.orderId)
    }
  } else {
    createStopLossOrder(stopPrice)
  }

  async function createStopLossOrder (price) {
    const ordered = await api.newOrder(account, symbol, null, stopSide, ORDER_TYPE.STOP_MARKET, true, price)
    if (!ordered) {
      updateTradesOn(account, symbol, 'stopOrderCreated', false)
      telegram.sendMessage(`Problem MUDAR o ${ORDER_TYPE.STOP_MARKET} Order para ${symbol}`)
      console.log(`Error CHANGING ${ORDER_TYPE.STOP_MARKET} order`)
      return false
    } else {
      updateTradesOn(account, symbol, 'stopOrderCreated', true)
      return true
    }
  }
}

module.exports = {
  changeStopLoss,
  verifyRiseStop
}

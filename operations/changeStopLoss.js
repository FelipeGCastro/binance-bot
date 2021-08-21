const api = require('../services/api')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const { SIDE, TRADES_ON } = require('../tools/constants')
const telegram = require('../services/telegram')

function verifyRiseStop (account, data, trade, updateTradesOn) {
  let stopPrice
  if (trade[TRADES_ON.SIDE] === SIDE.BUY) {
    if (trade[TRADES_ON.RISE_STOP_PRICE] < data.k.c) {
      console.log('riseStopFunction')
      stopPrice = trade[TRADES_ON.ENTRY_PRICE] > data.k.l ? trade.entryPrice : data.k.l

      changeStopLoss(account, stopPrice, trade, updateTradesOn, TRADES_ON.RISE_STOP_CREATED)
    } else if (!trade[TRADES_ON.BREAKEVEN_CREATED] && trade[TRADES_ON.BREAKEVEN_PRICE] < data.k.c) {
      console.log('breakevenFunction')

      changeStopLoss(account, trade[TRADES_ON.ENTRY_PRICE], trade, updateTradesOn, TRADES_ON.BREAKEVEN_CREATED)
    }
  } else if (trade[TRADES_ON.SIDE] === SIDE.SELL) {
    if (trade[TRADES_ON.RISE_STOP_PRICE] > data.k.c) {
      console.log('riseStopFunction')
      stopPrice = trade[TRADES_ON.ENTRY_PRICE] < data.k.h ? trade[TRADES_ON.ENTRY_PRICE] : data.k.h
      changeStopLoss(account, stopPrice, trade, updateTradesOn, TRADES_ON.RISE_STOP_CREATED)
    } else if (!trade[TRADES_ON.BREAKEVEN_CREATED] && trade[TRADES_ON.BREAKEVEN_PRICE] > data.k.c) {
      console.log('breakevenFunction')
      changeStopLoss(account, trade[TRADES_ON.ENTRY_PRICE], trade, updateTradesOn, TRADES_ON.BREAKEVEN_CREATED)
    }
  } else return false
}

async function changeStopLoss (account, stopPrice, trade, updateTradesOn, operationType) {
  const { side, symbol } = trade
  const stopSide = side === SIDE.SELL ? SIDE.BUY : SIDE.SELL

  const openOrders = await api.getAllOpenOrders(account, symbol)

  if (openOrders[0]) {
    const hasStopLossOrder = openOrders.find(order => order.type === 'STOP_MARKET')
    const createdNewStopLoss = await createStopLossOrder()
    if (createdNewStopLoss && hasStopLossOrder) {
      await api.cancelOrder(account, symbol, hasStopLossOrder.orderId)
    }
  } else {
    await createStopLossOrder()
  }

  async function createStopLossOrder () {
    const ordered = await api.newOrder(account, symbol, null, stopSide, ORDER_TYPE.STOP_MARKET, true, stopPrice)
    if (!ordered) {
      updateTradesOn(account, symbol, operationType, false)
      telegram.sendMessage(`Problem MUDAR o ${ORDER_TYPE.STOP_MARKET} Order para ${symbol}`)
      console.log(`Error CHANGING ${ORDER_TYPE.STOP_MARKET} order`)
      return false
    } else {
      updateTradesOn(account, symbol, operationType, true)
      return true
    }
  }
}

module.exports = {
  changeStopLoss,
  verifyRiseStop
}

const api = require('../services/api')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const { SIDE, CURRENT_TRADE } = require('../tools/constants')
const telegram = require('../services/telegram')
const getAccountState = require('../states/account')

const symbolsProcessing = []

async function verifyRiseStop (data, trade) {
  let stopPrice
  if (symbolsProcessing.includes(trade[CURRENT_TRADE.SYMBOL])) return
  else symbolsProcessing.push(trade[CURRENT_TRADE.SYMBOL])

  if (trade[CURRENT_TRADE.SIDE] === SIDE.BUY) {
    if (trade[CURRENT_TRADE.RISE_STOP_PRICE] && trade[CURRENT_TRADE.RISE_STOP_PRICE] < data.k.c) {
      console.log('riseStopFunction')
      stopPrice = trade[CURRENT_TRADE.ENTRY_PRICE] > data.k.l ? trade.entryPrice : data.k.l

      await changeStopLoss(stopPrice, trade, CURRENT_TRADE.RISE_STOP_CREATED)
    } else if (!trade[CURRENT_TRADE.BREAKEVEN_CREATED] && trade[CURRENT_TRADE.BREAKEVEN_PRICE] < data.k.c) {
      console.log('breakevenFunction')

      await changeStopLoss(trade[CURRENT_TRADE.ENTRY_PRICE], trade, CURRENT_TRADE.BREAKEVEN_CREATED)
    }
  } else if (trade[CURRENT_TRADE.SIDE] === SIDE.SELL) {
    if (trade[CURRENT_TRADE.RISE_STOP_PRICE] && trade[CURRENT_TRADE.RISE_STOP_PRICE] > data.k.c) {
      console.log('riseStopFunction')
      stopPrice = trade[CURRENT_TRADE.ENTRY_PRICE] < data.k.h ? trade[CURRENT_TRADE.ENTRY_PRICE] : data.k.h
      await changeStopLoss(stopPrice, trade, CURRENT_TRADE.RISE_STOP_CREATED)
    } else if (!trade[CURRENT_TRADE.BREAKEVEN_CREATED] && trade[CURRENT_TRADE.BREAKEVEN_PRICE] > data.k.c) {
      console.log('breakevenFunction')
      await changeStopLoss(trade[CURRENT_TRADE.ENTRY_PRICE], trade, CURRENT_TRADE.BREAKEVEN_CREATED)
    }
  } else return false
}

async function changeStopLoss (stopPrice, trade, operationType) {
  const { updateTradesOn } = await getAccountState()
  const { side, symbol } = trade
  const stopSide = side === SIDE.SELL ? SIDE.BUY : SIDE.SELL
  const typeId = operationType === CURRENT_TRADE.BREAKEVEN_CREATED ? CURRENT_TRADE.BREAKEVEN_ID : CURRENT_TRADE.RISE_STOP_ID

  const openOrders = await api.getAllOpenOrders(symbol)
  if (openOrders[0]) {
    const hasStopLossOrder = openOrders.find(order => order.type === 'STOP_MARKET')
    const createdNewStopLoss = await createStopLossOrder()
    if (createdNewStopLoss && hasStopLossOrder) {
      await api.cancelOrder(symbol, hasStopLossOrder.orderId)
    }
  } else {
    await createStopLossOrder()
  }
  const symbolIndex = symbolsProcessing.findIndex(symb => symb === symbol)
  if (symbolIndex >= 0) symbolsProcessing.splice(symbolIndex, 1)
  console.log('symbolsProcessing - end', symbolsProcessing)

  async function createStopLossOrder () {
    const ordered = await api.newOrder(symbol, null, stopSide, ORDER_TYPE.STOP_MARKET, true, stopPrice)
    if (!ordered) {
      await updateTradesOn(symbol, operationType, false)
      telegram.sendMessage(`Problem MUDAR o ${ORDER_TYPE.STOP_MARKET} Order para ${symbol},
      stop price: ${stopPrice}`, true)
      console.log(`Error CHANGING ${ORDER_TYPE.STOP_MARKET} order, stop price: ${stopPrice}`)
      return false
    } else {
      await updateTradesOn(symbol, operationType, true)
      await updateTradesOn(symbol, typeId, ordered.orderId)
      return true
    }
  }
}

module.exports = {
  changeStopLoss,
  verifyRiseStop
}

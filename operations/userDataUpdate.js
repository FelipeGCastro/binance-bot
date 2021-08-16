const api = require('../services/api')
const Trade = require('../src/models/trade')
const telegram = require('../services/telegram')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const SIDE = require('../tools/constants').SIDE
const { POSITION_SIDE } = require('../tools/constants')
const { createTpandSLOrder } = require('./tpsl')

let position = { pa: '0' }

async function handleUserDataUpdate (data) {
  if (data.e === 'ACCOUNT_UPDATE') {
    setPosition(data)
  } else if (data.e === 'ORDER_TRADE_UPDATE') {
    const trade = data.o.tradesOn.find(trade => trade.symbol === data.o.s)
    if (trade) {
      if (data.o.X === 'FILLED') {
        handleFilledOrder({ ...data.o, trade, symbol: trade.symbol })
      } else if (data.o.X === 'CANCELED') {
        console.log('Order Canceled', data.o.ot)
      } else {
        return false
      }
    } else {
      return false
    }
  }
}

function setPosition (data) {
  const positionFiltered = data.a.P.filter(pos => {
    const position = data.tradesOn.find(trade => trade.symbol === pos.s)
    return !!position
  })
  position = positionFiltered[0] || { pa: '0' }
}

async function handleFilledOrder (order) {
  if (position.pa !== '0') {
    if (order.o === ORDER_TYPE.MARKET) {
      console.log('Saida 17 Order Market Filled, open position', order.symbol)
      order.updateTradesOn(order.trade.symbol, 'entryPrice', order.L)
      return await createTpandSLOrder(order)
    } else {
      return false
    }
  } else {
    if (order.o === ORDER_TYPE.MARKET) {
      if (order.ot === ORDER_TYPE.STOP_MARKET ||
        order.ot === ORDER_TYPE.TAKE_PROFIT_MARKET) {
        console.log('Saida 18 Order Type TPSL FILLED', order.ot)
        return await tpslOrderFilled(order)
      } else {
        console.log('Saida 19 -Order MARKET Filled with NO position open NO TPSL', order)
        hasStopOrProfitOrder(order)
      }
      order.removeFromTradesOn(order.symbol)
    } else {
      console.log('Saida 20 - TYPE of order no Market:', order.o)
      return false
    }
  }
}

async function tpslOrderFilled (order) {
  console.log('Stop or Profit Order was triggered')
  telegram.sendMessage(`PNL: ${order.rp}`)
  const data = {
    symbol: order.symbol,
    side: order.S === SIDE.SELL ? POSITION_SIDE.LONG : POSITION_SIDE.SHORT,
    closePrice: order.L,
    entryPrice: order.trade.entryPrice,
    stopPrice: order.trade.stopMarketPrice,
    profitPrice: order.trade.takeProfitPrice,
    quantity: order.q,
    profit: order.rp,
    timestamp: order.T
  }
  order.removeFromTradesOn(order.symbol)
  const trade = await Trade.create(data)
  if (!trade) console.log('Cannot create trade')
  hasStopOrProfitOrder(order)
}

async function hasStopOrProfitOrder (order) {
  const symbol = order.symbol
  const openOrders = await api.getAllOpenOrders(symbol)
  console.log('symbol:', symbol, 'Open Orders:', openOrders)
  let hasStopOrProfit
  if (openOrders[0]) {
    hasStopOrProfit = openOrders.filter(order => (order.type === 'STOP_MARKET' ||
    order.type === 'TAKE_PROFIT_MARKET'))
  } else {
    return false
  }

  if (hasStopOrProfit && hasStopOrProfit[0]) {
    const ordersCancelled = await api.cancelAllOrders(symbol)
    if (!ordersCancelled) console.log('Problems to cancel orders')
  }

  return !!hasStopOrProfit[0]
}

module.exports = {
  handleUserDataUpdate,
  hasStopOrProfitOrder
}

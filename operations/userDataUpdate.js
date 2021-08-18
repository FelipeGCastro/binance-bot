const api = require('../services/api')
const Trade = require('../src/models/trade')
const telegram = require('../services/telegram')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const SIDE = require('../tools/constants').SIDE
const { POSITION_SIDE } = require('../tools/constants')
const { createTpandSLOrder } = require('./tpsl')

let positions = []
function setPosition (position) {
  const newPositionsArray = positions.filter(pos => pos.s !== position.s)
  newPositionsArray.push(position)
  positions = newPositionsArray
}
function getPosition (symbol) {
  return positions.find(pos => pos.s === symbol)
}

async function handleUserDataUpdate (data) {
  if (data.e === 'ACCOUNT_UPDATE') {
    handlePosition(data)
  } else if (data.e === 'ORDER_TRADE_UPDATE') {
    const tradesOn = await data.o.getTradesDelayed(data.o.account)
    const trade = tradesOn.find(trade => trade.symbol === data.o.s)
    if (trade) {
      if (data.o.X === 'FILLED' || data.o.X === 'PARTIALLY_FILLED') {
        await handleFilledOrder({ ...data.o, trade, symbol: trade.symbol })
      } else if (data.o.X === 'CANCELED') {
        console.log('Order Canceled', data.o.ot)
      } else {
        return false
      }
    } else {
      return false
    }
  } else console.log('What Type is ? - ', data.e)
}

async function handlePosition (data) {
  const tradesOn = await data.getTradesDelayed(data.account)
  const positionHasTradeOn = data.a.P.filter(pos => {
    const position = tradesOn.find(trade => trade.symbol === pos.s)
    return !!position
  })
  if (positionHasTradeOn[0]) {
    setPosition(positionHasTradeOn[0])
  }
}

async function handleFilledOrder (order) {
  const position = getPosition(order.symbol)
  if (position && position.pa !== '0') {
    if (order.o === ORDER_TYPE.MARKET) {
      console.log('Saida 17 Order Market Filled, open position', order.X, order.symbol) // order.i, order.trade.orderId
      order.updateTradesOn(order.account, order.trade.symbol, 'entryPrice', order.L)
      if (order.X === 'FILLED') await createTpandSLOrder(order)
    } else {
      return false
    }
  } else if (position) {
    if (order.o === ORDER_TYPE.MARKET) {
      if (order.ot === ORDER_TYPE.STOP_MARKET ||
        order.ot === ORDER_TYPE.TAKE_PROFIT_MARKET) {
        console.log('Saida 18 Order Type TPSL FILLED', order.ot)
        return await tpslOrderFilled(order)
      } else {
        console.log('Saida 19 -Order MARKET Filled with NO position open NO TPSL', order)
      }
      order.removeFromTradesOn(order.account, order.symbol)
    } else {
      console.log('Saida 20 - TYPE of order no Market:', order.o)
      return false
    }
  } else {
    console.log('Do not have trade right now, so ignored')
  }
}

async function tpslOrderFilled (order) {
  console.log('Stop or Profit Order was triggered')
  telegram.sendMessage(`PNL: ${order.rp}`)
  const isGain = order.rp > 0
  const data = {
    symbol: order.symbol,
    side: order.S === SIDE.SELL ? POSITION_SIDE.LONG : POSITION_SIDE.SHORT,
    closePrice: order.L,
    entryPrice: order.trade.entryPrice,
    stopPrice: isGain ? order.trade.stopMarketPrice : order.L,
    profitPrice: isGain ? order.L : order.trade.takeProfitPrice,
    quantity: order.q,
    profit: order.rp,
    timestamp: order.T,
    strategy: order.trade.strategy
  }
  order.removeFromTradesOn(order.account, order.symbol)
  const trade = await Trade.create(data)
  if (!trade) console.log('Cannot create trade')
  const ordersCancelled = await api.cancelAllOrders(order.account, order.symbol)
  if (!ordersCancelled) console.log('Problems to cancel orders')
}

module.exports = {
  handleUserDataUpdate
}

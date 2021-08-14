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
    const symbol = data.o.symbols.find(symb => symb === data.o.s)
    if (symbol) {
      if (data.o.X === 'FILLED') {
        handleFilledOrder({ ...data.o, symbol })
      } else if (data.o.X === 'CANCELED') {
        hasStopOrProfitOrder({ ...data.o, symbol })
      } else {
        console.info('type:', data.o.o,
          'status:', data.o.X,
          'type:', data.o.x,
          'PNL:', data.o.rp
        )
        return false
      }
    } else {
      return false
    }
  }
}

function setPosition (data) {
  const positionFiltered = data.a.P.filter(pos => {
    const position = data.symbols.find(symb => symb === pos.s)
    return !!position
  })
  position = positionFiltered[0] || { pa: '0' }
}

async function handleFilledOrder (order) {
  if (position.pa !== '0') {
    if (order.o === ORDER_TYPE.MARKET) {
      return await createTpandSLOrder(order)
    } else {
      return false
    }
  } else {
    if (order.o === ORDER_TYPE.MARKET) {
      if (order.ot === ORDER_TYPE.STOP_MARKET ||
        order.ot === ORDER_TYPE.TAKE_PROFIT_MARKET) {
        return await stopAndProfitMarketOrder(order)
      }
    } else {
      return false
    }
  }
}

async function stopAndProfitMarketOrder (order) {
  console.log('Stop or Profit Order was triggered')
  telegram.sendMessage(`PNL: ${order.rp}`)
  order.removeFromTradesOn(order.symbol)
  const data = {
    symbol: order.symbol,
    side: order.S === SIDE.SELL ? POSITION_SIDE.LONG : POSITION_SIDE.SHORT,
    closePrice: order.L,
    entryPrice: order.entryPrice,
    stopPrice: order.stopMarketPrice,
    profitPrice: order.takeProfitPrice,
    quantity: order.q,
    profit: order.rp,
    timestamp: order.T
  }
  const trade = await Trade.create(data)
  if (!trade) console.log('Cannot create trade')
  hasStopOrProfitOrder(order)
}

async function hasStopOrProfitOrder (order) {
  const symbol = order.symbol
  const openOrders = await api.getAllOpenOrders(symbol)
  let hasStopOrProfit
  if (openOrders[0]) {
    hasStopOrProfit = openOrders.filter(order => (order.type === 'STOP_MARKET' ||
    order.type === 'TAKE_PROFIT_MARKET'))
  } else {
    return false
  }

  if (hasStopOrProfit && hasStopOrProfit[0]) {
    await api.cancelAllOrders(symbol)
    order.removeFromTradesOn(symbol)
  }

  return !!hasStopOrProfit[0]
}

module.exports = {
  handleUserDataUpdate,
  hasStopOrProfitOrder
}

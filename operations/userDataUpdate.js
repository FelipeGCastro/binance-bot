const api = require('../services/api')
const telegram = require('../services/telegram')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const SIDE = require('../tools/constants').SIDE

let position = { pa: '0' }

async function handleUserDataUpdate (data) {
  if (data.e === 'ACCOUNT_UPDATE') {
    setPosition(data)
  } else if (data.e === 'ORDER_TRADE_UPDATE') {
    const symbol = data.o.symbol
    if (data.o.s === symbol) {
      if (data.o.X === 'FILLED') {
        handleFilledOrder(data.o)
      } else if (data.o.X === 'CANCELED') {
        hasStopOrProfitOrder(data.o)
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
  const positionFiltered = data.a.P.filter(pos => (pos.s === data.symbol))
  position = positionFiltered[0] || { pa: '0' }
}

async function handleFilledOrder (order) {
  if (position.pa !== '0') {
    if (order.o === ORDER_TYPE.MARKET) {
      return await createTpandSLOrder(order)
    } else if (order.o === ORDER_TYPE.STOP_MARKET) {
      return await stopAndProfitMarketOrder(order)
    } else if (order.o === ORDER_TYPE.TAKE_PROFIT_MARKET) {
      return await stopAndProfitMarketOrder(order)
    } else {
      return false
    }
  } else {
    if (order.o === ORDER_TYPE.MARKET) {
      if (order.ot === ORDER_TYPE.STOP_MARKET) {
        return await stopAndProfitMarketOrder(order)
      } else if (order.ot === ORDER_TYPE.TAKE_PROFIT_MARKET) {
        return await stopAndProfitMarketOrder(order)
      }
      return await hasStopOrProfitOrder(order)
    } else {
      return false
    }
  }
}

async function createTpandSLOrder (order) {
  const { stopMarketPrice, takeProfitPrice, symbol } = order
  const orderIsSell = order.S === SIDE.SELL
  const side = orderIsSell ? SIDE.BUY : SIDE.SELL

  if (!stopMarketPrice || !takeProfitPrice) {
    return false
  }

  const stopOrder = await api.newOrder(symbol, null, side, ORDER_TYPE.STOP_MARKET, true, stopMarketPrice)
  const profitOrder = await api.newOrder(symbol, null, side, ORDER_TYPE.TAKE_PROFIT_MARKET, true, takeProfitPrice)
  if (!stopOrder) {
    return false
  }
  if (!profitOrder) {
    return false
  }
  return true
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
    const cancelAll = await api.cancelAllOrders(symbol)
    if (cancelAll) {
      order.setTradingOn(false)
      return true
    } else {
      return false
    }
  }

  return !!hasStopOrProfit[0]
}

async function stopAndProfitMarketOrder (order) {
  telegram.sendMessage(`PNL: ${order.rp}`)
  order.setTradingOn(false)
  const cancelOrder = await api.cancelAllOrders(order.symbol)
  console.log(order)
  if (cancelOrder) {
    return !!cancelOrder
  } else {
    return false
  }
}

// "s":"BTCUSDT",              // Symbol
// "c":"TEST",                 // Client Order Id
// "S":"SELL",                 // Side
// "o":"TRAILING_STOP_MARKET", // Order Type
// "x":"NEW",                  // Execution Type
// "X":"NEW",                  // Order Status
// "ap":"0",                   // Average Price
module.exports = {
  handleUserDataUpdate,
  hasStopOrProfitOrder
}

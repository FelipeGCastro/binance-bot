const api = require('../services/api')
const Trade = require('../src/models/trade')
const telegram = require('../services/telegram')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE
const SIDE = require('../tools/constants').SIDE
const { POSITION_SIDE, TRADES_ON, ACCOUNT_PROP } = require('../tools/constants')
const { createTpandSLOrder } = require('./tpsl')
const getAccountState = require('../states/account')
const getExecuteState = require('../states/execute')

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
    const { getTradesDelayed } = await getAccountState(data.o.account)
    const tradesOn = await getTradesDelayed()
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
  const { getTradesDelayed } = await getAccountState(data.account)
  const tradesOn = await getTradesDelayed()
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
      console.log('Saida 17 Order Market Filled, open position', order.X, order.symbol)

      if (order.X === 'FILLED') {
        const { updateTradesOn } = await getAccountState(order.account)
        // account, entryPrice, stopPrice, side
        const result = order.getStopAndTargetPrice(order.account, order.L, order.trade.stopMarketPrice, order.trade.side)
        console.log(result, 'New Stop and Take profit Price')
        if (result) {
          order.trade.stopMarketPrice = result.stopPrice
          order.trade.takeProfitPrice = result.targetPrice
          if (result.breakevenTriggerPrice) {
            updateTradesOn(order.trade.symbol, TRADES_ON.BREAKEVEN_PRICE, result.breakevenTriggerPrice)
            updateTradesOn(order.trade.symbol, TRADES_ON.RISE_STOP_PRICE, result.riseStopTriggerPrice)
          }
        }
        updateTradesOn(order.trade.symbol, TRADES_ON.ENTRY_PRICE, order.L)
        await createTpandSLOrder(order)
      }
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
        if (order.X === 'FILLED') {
          console.log('Saida 19 - Order MARKET Filled - TpSl or Close manually')
          return await tpslOrderFilled(order)
        }
      }
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
  telegram.sendMessage(`PNL: ${order.rp}, conta: ${order.account}`)
  const { removeFromTradesOn } = await getAccountState(order.account)
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
    strategy: order.trade.strategy,
    account: order.account
  }
  removeFromTradesOn(order.symbol)
  const trade = await Trade.create(data)
  if (!trade) console.log('Cannot create trade')
  const ordersCancelled = await api.cancelAllOrders(order.account, order.symbol)
  if (!ordersCancelled) console.log('Problems to cancel orders')
  verifyBalance(order.account)
}

async function verifyBalance (account) {
  const { getTradesDelayed, turnBotOn, getAccountData } = await getAccountState(account)
  const { resetListenersAndCandles } = await getExecuteState(account)
  const tradesOn = await getTradesDelayed()
  if (tradesOn.length === 0) {
    const limitLoss = getAccountData(ACCOUNT_PROP.LIMIT_LOSS)
    const balanceData = await api.getBalance(account)
    const balance = balanceData.filter((coin) => (coin.asset === 'USDT'))[0].availableBalance
    if (balance < limitLoss) {
      turnBotOn(false)
      resetListenersAndCandles()
      telegram.sendMessage(`Atingiu seu maximo de perda! Parei o Bot! ${account}`)
    }
  }
}

module.exports = {
  handleUserDataUpdate
}

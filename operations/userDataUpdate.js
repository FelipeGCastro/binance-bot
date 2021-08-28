const api = require('../services/api')
const Trade = require('../src/models/trade')
const telegram = require('../services/telegram')
const SIDE = require('../tools/constants').SIDE
const { POSITION_SIDE, TRADES_ON, ACCOUNT_PROP } = require('../tools/constants')
const { createTpandSLOrder } = require('./tpsl')
const getAccountState = require('../states/account')
const getExecuteState = require('../states/execute')

async function handleUserDataUpdate (data) {
  if (data.e === 'ORDER_TRADE_UPDATE') {
    const { getTradesDelayed } = await getAccountState(data.o.account)
    const tradesOn = await getTradesDelayed()
    const trade = tradesOn.find(trade => trade.symbol === data.o.s)
    if (trade) {
      if (data.o.X === 'FILLED') {
        if (data.o.i === trade[TRADES_ON.TRADE_ID]) handleFilledOrder({ ...data.o, trade })
        if (data.o.i === trade[TRADES_ON.STOP_LOSS_ID] ||
        data.o.i === trade[TRADES_ON.TAKE_PROFIT_ID]) tpslOrderFilled({ ...data.o, trade })
      } else console.log(data.o.X)
    } else {
      console.log('Has no Trade On')
      return false
    }
  } else console.log('What Type is ? - ', data.e)
}

async function handleFilledOrder (order) {
  const { updateTradesOn } = await getAccountState(order.account)
  // account, entryPrice, stopPrice, side

  await updateTradesOn(order.trade.symbol, TRADES_ON.ENTRY_PRICE, order.L)
  await createTpandSLOrder(order)
}
// tpslOrderFilled(order)

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

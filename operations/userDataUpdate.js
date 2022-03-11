const api = require('../services/api')
const telegram = require('../services/telegram')
const { CURRENT_TRADE, ACCOUNT_PROP } = require('../tools/constants')
const { createTpandSLOrder } = require('./tpsl')
const getAccountState = require('../states/account')
const getExecuteState = require('../states/execute')

async function handleUserDataUpdate (data) {
  if (data.e === 'ORDER_TRADE_UPDATE') {
    if (data.o.X === 'FILLED') {
      const { getTradesOn, getAccountData } = await getAccountState()
      const symbols = getAccountData('symbols')
      if (!symbols.includes(data.o.s)) return
      const currentTrades = getTradesOn()
      const trade = currentTrades.find(trade => trade.symbol === data.o.s)
      if (trade) tpslOrderFilled({ ...data.o, trade })
      else createTradesOn(data)
    }
    console.log('order status: ', data.o.X, 'order symbol: ', data.o.s)
  }
}

async function createTradesOn (data) {
  console.log('createTradesOn')
  const { getTradesOn, setAccountData, getAccountData } = await getAccountState()
  const currentTrades = getTradesOn()
  const accountData = getAccountData()
  const result = data.o.getStopAndTargetPrice(data.o.L, data.o.S, data.o.s)

  setAccountData(ACCOUNT_PROP.LIMIT_REACHED, (currentTrades.length + 1) >= accountData.limitOrdersSameTime)

  const trade = {
    [CURRENT_TRADE.SYMBOL]: data.o.s,
    [CURRENT_TRADE.STOP_PRICE]: result.stopPrice,
    [CURRENT_TRADE.PROFIT_PRICE]: result.targetPrice,
    [CURRENT_TRADE.ENTRY_PRICE]: data.o.L,
    [CURRENT_TRADE.SIDE]: data.o.S,
    [CURRENT_TRADE.STRATEGY]: result.strategy,
    [CURRENT_TRADE.BREAKEVEN_PRICE]: result.breakevenTriggerPrice,
    [CURRENT_TRADE.TRADE_ID]: data.o.i,
    [CURRENT_TRADE.QUANTITY]: data.o.z
  }
  if (result.riseStopTriggerPrice) trade[CURRENT_TRADE.RISE_STOP_PRICE] = result.riseStopTriggerPrice

  telegram.sendMessage(`Entrou: ${data.o.s}PERP, Side: ${data.o.S}, Strategy: ${accountData.strategy}`)

  createTpandSLOrder({ ...data.o, trade })
}

async function tpslOrderFilled (order) {
  const { removeFromTradesOn } = await getAccountState()

  const currentTrades = removeFromTradesOn(order.trade.symbol)

  await api.cancelAllOrders(order.trade.symbol)

  verifyBalance(currentTrades)
}

async function verifyBalance (currentTrades) {
  const { turnBotOn, getAccountData } = await getAccountState()
  const { resetListenersAndCandles } = await getExecuteState()
  // MAYBE REPLACE THIS WITH A CALL TO KNOW IF THERE IS ANY OPEN POSITIONS AND IF NOT MAKE CALCULATE

  if (currentTrades.length === 0) {
    const limitLoss = getAccountData(ACCOUNT_PROP.LIMIT_LOSS)
    const balanceData = await api.getBalance()
    const balance = balanceData.filter((coin) => (coin.asset === 'USDT'))[0].availableBalance
    if (balance < limitLoss) {
      turnBotOn(false)
      resetListenersAndCandles()
      telegram.sendMessage('Atingiu seu maximo de perda! Parei o Bot!')
    }
  }
}

module.exports = {
  handleUserDataUpdate
}

const api = require('./services/api.js')
const operations = require('./operations/userDataUpdate')
const ws = require('./services/ws.js')
const telegram = require('./services/telegram')
const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const newOrder = require('./operations/newOrder')
const { STRATEGIES, SIDE, ACCOUNTS_TYPE } = require('./tools/constants')
const { handleVerifyAndCreateTpSl } = require('./operations/tpsl')
const { updateAccountData } = require('./services/socket.js')

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}

const ACCOUNTS = {
  [ACCOUNTS_TYPE.PRIMARY]: {
    strategy: STRATEGIES.SHARK,
    symbols: ['ETHUSDT', 'ADAUSDT', 'MATICUSDT', 'XRPUSDT', 'DOGEUSDT'],
    botOn: false,
    leverage: 2,
    entryValue: 100,
    validateEntry: SET_STRATEGY[STRATEGIES.SHARK].validateEntry,
    maxEntryValue: 100,
    listenKeyIsOn: false,
    interval: '5m',
    limitOrdersSameTime: 2,
    limitReached: false,
    tradesOn: [], // { stopMarketPrice, takeProfitPrice, entryPrice, symbol, stopOrderCreated, profitOrderCreated }
    listeners: [],
    allCandles: []
  },
  [ACCOUNTS_TYPE.SECONDARY]: {
    strategy: STRATEGIES.HIDDEN_DIVERGENCE,
    symbols: ['SANDUSDT', 'ADAUSDT', 'LUNAUSDT', 'DODOUSDT', 'DOGEUSDT'],
    botOn: false,
    leverage: 2,
    entryValue: 100,
    validateEntry: SET_STRATEGY[STRATEGIES.HIDDEN_DIVERGENCE].validateEntry,
    maxEntryValue: 100,
    listenKeyIsOn: false,
    interval: '1m',
    limitOrdersSameTime: 2,
    limitReached: false,
    tradesOn: [], // { stopMarketPrice, takeProfitPrice, entryPrice, symbol, stopOrderCreated, profitOrderCreated }
    listeners: [],
    allCandles: []
  }
}

function setBotOn (account, bool) { ACCOUNTS[account].botOn = bool }
function setLeverage (account, value) { ACCOUNTS[account].leverage = value }
function setEntryValue (account, value) {
  ACCOUNTS[account].entryValue = value
  ACCOUNTS[account].maxEntryValue = ACCOUNTS[account].entryValue + (0.2 * ACCOUNTS[account].entryValue)
}
function getAccountData (account) {
  return { ...ACCOUNTS[account], listeners: [], allCandles: [] }
}

function getTradesDelayed (account) {
  return new Promise(resolve => {
    setTimeout(() => resolve(ACCOUNTS[account].tradesOn), 2000)
  })
}
function setLimitOrdersSameTime (account, limite) { ACCOUNTS[account].limitOrdersSameTime = limite }
function setTradesOn (account, trade) {
  updateAccountData(account, { ...ACCOUNTS[account], listeners: [], allCandles: [] })
  return ACCOUNTS[account].tradesOn.push(trade)
}
function updateTradesOn (account, symbol, key, value) {
  const oldObject = ACCOUNTS[account].tradesOn.find(trade => trade.symbol === symbol)
  if (!oldObject) return
  const newObject = { ...oldObject, [key]: value }
  removeFromTradesOn(account, newObject.symbol)
  setTradesOn(account, newObject)
  updateAccountData(account, { ...ACCOUNTS[account], listeners: [], allCandles: [] })
}
function removeFromTradesOn (account, symb) {
  ACCOUNTS[account].tradesOn = ACCOUNTS[account].tradesOn.filter(trade => trade.symbol !== symb)
  ACCOUNTS[account].limitReached = ACCOUNTS[account].tradesOn.length >= ACCOUNTS[account].limitOrdersSameTime
}
function setLimitReached (account, value) { ACCOUNTS[account].limitReached = value }
function setValidate (account, func) { ACCOUNTS[account].validateEntry = func }
function setPeriodInterval (account, int) { ACCOUNTS[account].interval = int }
function setStrategy (account, value) { ACCOUNTS[account].strategy = value }
function updateAllCandles (account, arrayWithValues) { ACCOUNTS[account].allCandles = arrayWithValues }
function updateListenKeyIsOn (account, value) {
  updateAccountData(account, { ...ACCOUNTS[account], listeners: [], allCandles: [] })
  ACCOUNTS[account].listenKeyIsOn = value
}

// let listeners = []
// let allCandles = []

// START MAIN FUNCTION
async function execute (account) {
  console.log('init')
  const isLeverageChanged = await changeLeverage(account, ACCOUNTS[account].leverage)
  if (!isLeverageChanged) return false

  ACCOUNTS[account].symbols.forEach((symbol) => {
    if (!symbol) return

    addAllCandles(symbol)
    setWsListeners(symbol)
  })

  async function addAllCandles (symbol) {
    console.log(symbol, 'addAllCandles')
    const candles = await api.candles(symbol, ACCOUNTS[account].interval)
    if (candles) ACCOUNTS[account].allCandles.push({ candles, symbol })
  }
  console.log(ACCOUNTS[account].allCandles, 'allCandles')
  async function setWsListeners (symbol) {
    let lastEventAt = 0
    // LISTEN CANDLES AND UPDTATE CANDLES WHEN CANDLE CLOSE
    const listener = await ws.onKlineContinuos(symbol, ACCOUNTS[account].interval, async (data) => {
      if (data.k.x && data.E > lastEventAt) {
        lastEventAt = data.E
        await handleCloseCandle(data, symbol)
      }
    })
    ACCOUNTS[account].listeners.push({ listener, symbol })
  }

  async function handleCloseCandle (data, symbol) {
    const candlesObj = ACCOUNTS[account].allCandles.find(cand => cand.symbol === symbol)

    if (!candlesObj) return

    const newCandles = await handleAddCandle(data, candlesObj)

    const hasTradeOn = ACCOUNTS[account].tradesOn.find(trade => trade.symbol === candlesObj.symbol)
    if (!hasTradeOn &&
      !ACCOUNTS[account].limitReached &&
      ACCOUNTS[account].listenKeyIsOn &&
      ACCOUNTS[account].botOn) {
      const valid = await ACCOUNTS[account].validateEntry(newCandles, symbol)
      console.log('Fechou!', candlesObj.symbol, new Date().getMinutes())

      if (valid && valid.symbol === candlesObj.symbol) {
        const ordered = await newOrder.handleNewOrder({
          ...valid,
          entryValue: ACCOUNTS[account].entryValue,
          maxEntryValue: ACCOUNTS[account].maxEntryValue,
          symbol,
          account
        })
        if (ordered) {
          setLimitReached(account, (ACCOUNTS[account].tradesOn.length + 1) >= ACCOUNTS[account].limitOrdersSameTime)
          setTradesOn(account, {
            symbol,
            stopMarketPrice: valid.stopPrice,
            takeProfitPrice: valid.targetPrice,
            entryPrice: ordered.avgPrice,
            stopOrderCreated: false,
            profitOrderCreated: false,
            side: ordered.side,
            orderId: ordered.orderId,
            strategy: valid.strategy
          })
          telegram.sendMessage(`Entrou: ${symbol}PERP, Side: ${valid.side}, Strategy: ${ACCOUNTS[account].strategy}, account: ${account}`)
          verifyAfterFewSeconds()
        }
        console.log('Entry is Valid')
      }
    }
  }

  function handleAddCandle (data, candlesObj) {
    const candles = candlesObj.candles
    const newCandle = [data.k.t, data.k.o, data.k.h, data.k.l, data.k.c, data.k.v, data.k.T, data.k.q, data.k.n, data.k.V, data.k.Q]
    if (newCandle[0] === candles[candles.length - 1][0]) {
      candles.pop()
    } else {
      candles.shift()
    }
    candles.push(newCandle)
    const candlesFiltered = ACCOUNTS[account].allCandles.filter(candlesObjItem => candlesObjItem.symbol !== candlesObj.symbol)
    candlesFiltered.push({ candles, symbol: candlesObj.symbol })
    updateAllCandles(account, candlesFiltered)
    return candles
  }

  getListenKey()

  async function getListenKey () {
    const data = await api.listenKey(account)
    if (data) {
      setWsListen(data.listenKey)
      updateListenKeyIsOn(account, true)
    } else {
      console.log('Error getting listenKey, try again e 10 seconds')
      setTimeout(async () => {
        const data = await api.listenKey(account)
        if (data) {
          setWsListen(data.listenKey)
          updateListenKeyIsOn(account, true)
        } else {
          telegram.sendMessage('Problemas ao buscar uma ListenKey')
          console.log('Problemas ao buscar uma ListenKey')
        }
      }, 10000)
    }
  }

  async function setWsListen (listenKey) {
    const wsListenKey = ws.listenKey(listenKey, async (data) => {
      if (data.e === 'listenKeyExpired' && ACCOUNTS[account].listenKeyIsOn) {
        updateListenKeyIsOn(account, false)
        wsListenKey.close()
        await getListenKey()
      } else {
        let newData
        if (data.o) {
          const dataOrder = { ...data.o, account, updateTradesOn, removeFromTradesOn, getTradesDelayed }
          newData = { ...data, o: dataOrder }
        } else { newData = { ...data, account, getTradesDelayed } }
        await operations.handleUserDataUpdate(newData)
      }
    })
  }

  function verifyAfterFewSeconds () {
    setTimeout(() => {
      ACCOUNTS[account].tradesOn.forEach(trade => {
        const tpslSide = trade.side && trade.side === SIDE.SELL ? SIDE.BUY : SIDE.SELL
        if (!trade.symbol && !trade.stopMarketPrice && !trade.takeProfitPrice) return
        handleVerifyAndCreateTpSl(trade.symbol, tpslSide, trade.stopMarketPrice, trade.takeProfitPrice, updateTradesOn, account)
      })
    }, 15000)
  }
}

async function changeLeverage (account, value) {
  ACCOUNTS[account].symbols.forEach(async (symbol) => {
    const changedLeverage = await api.changeLeverage(account, ACCOUNTS[account].leverage, symbol)
    if (!changedLeverage) {
      console.log('Error when change Leverage')
      return false
    }
    console.log('Leverage Changed Successfully: ', symbol)
  })
  setLeverage(account, value)
  return true
}

function updateSymbols (account, newSymbols) {
  ACCOUNTS[account].symbols = newSymbols
  resetListenersAndCandles(account)
  if (ACCOUNTS[account].botOn) {
    const isBotOn = execute(account)
    if (!isBotOn) return false
  }
  return true
}

function handleChangeStrategy (account, stratName) {
  if (!SET_STRATEGY[stratName]) return false
  const strategy = SET_STRATEGY[stratName]
  setPeriodInterval(account, strategy.getInterval())
  setValidate(account, strategy.validateEntry)
  setStrategy(account, stratName)
  return true
}
function turnBotOn (account, bool) {
  if (bool) {
    if (!ACCOUNTS[account].botOn) {
      ACCOUNTS[account].listeners = []
      ACCOUNTS[account].tradesOn = []
      setBotOn(account, bool)
      const isBotOn = execute(account)
      if (!isBotOn) return false
    }
  } else {
    resetListenersAndCandles(account)
    ACCOUNTS[account].tradesOn = []
    setBotOn(account, bool)
  }
}

function resetListenersAndCandles (account) {
  ACCOUNTS[account].listeners.forEach(list => { list.listener.close(1000) })
  ACCOUNTS[account].listeners = []
  ACCOUNTS[account].allCandles = []
}

module.exports = {
  changeLeverage,
  execute,
  updateSymbols,
  setEntryValue,
  getAccountData,
  handleChangeStrategy,
  turnBotOn,
  setLimitOrdersSameTime
}

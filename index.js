const api = require('./services/api.js')
const operations = require('./operations/userDataUpdate')
const ws = require('./services/ws.js')
const telegram = require('./services/telegram')
const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const newOrder = require('./operations/newOrder')
const { STRATEGIES, SIDE, ACCOUNTS_TYPE, TRADES_ON, ACCOUNT_PROP } = require('./tools/constants')
const { handleVerifyAndCreateTpSl } = require('./operations/tpsl')
const { updateAccountData } = require('./services/socket.js')
const { verifyRiseStop } = require('./operations/changeStopLoss.js')

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}

const ACCOUNTS = {
  [ACCOUNTS_TYPE.PRIMARY]: {
    [ACCOUNT_PROP.STRATEGY]: STRATEGIES.SHARK,
    [ACCOUNT_PROP.SYMBOLS]: ['ADAUSDT', 'DOGEUSDT', 'AKROUSDT', 'XRPUSDT'],
    [ACCOUNT_PROP.BOT_ON]: true,
    [ACCOUNT_PROP.LEVERAGE]: 2,
    [ACCOUNT_PROP.ENTRY_VALUE]: 100,
    [ACCOUNT_PROP.MAX_ENTRY_VALUE]: 110,
    [ACCOUNT_PROP.LIMIT_ORDERS]: 4,
    [ACCOUNT_PROP.LIMIT_REACHED]: false,
    [ACCOUNT_PROP.LISTEN_KEY_IS_ON]: false,
    [ACCOUNT_PROP.TRADES_ON]: [] // { stopMarketPrice, takeProfitPrice, entryPrice, symbol, stopOrderCreated, profitOrderCreated }
  },
  [ACCOUNTS_TYPE.SECONDARY]: {
    [ACCOUNT_PROP.STRATEGY]: STRATEGIES.HIDDEN_DIVERGENCE,
    [ACCOUNT_PROP.SYMBOLS]: ['SANDUSDT'],
    [ACCOUNT_PROP.BOT_ON]: true,
    [ACCOUNT_PROP.LEVERAGE]: 2,
    [ACCOUNT_PROP.ENTRY_VALUE]: 100,
    [ACCOUNT_PROP.MAX_ENTRY_VALUE]: 110,
    [ACCOUNT_PROP.LIMIT_ORDERS]: 4,
    [ACCOUNT_PROP.LIMIT_REACHED]: false,
    [ACCOUNT_PROP.LISTEN_KEY_IS_ON]: false,
    [ACCOUNT_PROP.TRADES_ON]: []
  }
}

function setAccountData (account, key, value) {
  ACCOUNTS[account][key] = value
}

function getAccountData (account) { return ACCOUNTS[account] }

function getTradesDelayed (account) {
  return new Promise(resolve => {
    setTimeout(() => resolve(ACCOUNTS[account].tradesOn), 2000)
  })
}

function setTradesOn (account, trade) {
  ACCOUNTS[account].tradesOn.push(trade)
  updateAccountData(account, ACCOUNTS[account])
}

function updateTradesOn (account, symbol, key, value) {
  const oldObject = ACCOUNTS[account].tradesOn.find(trade => trade.symbol === symbol)
  if (!oldObject) return
  removeFromTradesOn(account, symbol)
  const newObject = { ...oldObject, [key]: value }
  setTradesOn(account, newObject)
}

function removeFromTradesOn (account, symb) {
  ACCOUNTS[account].tradesOn = ACCOUNTS[account].tradesOn.filter(trade => trade.symbol !== symb)
  ACCOUNTS[account].limitReached = ACCOUNTS[account].tradesOn.length >= ACCOUNTS[account].limitOrdersSameTime
  updateAccountData(account, ACCOUNTS[account])
}

function updateListenKeyIsOn (account, value) {
  ACCOUNTS[account].listenKeyIsOn = value
  updateAccountData(account, ACCOUNTS[account])
}

const state = {
  [ACCOUNTS_TYPE.PRIMARY]: {
    candlesListeners: [],
    userDataListeners: null,
    validateEntry: SET_STRATEGY[ACCOUNTS[ACCOUNTS_TYPE.PRIMARY].strategy].validateEntry,
    getStopAndTargetPrice: SET_STRATEGY[ACCOUNTS[ACCOUNTS_TYPE.PRIMARY].strategy].getStopAndTargetPrice,
    interval: SET_STRATEGY[ACCOUNTS[ACCOUNTS_TYPE.PRIMARY].strategy].getInterval(),
    allCandles: []
  },
  [ACCOUNTS_TYPE.SECONDARY]: {
    candlesListeners: [],
    userDataListeners: null,
    validateEntry: SET_STRATEGY[ACCOUNTS[ACCOUNTS_TYPE.SECONDARY].strategy].validateEntry,
    getStopAndTargetPrice: SET_STRATEGY[ACCOUNTS[ACCOUNTS_TYPE.SECONDARY].strategy].getStopAndTargetPrice,
    interval: SET_STRATEGY[ACCOUNTS[ACCOUNTS_TYPE.SECONDARY].strategy].getInterval(),
    allCandles: []
  }
}
function updateAllCandles (account, arrayWithValues) { state[account].allCandles = arrayWithValues }
// let allCandles = []

// START MAIN FUNCTION
async function execute (account) {
  console.log('init')
  telegram.sendMessage('Bot Foi Iniciado ou Reiniciado')
  const isLeverageChanged = await changeLeverage(account, ACCOUNTS[account].leverage)
  if (!isLeverageChanged) return false

  ACCOUNTS[account].symbols.forEach((symbol) => {
    if (!symbol) return

    addAllCandles(symbol)
    setWsListeners(symbol)
  })

  async function addAllCandles (symbol) {
    console.log(symbol, 'addAllCandles')
    const candles = await api.candles(symbol, state[account].interval)
    if (candles) state[account].allCandles.push({ candles, symbol })
  }

  async function setWsListeners (symbol) {
    let lastEventAt = 0
    // LISTEN CANDLES AND UPDTATE CANDLES WHEN CANDLE CLOSE
    const listener = await ws.onKlineContinuos(symbol, state[account].interval, async (data) => {
      if (data.k.x && data.E > lastEventAt) {
        lastEventAt = data.E
        await handleCloseCandle(data, symbol)
      }
      analysingCandle(data, symbol)
    })
    state[account].candlesListeners.push({ listener, symbol })
  }

  async function analysingCandle (data, symbol) {
    const hasTradeOn = ACCOUNTS[account].tradesOn.find(trade => trade.symbol === symbol)
    if (hasTradeOn && hasTradeOn[TRADES_ON.BREAKEVEN_PRICE] && !hasTradeOn[TRADES_ON.RISE_STOP_CREATED]) {
      await verifyRiseStop(account, data, hasTradeOn, updateTradesOn)
    }
  }

  async function handleCloseCandle (data, symbol) {
    const candlesObj = state[account].allCandles.find(cand => cand.symbol === symbol)

    if (!candlesObj) return
    const hasTradeOn = ACCOUNTS[account].tradesOn.find(trade => trade.symbol === candlesObj.symbol)
    const newCandles = await handleAddCandle(data, candlesObj)

    if (!hasTradeOn &&
      !ACCOUNTS[account].limitReached &&
      ACCOUNTS[account].listenKeyIsOn &&
      ACCOUNTS[account].botOn) {
      const valid = await state[account].validateEntry(newCandles, symbol)
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
          setAccountData(account, ACCOUNT_PROP.LIMIT_REACHED, (ACCOUNTS[account].tradesOn.length + 1) >= ACCOUNTS[account].limitOrdersSameTime)
          setTradesOn(account, {
            [TRADES_ON.SYMBOL]: symbol,
            [TRADES_ON.STOP_PRICE]: valid.stopPrice,
            [TRADES_ON.PROFIT_PRICE]: valid.targetPrice,
            [TRADES_ON.ENTRY_PRICE]: ordered.avgPrice,
            [TRADES_ON.SIDE]: ordered.side,
            [TRADES_ON.STRATEGY]: valid.strategy
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
    const candlesFiltered = state[account].allCandles.filter(candlesObjItem => candlesObjItem.symbol !== candlesObj.symbol)
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
      const keyInterval = setInterval(async () => {
        const data = await api.listenKey(account)
        if (data) {
          setWsListen(data.listenKey)
          updateListenKeyIsOn(account, true)
          clearInterval(keyInterval)
        } else {
          telegram.sendMessage('Problemas ao buscar uma ListenKey, nova tentativa em 10 segundos')
          console.log('Problemas ao buscar uma ListenKey, nova tentativa em 10 segundos')
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
          const dataOrder = {
            ...data.o,
            getStopAndTargetPrice: handleGetStopAndTarget,
            account,
            updateTradesOn,
            removeFromTradesOn,
            getTradesDelayed
          }
          newData = { ...data, o: dataOrder }
        } else { newData = { ...data, account, getTradesDelayed } }
        await operations.handleUserDataUpdate(newData)
      }
    })
    state[account].userDataListeners = wsListenKey
  }

  function handleGetStopAndTarget (account, entryPrice, stopPrice, side) {
    if (ACCOUNTS[account].strategy === STRATEGIES.HIDDEN_DIVERGENCE) {
      return state[account].getStopAndTargetPrice(stopPrice, entryPrice)
    } else if (ACCOUNTS[account].strategy === STRATEGIES.SHARK) {
      return state[account].getStopAndTargetPrice(entryPrice, side)
    } else return false
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
  setAccountData(account, ACCOUNT_PROP.LEVERAGE, value)
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
  setAccountData(account, ACCOUNT_PROP.STRATEGY, stratName)
  return true
}
function turnBotOn (account, bool) {
  if (bool) {
    if (!ACCOUNTS[account].botOn) {
      state[account].candlesListeners = []
      ACCOUNTS[account].tradesOn = []
      setAccountData(account, ACCOUNT_PROP.BOT_ON, bool)
      const isBotOn = execute(account)
      if (!isBotOn) return false
    }
  } else {
    resetListenersAndCandles(account)
    ACCOUNTS[account].tradesOn = []
    updateListenKeyIsOn(account, false)
    setAccountData(account, ACCOUNT_PROP.BOT_ON, bool)
  }
}

function resetListenersAndCandles (account) {
  state[account].candlesListeners.forEach(list => { list.listener.close(1000) })
  if (state[account].userDataListeners) state[account].userDataListeners.close(1000)
  state[account].candlesListeners = []
  state[account].allCandles = []
}

module.exports = {
  changeLeverage,
  execute,
  updateSymbols,
  getAccountData,
  handleChangeStrategy,
  turnBotOn
}

const api = require('./services/api.js')
const operations = require('./operations/userDataUpdate')
const ws = require('./services/ws.js')
const telegram = require('./services/telegram')
const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const newOrder = require('./operations/newOrder')
const { STRATEGIES, SIDE, ACCOUNTS_TYPE, TRADES_ON } = require('./tools/constants')
const { handleVerifyAndCreateTpSl } = require('./operations/tpsl')
const { updateAccountData } = require('./services/socket.js')
const { verifyRiseStop } = require('./operations/changeStopLoss.js')

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}

const ACCOUNTS = {
  [ACCOUNTS_TYPE.PRIMARY]: {
    strategy: STRATEGIES.SHARK,
    symbols: ['ADAUSDT', 'MATICUSDT', 'XRPUSDT'],
    botOn: false,
    leverage: 2,
    entryValue: 100,
    validateEntry: SET_STRATEGY[STRATEGIES.SHARK].validateEntry,
    getStopAndTargetPrice: SET_STRATEGY[STRATEGIES.SHARK].getStopAndTargetPrice,
    maxEntryValue: 110,
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
    symbols: ['SANDUSDT'],
    botOn: false,
    leverage: 2,
    entryValue: 100,
    validateEntry: SET_STRATEGY[STRATEGIES.HIDDEN_DIVERGENCE].validateEntry,
    getStopAndTargetPrice: SET_STRATEGY[STRATEGIES.HIDDEN_DIVERGENCE].getStopAndTargetPrice,
    maxEntryValue: 110,
    listenKeyIsOn: false,
    interval: '1m',
    limitOrdersSameTime: 2,
    limitReached: false,
    tradesOn: [],
    listeners: [],
    allCandles: []
  }
}

function setGetStopAndTargetPrice (account, value) { ACCOUNTS[account].getStopAndTargetPrice = value }

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
  ACCOUNTS[account].tradesOn.push(trade)

  updateOnlyNecessary(account)
}
function updateOnlyNecessary (account) {
  updateAccountData(account, { ...ACCOUNTS[account], listeners: [], allCandles: [], validateEntry: null, getStopAndTargetPrice: null })
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
  updateOnlyNecessary(account)
}
function setLimitReached (account, value) { ACCOUNTS[account].limitReached = value }
function setValidate (account, func) { ACCOUNTS[account].validateEntry = func }
function setPeriodInterval (account, int) { ACCOUNTS[account].interval = int }
function setStrategy (account, value) { ACCOUNTS[account].strategy = value }
function updateAllCandles (account, arrayWithValues) { ACCOUNTS[account].allCandles = arrayWithValues }
function updateListenKeyIsOn (account, value) {
  ACCOUNTS[account].listenKeyIsOn = value
  updateOnlyNecessary(account)
}

const listeners = {
  [ACCOUNTS_TYPE.PRIMARY]: {
    candles: [],
    userData: null
  },
  [ACCOUNTS_TYPE.SECONDARY]: {
    candles: [],
    userData: null
  }
}
// let allCandles = []

// START MAIN FUNCTION
async function execute (account) {
  console.log('init')
  const isLeverageChanged = await changeLeverage(account, ACCOUNTS[account].leverage)
  if (!isLeverageChanged) return false

  ACCOUNTS[account].symbols.forEach((symbol) => {
    if (!symbol) return

    addAllCandles(symbol)
  })

  async function addAllCandles (symbol) {
    console.log(symbol, 'addAllCandles')
    const candles = await api.candles(symbol, ACCOUNTS[account].interval)
    if (candles) ACCOUNTS[account].allCandles.push({ candles, symbol })
  }
  console.log(ACCOUNTS[account].allCandles, 'allCandles')

  ACCOUNTS[account].allCandles[0].forEach(async (data) => { // corrigir os candles novos que precisam ser testados
    await handleCloseCandle(data)
    // analysingCandle(data, symbol)
  })

  // async function analysingCandle (data, symbol) {
  //   const hasTradeOn = ACCOUNTS[account].tradesOn.find(trade => trade.symbol === symbol)
  //   if (hasTradeOn && !hasTradeOn[TRADES_ON.RISE_STOP_CREATED]) {
  //     await verifyRiseStop(account, data, hasTradeOn, updateTradesOn)
  //   }
  // }

  async function handleCloseCandle (data, symbol) {
    const newCandles = handleAddCandle(data)
    const valid = await ACCOUNTS[account].validateEntry(ACCOUNTS[account].allCandles[0]) // corrigir os candles que virão
    if (valid) {
      setLimitReached(account, (ACCOUNTS[account].tradesOn.length + 1) >= ACCOUNTS[account].limitOrdersSameTime)
      setTradesOn(account, {
        [TRADES_ON.SYMBOL]: symbol,
        [TRADES_ON.STOP_PRICE]: valid.stopPrice,
        [TRADES_ON.PROFIT_PRICE]: valid.targetPrice,
        [TRADES_ON.ENTRY_PRICE]: valid.closePrice,
        [TRADES_ON.SIDE]: valid.side === 'SHORT' ? 'SELL' : 'BUY',
        [TRADES_ON.STRATEGY]: valid.strategy
      })
    }
    console.log('Entry is Valid')
  }

  function handleAddCandle (data) {
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
    listeners[account].userData = wsListenKey
  }

  function handleGetStopAndTarget (account, entryPrice, stopPrice, side) {
    if (ACCOUNTS[account].strategy === STRATEGIES.HIDDEN_DIVERGENCE) {
      return ACCOUNTS[account].getStopAndTargetPrice(stopPrice, entryPrice)
    } else if (ACCOUNTS[account].strategy === STRATEGIES.SHARK) {
      return ACCOUNTS[account].getStopAndTargetPrice(entryPrice, side)
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
  setGetStopAndTargetPrice(account, strategy.getStopAndTargetPrice)
  setStrategy(account, stratName)
  return true
}
function turnBotOn (account, bool) {
  if (bool) {
    if (!ACCOUNTS[account].botOn) {
      listeners[account].candles = []
      ACCOUNTS[account].tradesOn = []
      setBotOn(account, bool)
      const isBotOn = execute(account)
      if (!isBotOn) return false
    }
  } else {
    resetListenersAndCandles(account)
    ACCOUNTS[account].tradesOn = []
    updateListenKeyIsOn(account, false)
    setBotOn(account, bool)
  }
}

function resetListenersAndCandles (account) {
  listeners[account].candles.forEach(list => { list.listener.close(1000) })
  if (listeners[account].userData) listeners[account].userData.close(1000)
  listeners[account].candles = []
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

const api = require('./services/api.js')
const operations = require('./operations/userDataUpdate')
const ws = require('./services/ws.js')
const telegram = require('./services/telegram')
const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const newOrder = require('./operations/newOrder')
const STRATEGIES = require('./tools/constants').STRATEGIES

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}

let strategy = STRATEGIES.SHARK
let symbols = [process.env.SYMBOL, 'ADAUSDT', 'MATICUSDT', 'XRPUSDT', 'DOGEUSDT']
let botOn = false
let leverage = 2
let entryValue = 80

let validateEntry = SET_STRATEGY[strategy].validateEntry
let maxEntryValue = entryValue + (0.3 * entryValue)
let listenKeyIsOn = false
let interval = '5m'

let tradesOn = [] // { stopMarketPrice, takeProfitPrice, entryPrice, symbol, stopOrderCreated, profitOrderCreated }

function setBotOn (bool) { botOn = bool }

function setLeverage (value) { leverage = value }
function setEntryValue (value) {
  entryValue = value
  maxEntryValue = entryValue + (0.3 * entryValue)
}
function getAccountData () {
  return {
    symbols,
    botOn,
    leverage,
    entryValue,
    strategy,
    maxEntryValue,
    tradesOn
  }
}
function getTradesOn () { return tradesOn }
function setTradesOn (trade) { return tradesOn.push(trade) }
function updateTradesOn (symbol, key, value) {
  const oldObject = tradesOn.find(trade => trade.symbol === symbol)
  const newObject = { ...oldObject, [key]: value }
  removeFromTradesOn(newObject.symbol)
  setTradesOn(newObject)
}
function removeFromTradesOn (symb) { tradesOn = tradesOn.filter(trade => trade.symbol !== symb) }

function setValidate (func) { validateEntry = func }
function setPeriodInterval (int) { interval = int }
function setStrategy (value) { strategy = value }

let listeners = []
let allCandles = []

// START MAIN FUNCTION
async function execute () {
  console.log('init')

  symbols.forEach((symbol, symbolIndex) => {
    if (!symbol) return
    changeLeverage(leverage, symbol)

    addAllCandles(symbol)
    setWsListeners(symbol)
    console.log(symbol, symbolIndex, 'foreach')
  })
  async function addAllCandles (symbol) {
    const candles = await api.candles(symbol, interval)
    if (candles) allCandles.push({ candles, symbol })
  }

  async function setWsListeners (symbol) {
    let lastEventAt = 0
    // LISTEN CANDLES AND UPDTATE CANDLES WHEN CANDLE CLOSE
    const listener = await ws.onKlineContinuos(symbol, interval, async (data) => {
      if (data.k.x && data.E > lastEventAt) {
        lastEventAt = data.E
        await handleCloseCandle(data, symbol)
      }
    })
    listeners.push({ listener, symbol })
  }

  async function handleCloseCandle (data, symbol) {
    const candlesObj = allCandles.find(cand => cand.symbol === symbol)
    if (!candlesObj) return
    const newCandles = await handleAddCandle(data, candlesObj)
    const hasTradeOn = tradesOn.find(trade => trade.symbol === candlesObj.symbol)
    if (!hasTradeOn && listenKeyIsOn && botOn) {
      const valid = await validateEntry(newCandles, symbol)
      console.log('Fechou!', candlesObj.symbol, new Date().getMinutes())
      if (valid && valid.symbol === candlesObj.symbol) {
        const ordered = await newOrder.handleNewOrder({ ...valid, entryValue, maxEntryValue, symbol })
        if (ordered) {
          setTradesOn({
            symbol,
            stopMarketPrice: valid.stopPrice,
            takeProfitPrice: valid.targetPrice,
            entryPrice: ordered.avgPrice,
            stopOrderCreated: false,
            profitOrderCreated: false
          })
          telegram.sendMessage(`Entrou: ${symbol}PERP, Side: ${valid.side}`)
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
    const candlesFiltered = allCandles.filter(candlesObjItem => candlesObjItem.symbol !== candlesObj.symbol)
    candlesFiltered.push({ candles, symbol: candlesObj.symbol })
    allCandles = candlesFiltered
    return candles
  }

  await getListenKey()

  async function getListenKey () {
    const data = await api.listenKey()
    if (data) {
      setWsListen(data.listenKey)
      listenKeyIsOn = true
    }
  }

  async function setWsListen (listenKey) {
    ws.listenKey(listenKey, async (data) => {
      if (data.e === 'listenKeyExpired' && listenKeyIsOn) {
        listenKeyIsOn = false
        await getListenKey()
      } else {
        let newData
        if (data.o) {
          const dataOrder = { ...data.o, updateTradesOn, removeFromTradesOn, tradesOn }
          newData = { ...data, o: dataOrder }
        } else { newData = { ...data, tradesOn } }
        operations.handleUserDataUpdate(newData)
      }
    })
  }
}

async function changeLeverage (value, symbol) {
  const changedLeverage = await api.changeLeverage(leverage, symbol)
  if (changedLeverage) {
    setLeverage(value)
  }
}

function updateSymbols (newSymbols) {
  symbols = newSymbols
  resetListenersAndCandles()
  if (botOn) {
    execute()
  }
  return true
}

function handleChangeStrategy (stratName) {
  const strategy = SET_STRATEGY[stratName] || hiddenDivergence
  setPeriodInterval(strategy.getInterval())
  setValidate(strategy.validateEntry)
  setStrategy(stratName)
  return true
}
function turnBotOn (bool) {
  if (bool) {
    if (!botOn) {
      listeners = []
      tradesOn = []
      setBotOn(bool)
      execute()
    }
  } else {
    resetListenersAndCandles()
    tradesOn = []
    setBotOn(bool)
  }
}

function resetListenersAndCandles () {
  listeners.forEach(list => { list.listener.close(1000) })
  listeners = []
  allCandles = []
}
module.exports = {
  setPeriodInterval,
  setValidate,
  setLeverage,
  setBotOn,
  execute,
  updateSymbols,
  setEntryValue,
  getAccountData,
  handleChangeStrategy,
  getTradesOn,
  turnBotOn
}

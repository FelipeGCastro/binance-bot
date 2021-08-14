const api = require('./services/api.js')
const operations = require('./operations/userDataUpdate')
const ws = require('./services/ws.js')
const telegram = require('./services/telegram')
const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const newOrder = require('./operations/newOrder')
const STRATEGIES = require('./tools/constants').STRATEGIES
const INDICATORS_OBJ = require('./tools/constants').INDICATORS_OBJ

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}

let strategy = STRATEGIES.SHARK
const symbols = [process.env.SYMBOL]
let botOn = false
let leverage = 4
let entryValue = 50

let validateEntry = SET_STRATEGY[strategy].validateEntry
let tradesOn = []
const maxEntryValue = entryValue + (0.3 * entryValue)
let entryPrice = 0
let stopMarketPrice, takeProfitPrice
let listenKeyIsOn = false
let interval = '5m'

const lastIndicatorsData = {
  [INDICATORS_OBJ.RSI]: null,
  [INDICATORS_OBJ.EMA]: null,
  [INDICATORS_OBJ.STOCH]: null,
  [INDICATORS_OBJ.TIME]: null
}
function setLastIndicatorsData (key, value) {
  lastIndicatorsData[key] = value
}

function setBotOn (bool) { botOn = bool }

function setLeverage (value) { leverage = value }
function setEntryValue (value) { entryValue = value }
function getAccountData () {
  return {
    symbols,
    botOn,
    leverage,
    entryValue,
    strategy,
    maxEntryValue,
    stopMarketPrice,
    takeProfitPrice,
    entryPrice,
    tradesOn,
    lastIndicatorsData
  }
}
function getTradesOn () { return tradesOn }
function setTradesOn (symb) { return tradesOn.push(symb) }
function removeFromTradesOn (symb) { tradesOn = tradesOn.filter(symbTrade => symbTrade === symb) }

function setValidate (func) { validateEntry = func }
function setPeriodInterval (int) { interval = int }
function setStrategy (value) { strategy = value }

function setStopMarketPrice (price) { stopMarketPrice = price }
function setTakeProfitPrice (price) { takeProfitPrice = price }
function setEntryPrice (price) { entryPrice = price }

// START MAIN FUNCTION
async function execute () {
  console.log('init')
  const allCandles = []

  symbols.forEach(async (symbol, symbolIndex) => {
    if (!symbol) return
    await changeLeverage(leverage, symbol)

    addAllCandles(symbol)
    setWsListeners(symbol, symbolIndex)
    console.log(symbol, symbolIndex, 'foreach')
  })
  async function addAllCandles (symbol) {
    const candles = await api.candles(symbol, interval)
    if (candles)allCandles.push(candles)
  }

  async function setWsListeners (symbol, symbolIndex) {
    let lastEventAt = 0
    // LISTEN CANDLES AND UPDTATE CANDLES WHEN CANDLE CLOSE
    ws.onKlineContinuos(symbol, interval, (data) => {
      if (data.k.x && data.E > lastEventAt) {
        lastEventAt = data.E
        handleCloseCandle(data, symbolIndex)
      }
    })
  }

  async function handleCloseCandle (data, symbolIndex) {
    await handleAddCandle(data, symbolIndex)
    const hasTradeOn = tradesOn.includes(symbols[symbolIndex])
    if (!hasTradeOn && listenKeyIsOn && botOn) {
      const valid = await validateEntry(allCandles[symbolIndex], setLastIndicatorsData)
      console.log('Fechou!', symbols[symbolIndex])
      if (valid) {
        setStopMarketPrice(valid.stopPrice)
        setTakeProfitPrice(valid.targetPrice)
        const ordered = await newOrder.handleNewOrder({ ...valid, entryValue, maxEntryValue, symbol: symbols[symbolIndex] })
        if (ordered) {
          handleOrdered(ordered, valid, symbolIndex)
        }
        console.log('Entry is Valid')
      }
      setLastIndicatorsData(INDICATORS_OBJ.TIME, data.k.t)
    }
  }

  function handleOrdered (ordered, valid, symbolIndex) {
    const entreValidTime = new Date(valid.timeLastCandle)
    setTradesOn(symbols[symbolIndex])
    console.log(ordered, 'ordered')
    setEntryPrice(ordered.avgPrice)
    telegram.sendMessage(`Hora de entrar no ${symbols[symbolIndex]}PERP, com stopLoss: ${valid.stopPrice} e Side: ${valid.side}, ${entreValidTime}`)
  }

  function handleAddCandle (data, symbolIndex) {
    const candles = allCandles[symbolIndex]
    const newCandle = [data.k.t, data.k.o, data.k.h, data.k.l, data.k.c, data.k.v, data.k.T, data.k.q, data.k.n, data.k.V, data.k.Q]
    if (newCandle[0] === candles[candles.length - 1][0]) {
      candles.pop()
    } else {
      candles.shift()
    }
    candles.push(newCandle)
    allCandles.splice(symbolIndex, 1, candles)
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
          const dataOrder = { ...data.o, stopMarketPrice, takeProfitPrice, removeFromTradesOn, symbols: tradesOn, entryPrice }
          newData = { ...data, o: dataOrder }
        } else { newData = { ...data, symbols: tradesOn } }
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

function setSymbols (symb) {
  const hasSymbol = symbols.includes(symb)
  if (symbols.length < 5 && !hasSymbol) {
    symbols.push(symb)
    return true
  } else {
    return false
  }
}
function updateSymbols (remSymbol, newSymbol) {
  const index = symbols.findIndex(symbol => symbol === remSymbol)
  if (index === -1) return false
  return symbols.splice(index, 1, newSymbol)
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
      setBotOn(bool)
      execute()
    }
  } else {
    setBotOn(bool)
  }
}

module.exports = {
  setPeriodInterval,
  setValidate,
  setLeverage,
  setBotOn,
  execute,
  setSymbols,
  updateSymbols,
  setEntryValue,
  getAccountData,
  handleChangeStrategy,
  getTradesOn,
  turnBotOn
}

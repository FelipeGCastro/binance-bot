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
let symbol = process.env.SYMBOL
let botOn = false
let leverage = 2
let entryValue = 50

let validateEntry = SET_STRATEGY[strategy].validateEntry
let tradingOn = false
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
function setSymbol (symb) { symbol = symb }
function setLeverage (value) { leverage = value }
function setEntryValue (value) { entryValue = value }
function getAccountData () {
  return {
    symbol,
    botOn,
    leverage,
    entryValue,
    strategy,
    maxEntryValue,
    stopMarketPrice,
    takeProfitPrice,
    entryPrice,
    tradingOn,
    lastIndicatorsData
  }
}
function getTradeOn () { return tradingOn }

function setValidate (func) { validateEntry = func }
function setPeriodInterval (int) { interval = int }
function setTradingOn (bool) { tradingOn = bool }
function setStrategy (value) { strategy = value }

function setStopMarketPrice (price) { stopMarketPrice = price }
function setTakeProfitPrice (price) { takeProfitPrice = price }
function setEntryPrice (price) { entryPrice = price }

// START MAIN FUNCTION
async function execute () {
  console.log('init')
  changeLeverage(leverage)

  const candles = await api.candles(symbol, interval)

  let lastEventAt = 0
  // LISTEN CANDLES AND UPDTATE CANDLES WHEN CANDLE CLOSE
  ws.onKlineContinuos(symbol, interval, async (data) => {
    if (data.k.x && data.E > lastEventAt) {
      lastEventAt = data.E
      await handleCloseCandle(data)
    }
  })

  async function handleCloseCandle (data) {
    await handleAddCandle(data)
    if (!tradingOn && listenKeyIsOn && botOn) {
      const valid = validateEntry(candles, setLastIndicatorsData)
      console.log('Fechou!')
      if (valid) {
        setStopMarketPrice(valid.stopPrice)
        setTakeProfitPrice(valid.targetPrice)
        const ordered = await newOrder.handleNewOrder({ ...valid, entryValue, maxEntryValue, symbol })
        if (ordered) {
          const entreValidTime = new Date(valid.timeLastCandle)
          setTradingOn(true)
          setEntryPrice(ordered.avgPrice)
          telegram.sendMessage(`Hora de entrar no ${symbol}PERP, com stopLoss: ${valid.stopPrice} e Side: ${valid.side}, ${entreValidTime}`)
        }
        console.log('Entry is Valid')
      }
      setLastIndicatorsData(INDICATORS_OBJ.TIME, data.k.t)
    }
  }

  function handleAddCandle (data) {
    const newCandle = [data.k.t, data.k.o, data.k.h, data.k.l, data.k.c, data.k.v, data.k.T, data.k.q, data.k.n, data.k.V, data.k.Q]
    if (newCandle[0] === candles[candles.length - 1][0]) {
      candles.pop()
    } else {
      candles.shift()
    }
    candles.push(newCandle)
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
          const dataOrder = { ...data.o, stopMarketPrice, takeProfitPrice, setTradingOn, symbol, entryPrice }
          newData = { ...data, o: dataOrder }
        } else { newData = { ...data, symbol } }
        operations.handleUserDataUpdate(newData)
      }
    })
  }
}

async function changeLeverage (value) {
  const changedLeverage = await api.changeLeverage(leverage, symbol)
  if (changedLeverage) {
    setLeverage(value)
  }
}

function handleChangeStrategy (stratName) {
  const strategy = SET_STRATEGY[stratName] || hiddenDivergence
  if (tradingOn) {
    return false
  } else {
    setPeriodInterval(strategy.getInterval())
    setValidate(strategy.validateEntry)
    setStrategy(stratName)
    return true
  }
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
  setTradingOn,
  setValidate,
  setLeverage,
  setBotOn,
  execute,
  setSymbol,
  setEntryValue,
  getAccountData,
  handleChangeStrategy,
  getTradeOn,
  turnBotOn
}

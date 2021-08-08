const api = require('./api.js')
const operations = require('./operations/tpsl')
const ws = require('./lib/ws.js')
const telegram = require('./services/telegram')
const hiddenDivergence = require('./strategies/hiddenDivergence')

// TELEGRAM BOT FUNCTIONS

const symbol = process.env.SYMBOL
let interval = '1m'
let validateEntry = hiddenDivergence.validateEntry
const amountCandles = 500
let tradingOn = false

const setPeriodInterval = (int) => { interval = int }
const setTradingOn = (data) => { tradingOn = data }
const getTradingOn = () => tradingOn
const setValidate = (func) => { validateEntry = func }

// START MAIN FUNCTION
async function execute () {
  // TESTING PART CODE, REMOVE AFTER TESTING
  // ----------------------------
  // ----------------------------
  // const tempCandles = await api.candlesTemp(symbol, interval)
  // const valid = validateEntry(tempCandles)
  // console.log(valid, 'Results test')

  // ---------------------------- END
  // ----------------------------

  const candles = await api.candles(symbol, interval, amountCandles)
  getListenKey()

  // LISTEN CANDLES AND UPDTATE CANDLES WHEN CANDLE CLOSE
  ws.onKlineContinuos(symbol, interval, async (data) => {
    if (data.k.x) {
      await handleCloseCandle(data)
    }
  })

  async function handleCloseCandle (data) {
    let thinkingArry = []
    setTimeout(() => { thinkingArry = [] }, 2000)
    thinkingArry.push(data.k.x)
    await handleAddCandle(data)
    if (!thinkingArry[1] && !tradingOn) {
      const timeMin = new Date()
      console.log(candles[candles.length - 1][0], candles[candles.length - 2][0])
      console.log('fechou!', timeMin.getMinutes())
      const result = validateEntry(candles)
      if (result) {
        console.log(result)
        telegram.sendMessage(`Hora de entrar no ${symbol}PERP, com stopLoss: ${result.stopPrice} e Side: ${result.side}, ${result.timeLastCandle}`)
      }
    }
  }

  async function handleAddCandle (data) {
    const newCandle = [data.k.t, data.k.o, data.k.h, data.k.l, data.k.c, data.k.v, data.k.T, data.k.q, data.k.n, data.k.V, data.k.Q]
    if (newCandle[0] === candles[candles.length - 1][0]) {
      candles.pop()
    } else {
      candles.shift()
    }
    candles.push(newCandle)
  }

  async function getListenKey () {
    const data = await api.listenKey()
    setWsListen(data.listenKey)
  }

  async function setWsListen (listenKey) {
    ws.listenKey(listenKey, async (data) => {
      if (data.e === 'listenKeyExpired') {
        await getListenKey()
        console.log('listenKeyExpired')
      } else {
        operations.handleUserDataUpdate(data, candles)
      }
    })
  }
}

execute()

module.exports = {
  setPeriodInterval,
  setTradingOn,
  getTradingOn,
  setValidate,
  execute
}

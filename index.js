const api = require('./services/api.js')
const operations = require('./operations/tpsl')
const ws = require('./services/ws.js')
const telegram = require('./services/telegram')
const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const newOrder = require('./operations/newOrder')
const STRATEGIES = require('./tools/constants').STRATEGIES
const telegramUserId = Number(process.env.TELEGRAM_USER_ID)

// TELEGRAM BOT FUNCTIONS

let symbol = process.env.SYMBOL
let interval = '1m'
let validateEntry = hiddenDivergence.validateEntry
const amountCandles = 200
let tradingOn = false
let botOn = true
let listenKeyIsOn = false
let stopMarketPrice, takeProfitPrice
let leverage = 2

function setPeriodInterval (int) { interval = int }
function setTradingOn (bool) { tradingOn = bool }
function getTradingOn () { return tradingOn }
function setValidate (func) { validateEntry = func }
function setBotOn (bool) {
  console.log('set bot')
  botOn = bool
}
function setSymbol (symb) { symbol = symb }
function getSymbol () { return symbol }
function setStopMarketPrice (price) { stopMarketPrice = price }
function setTakeProfitPrice (price) { takeProfitPrice = price }
function setLeverage (value) { leverage = value }

// START MAIN FUNCTION
async function execute () {
  // TESTING PART CODE, REMOVE AFTER TESTING
  // ----------------------------
  // ----------------------------
  const candles = await api.candlesTemp(symbol, interval)

  // ---------------------------- END
  // ----------------------------
  changeLeverage(leverage)

  // const candles = await api.candles(symbol, interval, amountCandles)

  let lastEventAt = 0
  // LISTEN CANDLES AND UPDTATE CANDLES WHEN CANDLE CLOSE
  ws.onKlineContinuos(symbol, interval, async (data) => {
    if (data.k.x && data.E > lastEventAt) {
      lastEventAt = data.E
      // await handleCloseCandle(data)
      await handleCloseCandle() // ONLY FOR TEST
    }
  })

  async function handleCloseCandle (data) {
    // await handleAddCandle(data)
    if (!tradingOn && listenKeyIsOn && botOn) {
      const timeMin = new Date()
      console.log('fechou!', timeMin.getMinutes())
      const result = validateEntry(candles)
      if (result) {
        console.log(result)
        setStopMarketPrice(result.stopPrice)
        setTakeProfitPrice(result.targetPrice)
        const ordered = await newOrder.handleNewOrder({ ...result, symbol })
        if (ordered) {
          setTradingOn(true)
        }
        console.log(tradingOn, 'tradingOn')
        // telegram.sendMessage(`Hora de entrar no ${symbol}PERP, com stopLoss: ${result.stopPrice} e Side: ${result.side}, ${result.timeLastCandle}`)
      }
    }
  }

  // async function handleAddCandle (data) {
  //   const newCandle = [data.k.t, data.k.o, data.k.h, data.k.l, data.k.c, data.k.v, data.k.T, data.k.q, data.k.n, data.k.V, data.k.Q]
  //   if (newCandle[0] === candles[candles.length - 1][0]) {
  //     candles.pop()
  //   } else {
  //     candles.shift()
  //   }
  //   candles.push(newCandle)
  // }

  getListenKey()
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
        console.log('listenKeyExpired')
      } else {
        let newData
        if (data.o) {
          const dataOrder = { ...data.o, stopMarketPrice, takeProfitPrice, setTradingOn, symbol }
          newData = { ...data, o: dataOrder }
        } else { newData = data }
        operations.handleUserDataUpdate(newData)
      }
    })
  }
}

execute()

telegram.listenSharkStrategy((ctx) => handleChangeStrategy(STRATEGIES.SHARK))
telegram.listenDivergenceStrategy((ctx) => handleChangeStrategy(STRATEGIES.HIDDEN_DIVERGENCE))
telegram.listenStopBot((ctx) => setBotOn(true))
telegram.listen2xLeverage((ctx) => changeLeverage(2))
telegram.listen3xLeverage((ctx) => changeLeverage(3))
telegram.listen4xLeverage((ctx) => changeLeverage(4))
telegram.listenStatus((ctx) => {
  ctx.reply(`
  coin: ${symbol},
  periodo: ${interval},
  Quantidade de Candles: ${amountCandles},
  Operando: ${tradingOn},
  Bot Ligado: ${botOn},
  Listen Key: ${listenKeyIsOn},
  Alavancagem: ${leverage}x
  `)
})

async function changeLeverage (value) {
  const changedLeverage = await api.changeLeverage(leverage, symbol)
  if (changedLeverage) {
    setLeverage(value)
    console.log(value, 'changeLeverage')
  }
}
const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}

function handleChangeStrategy (stratName, ctx) {
  if (ctx.from.id === telegramUserId) {
    const strategy = SET_STRATEGY[stratName] || hiddenDivergence
    if (getTradingOn()) {
      ctx.reply('Está no meio de um trading, tente novamente mais tarde.')
    } else {
      setPeriodInterval(strategy.getInterval())
      setValidate(strategy.validateEntry)
      execute()
      ctx.reply('Estrategia Mudada com Sucesso')
    }
  } else {
    ctx.reply('Você não tem autorização')
  }
}

module.exports = {
  setPeriodInterval,
  setTradingOn,
  getTradingOn,
  setValidate,
  setLeverage,
  setBotOn,
  execute,
  setSymbol,
  getSymbol
}

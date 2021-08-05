const api = require('./api.js')
const ema = require('./indicators/ema.js')
const rsi = require('./indicators/rsi.js')
const stoch = require('./indicators/stoch.js')
const operations = require('./operations/tpsl')
const ws = require('./lib/ws.js')
const { Telegraf } = require('telegraf')

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
const telegramUserId = Number(process.env.TELEGRAM_USER_ID)
const symbol = process.env.SYMBOL
// const priceFormat = new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' })

// TELEGRAM BOT FUNCTIONS
function sendMessage (message, id = telegramUserId) {
  bot.telegram.sendMessage(id, message)
}

// END TELEGRAM BOT
// START MAIN FUNCTION
async function execute () {
  const candles = await api.candles(symbol, 201)
  getListenKey()
  // const balance = await api.getBalance()

  // if (balance) {
  //   const newBalance = balance.filter((coin) => (coin.asset === 'USDT'))[0].availableBalance
  //   bot.hears('Saldo', ctx => ctx.telegram.sendMessage(telegramUserId, `Saldo: ${priceFormat.format(newBalance)}`))
  //   // bot.telegram.sendMessage(telegramUserId, `Saldo: ${priceFormat.format(newBalance)}`)
  // }

  ws.onKlineContinuos(symbol, '1m', (data) => {
    if (data.k.x) {
      if (handleAddCandle(data)) {
        console.log(ema.checkingTranding(candles), 'EMA')
        console.log(rsi.checkingRsi(candles), 'RSI')
        console.log(stoch.checkingStoch(candles), 'STOCH')
      }
    }
  })

  async function handleAddCandle (data) {
    const newCandle = [data.k.t, data.k.o, data.k.h, data.k.l, data.k.c, data.k.v, data.k.T, data.k.q, data.k.n, data.k.V, data.k.Q]
    if (data.k.t === candles[candles.length - 1][0]) {
      candles.pop()
      candles.push(newCandle)
      return false
    } else {
      candles.shift()
      candles.push(newCandle)
      return true
    }
  }

  async function getListenKey () {
    const data = await api.listenKey()
    setWsListen(data.listenKey)
  }

  async function setWsListen (listenKey) {
    ws.listenKey(listenKey, async (data) => {
      if (data.e === 'listenKeyExpired') {
        getListenKey()
        console.log('listenKeyExpired')
      } else {
        operations.handleUserDataUpdate(data, candles, sendMessage)
      }
    })
  }
}

bot.hears('Ligar', (ctx) => {
  if (ctx.from.id === telegramUserId) {
    ctx.reply('Ligado')
  }
})
execute()
bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

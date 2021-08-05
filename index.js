const api = require('./api.js')
const operations = require('./operations/tpsl')
const ws = require('./lib/ws.js')
const { Telegraf } = require('telegraf')
const { STRATEGIES } = require('./tools/constants')

const sharkStrategy = require('./strategies/shark')

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
const telegramUserId = Number(process.env.TELEGRAM_USER_ID)
const priceFormat = new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' })

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy
}

// TELEGRAM BOT FUNCTIONS
function sendMessage (message, id = telegramUserId) {
  bot.telegram.sendMessage(id, message)
}

const symbol = process.env.SYMBOL
let interval = '5m'
let validateEntry = sharkStrategy.validateEntry
const tradingOn = false

bot.hears('SHARKSTRATEGY', ctx => handleChangeStrategy('SHARK'))

bot.hears('Saldo', async ctx => {
  const balance = await api.getBalance()
  const newBalance = balance.filter((coin) => (coin.asset === 'USDT'))[0].availableBalance
  ctx.telegram.sendMessage(telegramUserId, `Saldo: ${priceFormat.format(newBalance)}`)
})
// END TELEGRAM BOT
// START MAIN FUNCTION
async function execute () {
  const candles = await api.candles(symbol, interval, 201)
  getListenKey()

  ws.onKlineContinuos(symbol, interval, (data) => {
    if (data.k.x) {
      if (handleAddCandle(data)) {
        console.log('fechou!')
        const result = validateEntry(candles)
        if (result) {
          sendMessage(`Hora de entrar no ${symbol}PERP, com stopLoss: ${result.stopPercentage} e StopGain: ${result.gainPercentage}`)
        }
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
function handleChangeStrategy (stratName, ctx) {
  if (ctx.from.id === telegramUserId) {
    const strategy = SET_STRATEGY[stratName] || sharkStrategy
    if (tradingOn) {
      ctx.reply('Está no meio de um trading, tente novamente mais tarde.')
    } else {
      interval = strategy.getInterval()
      validateEntry = strategy.validateEntry
      ctx.reply('Ligado')
    }
  } else {
    ctx.reply('Você não tem autorização')
  }
}

bot.hears('Ligar', (ctx) => {
  if (ctx.from.id === telegramUserId) {
    ctx.reply('Ligado')
  }
})
bot.hears('Oi', (ctx) => {
  console.log(ctx.from)
  ctx.reply('Fala André, obrigadão!')
})
execute()
bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

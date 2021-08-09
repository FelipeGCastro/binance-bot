const { Telegraf } = require('telegraf')
const api = require('../api')
const telegramUserId = Number(process.env.TELEGRAM_USER_ID)
const priceFormat = new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' })

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

bot.hears('Saldo', async ctx => {
  if (ctx.from.id === telegramUserId) {
    const balance = await api.getBalance()
    const newBalance = balance.filter((coin) => (coin.asset === 'USDT'))[0].availableBalance
    ctx.reply(`Saldo: ${priceFormat.format(newBalance)}`)
  }
})

function verification (func, id, ctx) { if (id === telegramUserId) { return func(ctx) } }

function listenSharkStrategy (func) {
  return bot.hears('SHARKSTRATEGY', ctx => verification(func, ctx.from.id))
}

function listenDivergenceStrategy (func) {
  return bot.hears('HIDDENDIVERGENCE', ctx => verification(func, ctx.from.id))
}

function listenStopBot (func) {
  return bot.hears('Stopbot', ctx => verification(func, ctx.from.id))
}

function listen2xLeverage (func) {
  return bot.hears('2x', ctx => verification(func, ctx.from.id))
}

function listen3xLeverage (func) {
  return bot.hears('3x', ctx => verification(func, ctx.from.id))
}

function listen4xLeverage (func) {
  return bot.hears('4x', ctx => verification(func, ctx.from.id))
}
function listenStatus (func) {
  return bot.hears('Status', ctx => verification(func, ctx.from.id, ctx))
}

function sendMessage (message, id = telegramUserId) {
  bot.telegram.sendMessage(id, message)
}

bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

module.exports = {
  bot,
  listenSharkStrategy,
  listenDivergenceStrategy,
  listenStopBot,
  sendMessage,
  listen2xLeverage,
  listen3xLeverage,
  listen4xLeverage,
  listenStatus
}

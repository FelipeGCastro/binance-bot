const { Telegraf } = require('telegraf')
const api = require('../api')
const telegramUserId = Number(process.env.TELEGRAM_USER_ID)
const priceFormat = new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' })

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

bot.hears('Saldo', async ctx => {
  const balance = await api.getBalance()
  const newBalance = balance.filter((coin) => (coin.asset === 'USDT'))[0].availableBalance
  ctx.telegram.sendMessage(telegramUserId, `Saldo: ${priceFormat.format(newBalance)}`)
})

function listenSharkStrategy (func) {
  return bot.hears('SHARKSTRATEGY', ctx => func())
}

function listenDivergenceStrategy (func) {
  return bot.hears('HIDDENDIVERGENCE', ctx => func())
}

function listenStopBot (func) {
  return bot.hears('Stopbot', ctx => func())
}

function listen2xLeverage (func) {
  return bot.hears('2x', ctx => func())
}

function listen3xLeverage (func) {
  return bot.hears('3x', ctx => func())
}

function listen4xLeverage (func) {
  return bot.hears('4x', ctx => func())
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
  listen4xLeverage
}

const { Telegraf } = require('telegraf')
const api = require('../services/api')
const telegramUserId = Number(process.env.TELEGRAM_USER_ID)
const priceFormat = new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' })
const telegramToken = process.env.DEV_ENV === 'DEV' ? process.env.TELEGRAM_LOCAL_TOKEN : process.env.TELEGRAM_TOKEN

const bot = new Telegraf(telegramToken)

bot.hears('Saldo', async ctx => {
  if (ctx.from.id === telegramUserId) {
    const balance = await api.getBalance()
    const newBalance = balance.filter((coin) => (coin.asset === 'USDT'))[0].availableBalance
    ctx.reply(`Saldo: ${priceFormat.format(newBalance)}`)
  }
})

function sendMessage (message, id = telegramUserId) {
  bot.telegram.sendMessage(id, message)
}

bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

module.exports = {
  bot,
  sendMessage
}

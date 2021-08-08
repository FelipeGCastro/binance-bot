const { Telegraf } = require('telegraf')
const api = require('../api')
const { STRATEGIES } = require('../tools/constants')
const telegramUserId = Number(process.env.TELEGRAM_USER_ID)
const priceFormat = new Intl.NumberFormat('en-us', { style: 'currency', currency: 'USD' })
const sharkStrategy = require('../strategies/shark')
const hiddenDivergence = require('../strategies/hiddenDivergence')
const home = require('../index')

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

bot.hears('SHARKSTRATEGY', ctx => handleChangeStrategy(STRATEGIES.SHARK))

bot.hears('HIDDENDIVERGENCE', ctx => handleChangeStrategy(STRATEGIES.HIDDEN_DIVERGENCE))

bot.hears('Saldo', async ctx => {
  const balance = await api.getBalance()
  const newBalance = balance.filter((coin) => (coin.asset === 'USDT'))[0].availableBalance
  ctx.telegram.sendMessage(telegramUserId, `Saldo: ${priceFormat.format(newBalance)}`)
})

function sendMessage (message, id = telegramUserId) {
  bot.telegram.sendMessage(id, message)
}

function handleChangeStrategy (stratName, ctx) {
  if (ctx.from.id === telegramUserId) {
    const strategy = SET_STRATEGY[stratName] || hiddenDivergence
    if (home.getTradingOn()) {
      ctx.reply('Está no meio de um trading, tente novamente mais tarde.')
    } else {
      home.setPeriodInterval(strategy.getInterval())
      home.setValidate(strategy.validateEntry)
      home.execute()
      ctx.reply('Estrategia Mudada com Sucesso')
    }
  } else {
    ctx.reply('Você não tem autorização')
  }
}

bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

module.exports = {
  bot,
  sendMessage
}

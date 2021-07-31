const EMA = require('trading-signals').EMA
const tools = require('../tools/index.js')

function checkingTranding (data) {
  const ema200 = new EMA(200)
  const ema50 = new EMA(50)
  const dataClose = tools.extractData(data)
  const data50 = dataClose.slice(Math.max(data.length - 51, 1))
  dataClose.forEach(price => {
    ema200.update(price)
  })
  data50.forEach(price => {
    ema50.update(price)
  })
  if (ema200.isStable && ema50.isStable) {
    const emaTwoHundred = ema200.getResult().toPrecision(12)
    const emaFifty = ema50.getResult().toPrecision(12)

    return emaTwoHundred < emaFifty ? `LONG 200: ${emaTwoHundred} 50: ${emaFifty}` : `SHORT 200: ${emaTwoHundred} 50: ${emaFifty}`
  }
}

module.exports = { checkingTranding }

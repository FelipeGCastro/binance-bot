const tools = require('../tools/index.js')
const RSI = require('trading-signals').RSI

function checkingRsi (data) {
  const rsi = new RSI(14)
  const dataClose = tools.extractData(data.slice(Math.max(data.length - 15, 1)))
  dataClose.forEach(closePrice => {
    rsi.update(closePrice)
  })
  if (rsi.isStable) {
    return rsi.getResult().toPrecision(12)
  }
}

module.exports = { checkingRsi }

const tools = require('../tools/index.js')
const RSI = require('trading-signals').RSI

function checkingRsi (data) {
  const rsi = new RSI(14)
  const dataClose = tools.extractData(tools.getLasts(data, 15))
  dataClose.forEach(closePrice => {
    rsi.update(closePrice)
  })
  if (rsi.isStable) {
    return rsi.getResult().toPrecision(12)
  }
}

module.exports = { checkingRsi }

const tools = require('../tools/index.js')
const RSI = require('trading-signals').RSI
// const EMA = require('trading-signals').EMA

function checkingRsi (data) {
  const rsi = new RSI(14)
  const dataClose = tools.extractData(data)
  dataClose.forEach(closePrice => {
    rsi.update(closePrice)
  })
  if (rsi.isStable) {
    return rsi.getResult().toPrecision(4)
  }
}

module.exports = { checkingRsi }

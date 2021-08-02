const Stochastic = require('technicalindicators').Stochastic
const tools = require('../tools/index.js')

function checkingStoch (data) {
  const dataClose = tools.extractData(tools.getLasts(data, 16))
  const dataHigh = tools.extractData(tools.getLasts(data, 16), 'HIGH')
  const dataLow = tools.extractData(tools.getLasts(data, 16), 'LOW')
  const input = {
    high: dataHigh,
    low: dataLow,
    close: dataClose,
    period: 14,
    signalPeriod: 3
  }

  return Stochastic.calculate(input)
}

module.exports = { checkingStoch }

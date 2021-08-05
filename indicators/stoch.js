const Stochastic = require('technicalindicators').Stochastic
const tools = require('../tools/index.js')

function checkingStoch (data) {
  const dataClose = tools.extractData(data)
  const dataHigh = tools.extractData(data, 'HIGH')
  const dataLow = tools.extractData(data, 'LOW')
  const input = {
    high: dataHigh,
    low: dataLow,
    close: dataClose,
    period: 14,
    signalPeriod: 3,
    smoothing: 3,
    format: n => tools.ParseFloat(n, 2)
  }
  const stoch = Stochastic.calculate(input)

  return stoch[stoch.length - 1]
}

module.exports = { checkingStoch }

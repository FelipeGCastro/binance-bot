const Stochastic = require('technicalindicators').Stochastic
const tools = require('../tools/index.js')

function checkingStoch (data) {
  const dataClose = tools.extractData(data.slice(Math.max(data.length - 16, 1)))
  const dataHigh = tools.extractData(data.slice(Math.max(data.length - 16, 1)), 'HIGH')
  const dataLow = tools.extractData(data.slice(Math.max(data.length - 16, 1)), 'LOW')
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

const BB = require('technicalindicators').BollingerBands

function getBBands (values, periodTime = 20, dev = 2) {
  const period = periodTime

  const input = {
    period: period,
    values: values,
    stdDev: dev

  }
  return BB.calculate(input)
}

module.exports = getBBands

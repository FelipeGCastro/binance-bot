const rsi = require('../indicators/rsi.js')
const stoch = require('../indicators/stoch.js')
const tools = require('../tools/index')
const STRATEGIES = require('../tools/constants').STRATEGIES

const periodTime = '5m'
const rsiPeriod = 3// 80 - 20
const stochPeriod = 3 // 80 - 20

function validateEntry (candles) {
  const validatedStoch = validateStoch(candles)
  const validatedRsi = validateRsi(candles)
  if (!validatedStoch) {
    return false
  }
  if (!validatedRsi) {
    return false
  } else {
    return {
      strategy: STRATEGIES.HIDDEN_DIVERGENCE,
      stopPercentage: 0.5,
      gainPercentage: 0.5
    }
  }
}

function getInterval () {
  return periodTime
}

function validateRsi (candles) {
  const rsiArray = rsi.checkingRsi(candles, rsiPeriod)
  const lastTwoRsi = tools.getLasts(rsiArray, 2)
  const over80 = lastTwoRsi[0] > 80 || lastTwoRsi[1] > 80
  const under20 = lastTwoRsi[0] < 20 || lastTwoRsi[1] < 20
  console.log(lastTwoRsi[1], 'validateRsi')
  if (over80) return 'SHORT'
  if (under20) return 'LONG'
  return false
}

function validateStoch (candles) {
  const stochArray = stoch.checkingStoch(candles, stochPeriod)
  const lastTwoStoch = tools.getLasts(stochArray, 2)
  const lastK = lastTwoStoch[1].k
  const beforeK = lastTwoStoch[0].k
  const lastD = lastTwoStoch[1].d
  const beforeD = lastTwoStoch[0].d
  const kOver80 = beforeK > 80 && lastK > 80
  const dOver80 = beforeD > 80 && lastD > 80
  const kUnder20 = beforeK > 20 && lastK > 20
  const dUnder20 = beforeD > 20 && lastD > 20
  if (kOver80 && dOver80) {
    const crossDown = lastK < lastD && beforeK > beforeD ? 'SHORT' : false
    return crossDown
  } else if (kUnder20 && dUnder20) {
    const crossUp = lastK > lastD && beforeK < beforeD ? 'LONG' : false
    return crossUp
  } else {
    return false
  }
}

module.exports = {
  getInterval,
  validateEntry
}

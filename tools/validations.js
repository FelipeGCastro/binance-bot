const stoch = require('../indicators/stoch.js')
const POSITION = require('../tools/constants').POSITION_SIDE
const tools = require('./index')

function hasCrossStoch (candles, stochPeriod) {
  const stochArray = stoch.checkingStoch(candles, stochPeriod)
  const lastTwoStoch = tools.getLasts(stochArray, 2)
  const lastK = lastTwoStoch[1].k
  const beforeK = lastTwoStoch[0].k
  const lastD = lastTwoStoch[1].d
  const beforeD = lastTwoStoch[0].d
  const crossDown = lastK <= lastD && beforeK > beforeD ? POSITION.SHORT : false
  const crossUp = lastK >= lastD && beforeK < beforeD ? POSITION.LONG : false
  if (crossDown) {
    return crossDown
  } else if (crossUp) {
    return crossUp
  } else {
    return false
  }
}

module.exports = {
  hasCrossStoch
}

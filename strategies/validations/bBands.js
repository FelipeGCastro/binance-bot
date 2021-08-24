const getBBands = require('../../indicators/bb')
const { getLasts, extractData } = require('../../tools')
const { POSITION_SIDE, CANDLE } = require('../../tools/constants')

function validationBBands (candles, positionSide, dev) {
  const bBandsArray = getBBands(extractData(candles))
  const lastTwoBB = getLasts(bBandsArray, 2)
  const lastTwoCandles = getLasts(candles, 2)

  if (positionSide === POSITION_SIDE.SHORT) {
    const crossUp = lastTwoCandles[0][CANDLE.HIGH] > lastTwoBB[0].upper ||
      lastTwoCandles[1][CANDLE.HIGH] > lastTwoBB[1].upper
    if (crossUp) {
      console.log(
        'B. Bands - last: ', lastTwoBB[1].upper,
        'before: ', lastTwoBB[0].upper,
        'date: ',
        new Date(lastTwoCandles[0][CANDLE.OPEN_TIME])
      )
      return true
    } else return false
  } else if (positionSide === POSITION_SIDE.LONG) {
    const crossDown = lastTwoCandles[0][CANDLE.LOW] < lastTwoBB[0].lower ||
    lastTwoCandles[1][CANDLE.LOW] < lastTwoBB[1].lower
    if (crossDown) {
      return true
    } else return false
  } else return false
}

module.exports = validationBBands

const api = require('../api')
const STRATEGIES = require('../tools/constants').STRATEGIES
const home = require('../index')
const help = require('../helpers')
const tools = require('../tools')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE

let stake = 40
const maxStake = stake + (0.3 * stake)

const setStake = (value) => { stake = value }
const getStake = () => stake

function handleNewOrder (data) {
  if (data.strategy === STRATEGIES.HIDDEN_DIVERGENCE) {
    handleDivergenceOrder(data)
  } else if (data.strategy === STRATEGIES.SHARK) {
    console.log('strategy ', STRATEGIES.SHARK)
  } else {
    console.log('no strategy')
  }
}

function handleDivergenceOrder (data) {
  const closePrice = data.closePrice
  const quantity = getQty(closePrice)
  const side = data.side
  const type = ORDER_TYPE.MARKET
  const symbol = home.getSymbol()
  api.newOrder(symbol, quantity, side, type)
}

function getQty (closePrice) {
  let qty
  const symbol = home.getSymbol()
  const { qtyFormat, minQty } = help.getQtyRules(symbol)

  const calQty = stake / closePrice
  if (calQty < minQty) {
    if ((minQty * closePrice) < maxStake) {
      qty = minQty
    } else {
      return false
    }
  } else {
    qty = tools.ParseFloatByFormat(calQty, qtyFormat)
    return qty
  }
}
// strategy: STRATEGIES.HIDDEN_DIVERGENCE,
// timeLastCandle: candles[candles.length - 1][0],
// side: hasCrossStoch,
// stopPrice: divergence.lastTopOrBottomPrice,
// closePrice: divergence.lastClosePrice

module.exports = {
  handleNewOrder,
  setStake,
  getStake
}

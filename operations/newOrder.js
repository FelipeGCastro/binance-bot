const api = require('../services/api')
const STRATEGIES = require('../tools/constants').STRATEGIES
const POSITION = require('../tools/constants').POSITION_SIDE
const SIDE = require('../tools/constants').SIDE
const help = require('../helpers')
const tools = require('../tools')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE

function handleNewOrder (data) {
  if (data.strategy === STRATEGIES.HIDDEN_DIVERGENCE) {
    return handleDivergenceOrder(data)
  } else if (data.strategy === STRATEGIES.SHARK) {
    console.log('strategy ', STRATEGIES.SHARK)
  } else {
    console.log('no strategy')
  }
}

async function handleDivergenceOrder (data) {
  const quantity = await getQty(data)
  const side = data.side === POSITION.LONG ? SIDE.BUY : SIDE.SELL
  const type = ORDER_TYPE.MARKET
  const symbol = data.symbol
  console.log(symbol, quantity, side, type, 'handleDivergenceOrder')
  if (symbol && quantity && side && type) {
    const ordered = await api.newOrder(symbol, quantity, side, type)
    if (ordered) {
      return ordered
    } else {
      return false
    }
  } else {
    return false
  }
}

async function getQty (data) {
  let qty
  const { qtyFormat, minQty } = await help.getQtyRules(data.symbol)

  const calQty = data.stake / data.closePrice
  console.log(calQty, minQty)
  if (calQty < minQty) {
    if ((minQty * data.closePrice) < data.maxStake) {
      console.log('price not expected saida 220')
      qty = minQty
      return qty
    } else {
      console.log('price not expected saida 221')
      return false
    }
  } else {
    qty = tools.ParseFloatByFormat(calQty, qtyFormat)
    console.log(qty, 'saida 222')
    return qty
  }
}
// strategy: STRATEGIES.HIDDEN_DIVERGENCE,
// timeLastCandle: candles[candles.length - 1][0],
// side: hasCrossStoch,
// stopPrice: divergence.lastTopOrBottomPrice,
// closePrice: divergence.lastClosePrice

module.exports = {
  handleNewOrder
}

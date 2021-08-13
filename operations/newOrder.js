const api = require('../services/api')
const POSITION = require('../tools/constants').POSITION_SIDE
const SIDE = require('../tools/constants').SIDE
const help = require('../helpers')
const tools = require('../tools')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE

async function handleNewOrder (data) {
  const quantity = await getQty(data)
  const side = data.side === POSITION.LONG ? SIDE.BUY : SIDE.SELL
  const type = ORDER_TYPE.MARKET
  const symbol = data.symbol
  if (symbol && quantity && side && type) {
    const ordered = await api.newOrder(symbol, quantity, side, type)
    if (ordered) {
      console.log('Ordered successfully')
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
  if (calQty < minQty) {
    if ((minQty * data.closePrice) < data.maxEntryValue) {
      qty = minQty
      return qty
    } else {
      console.log('Minimum qty is bigger then your max entry price')
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
  handleNewOrder
}

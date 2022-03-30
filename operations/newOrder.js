const api = require('../services/api')
const POSITION = require('../tools/constants').POSITION_SIDE
const SIDE = require('../tools/constants').SIDE
const help = require('../helpers')
const tools = require('../tools')
const { sendMessage } = require('../services/telegram')
const ORDER_TYPE = require('../tools/constants').ORDER_TYPE

async function handleNewOrder ({
  sidePosition,
  symbol,
  entryValue,
  closePrice,
  maxEntryValue
}) {
  const quantity = await getQty({
    entryValue,
    closePrice,
    symbol
  })
  const side = sidePosition === POSITION.LONG ? SIDE.BUY : SIDE.SELL
  const type = ORDER_TYPE.MARKET

  if (symbol && quantity && type) {
    const created = await api.newOrder(symbol, quantity, side, type)
    if (created) {
      sendMessage('Ordem Criada!' + JSON.stringify(created, null, 2))
    }
    return true
  } else {
    console.log('Some problem with create new order')
    return false
  }
}

async function getQty ({
  symbol,
  entryValue,
  closePrice
}) {
  let qty
  let qtyFormat = '0.001'
  let minQty = '0.001'
  const checkRule = await help.getQtyRules(symbol)
  if (checkRule) {
    qtyFormat = checkRule.qtyFormat
    minQty = checkRule.minQty
  }

  const calQty = entryValue / closePrice

  if (calQty < minQty) {
    return false
  } else {
    qty = tools.ParseFloatByFormat(calQty, qtyFormat)
    return qty
  }
}

module.exports = {
  handleNewOrder,
  getQty
}

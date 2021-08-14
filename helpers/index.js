const api = require('../services/api')
let exchangeInfo
async function getQtyRules (symbol) {
  if (!exchangeInfo) {
    exchangeInfo = await api.exchangeInfo()
    if (!exchangeInfo) return false
  }
  const symbolData = exchangeInfo.symbols.find(data => data.symbol === symbol)
  const filter = symbolData.filters.find(filter => filter.filterType === 'LOT_SIZE')
  console.log(filter, symbolData.length)
  if (!!filter.stepSize && !!filter.minQty) {
    return {
      qtyFormat: filter.stepSize,
      minQty: filter.minQty
    }
  } else return false
}

async function getAllSymbols () {
  if (!exchangeInfo) {
    exchangeInfo = await api.exchangeInfo()
    if (!exchangeInfo) return console.error('Error getting exchange info.')
  }
  const allSymbols = exchangeInfo.symbols.map(data => data.symbol)

  return allSymbols
}

module.exports = {
  getQtyRules,
  getAllSymbols
}

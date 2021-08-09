const api = require('../services/api')
let exchangeInfo
async function getQtyRules (symbol) {
  if (!exchangeInfo) {
    exchangeInfo = await api.exchangeInfo()
    if (!exchangeInfo) return console.log('Error getting exchange info.')
  }
  const symbolData = exchangeInfo.symbols.find(data => data.symbol === symbol)
  const filter = symbolData.filters.find(filter => filter.filterType === 'LOT_SIZE')
  return {
    qtyFormat: filter.stepSize,
    minQty: filter.minQty
  }
}

async function getAllSymbols () {
  if (!exchangeInfo) {
    exchangeInfo = await api.exchangeInfo()
    if (!exchangeInfo) return console.log('Error getting exchange info.')
  }
  const allSymbols = exchangeInfo.symbols.map(data => data.symbol)

  return allSymbols
}

module.exports = {
  getQtyRules,
  getAllSymbols
}

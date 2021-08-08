const api = require('../api')
let exchangeInfo
async function getSymbolRules (symbol) {
  if (!exchangeInfo) {
    const result = await api.exchangeInfo()
    if (result) {
      const symbolData = result.symbols.filter(data => data.symbol === symbol)
      // "filterType": "LOT_SIZE"
      const filter = symbolData.filters.find(filter => filter.filterType === 'LOT_SIZE')

      return {
        symbolFormat: filter.stepSize,
        minQty: filter.minQty
      }
    }
  }
}

async function getAllSymbols () {
  if (!exchangeInfo) {
    const result = await api.exchangeInfo()
    if (result) {
      const allSymbols = result.symbols.map(data => data.symbol)

      return allSymbols
    }
  }
}

module.exports = {
  getSymbolRules,
  getAllSymbols
}

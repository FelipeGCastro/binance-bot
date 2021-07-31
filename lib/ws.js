const WebSocket = require('ws')
const wsBaseUrl = process.env.WS_BASE_URL

const streams = {
  depth: symbol => `${symbol.toLowerCase()}@depth`,
  depthLevel: (symbol, level) =>
      `${symbol.toLowerCase()}@depth${level}`,
  kline: (symbol, interval) =>
      `${symbol.toLowerCase()}@kline_${interval}`,
  klineContinuos: (symbol, interval) =>
      `${symbol.toLowerCase()}_perpetual@kline_${interval}`,
  aggTrade: symbol => `${symbol.toLowerCase()}@aggTrade`,
  bookTicker: symbol => `${symbol.toLowerCase()}@bookTicker`,
  ticker: symbol => `${symbol.toLowerCase()}@ticker`,
  allTickers: () => '!ticker@arr'
}

function setupWebSocket (eventHandler, path) {
  path = `${wsBaseUrl}${path}`
  const ws = new WebSocket(path)

  ws.on('message', message => {
    let event
    try {
      event = JSON.parse(message)
    } catch (e) {
      event = message
    }
    eventHandler(event)
  })
}

function onDepthLevelUpdate (symbol, level, eventHandler) {
  return setupWebSocket(
    eventHandler,
    streams.depthLevel(symbol, level)
  )
}

function onKline (symbol, interval, eventHandler) {
  return setupWebSocket(
    eventHandler,
    streams.kline(symbol, interval)
  )
}
function onKlineContinuos (symbol, interval, eventHandler) {
  return setupWebSocket(
    eventHandler,
    streams.klineContinuos(symbol, interval)
  )
}

function onBookTicker (symbol, eventHandler) {
  return setupWebSocket(
    eventHandler,
    streams.bookTicker(symbol)
  )
}

module.exports = {
  setupWebSocket,
  onDepthLevelUpdate,
  onKline,
  onKlineContinuos,
  onBookTicker
}

// @bookTicker

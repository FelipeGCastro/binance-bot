const WebSocket = require('ws')
// const wsUrl = process.env.WS_TEST_URL
const wsUrl = process.env.WS_BASE_URL

const streams = {
  depth: symbol => `${symbol.toLowerCase()}@depth`,
  depthLevel: (symbol, level) =>
      `${symbol.toLowerCase()}@depth${level}`,
  kline: (symbol, interval) =>
      `${symbol.toLowerCase()}@kline_${interval}`,
  klineContinuos: (symbol, interval) =>
      `${symbol.toLowerCase()}_perpetual@continuousKline_${interval}`,
  aggTrade: symbol => `${symbol.toLowerCase()}@aggTrade`,
  bookTicker: symbol => `${symbol.toLowerCase()}@bookTicker`,
  ticker: symbol => `${symbol.toLowerCase()}@ticker`,
  allTickers: () => '!ticker@arr'
}

function setupWebSocket (eventHandler, path) {
  path = `${wsUrl}${path}`
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

function listenKey (key, eventHandler) {
  return setupWebSocket(eventHandler, key)
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
  onBookTicker,
  listenKey
}

// @bookTicker

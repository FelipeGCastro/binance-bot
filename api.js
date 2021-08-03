const axios = require('axios')
const querystring = require('querystring')
const crypto = require('crypto')
const symbolDefault = process.env.SYMBOL
const apikey = process.env.API_KEY
const apiSecret = process.env.SECRET_KEY
// const apiUrl = process.env.API_URL
const apiTestUrl = process.env.API_TEST_URL

async function privateCall (path, data = {}, method = 'GET') {
  const timestamp = Date.now()
  const signature = crypto.createHmac('sha256', apiSecret)
    .update(`${querystring.stringify({ ...data, timestamp })}`).digest('hex')
  const newData = { ...data, timestamp, signature }
  const qs = `?${querystring.stringify(newData)}`

  try {
    const result = await axios({
      method,
      url: `${apiTestUrl}${path}${qs}`,
      headers: { 'X-MBX-APIKEY': apikey }
    })
    return result.data
  } catch (error) {
    console.log(error)
  }
}
// MARKET
// STOP_MARKET
// TAKE_PROFIT_MARKET
async function newOrder (symbol = symbolDefault, quantity, side = 'BUY', type = 'MARKET', closePosition = false, stopPrice = false) {
  const data = {
    symbol,
    side,
    type,
    closePosition
  }
  if (quantity) data.quantity = quantity
  if (stopPrice) data.stopPrice = stopPrice

  return privateCall('/fapi/v1/order', data, 'POST')
}

async function cancelAllOrders (symbol = symbolDefault) {
  const timestamp = Date.now()
  return privateCall('/fapi/v1/allOpenOrders', { symbol, timestamp }, 'DELETE')
}
async function cancelOrder (symbol = symbolDefault, orderId, origClientOrderId) {
  const timestamp = Date.now()
  const data = { symbol, timestamp }
  if (orderId) data.orderId = orderId
  if (origClientOrderId) data.origClientOrderId = origClientOrderId
  if (data.orderId || data.origClientOrderId) {
    return privateCall('/fapi/v1/order', { symbol, timestamp }, 'DELETE')
  } else {
    console.log('orderId or origClientOrderId is Require!')
  }
}

async function publicCall (path, data, method = 'GET') {
  try {
    const qs = data ? `?${querystring.stringify(data)}` : ''
    const result = await axios({
      method,
      url: `${apiTestUrl}${path}${qs}`
    })
    return result.data
  } catch (error) {
    console.log(error)
  }
}

async function time () {
  return publicCall('/fapi/v1/time')
}

async function candles (pair = symbolDefault.toLowerCase(), limit = 200) {
  return publicCall('/fapi/v1/continuousKlines',
    { pair, contractType: 'PERPETUAL', interval: '1m', limit })
}

async function depth (symbol = symbolDefault, limit = 5) {
  return publicCall('/fapi/v1/depth', { symbol, limit })
}

async function accountInfo () {
  return privateCall('/fapi/v1/account')
}

async function listenKey () {
  return privateCall('/fapi/v1/listenKey', false, 'POST')
}

async function changeLeverage (leverage, symbol = symbolDefault) {
  const timestamp = Date.now()
  return privateCall('/fapi/v1/leverage', { symbol, leverage, timestamp }, 'POST')
}

async function getBalance () {
  return privateCall('/fapi/v2/balance')
}

async function exchangeInfo () {
  return privateCall('/fapi/v1/exchangeInfo')
}

async function getAllOpenOrders (symbol = symbolDefault) {
  const timestamp = Date.now()
  const data = { symbol, timestamp }
  return privateCall('/fapi/v1/openOrders', data)
}

module.exports = {
  time,
  depth,
  exchangeInfo,
  accountInfo,
  candles,
  listenKey,
  getBalance,
  changeLeverage,
  newOrder,
  cancelAllOrders,
  cancelOrder,
  getAllOpenOrders
}

const axios = require('axios')
const querystring = require('querystring')
const crypto = require('crypto')
// const { sendMessage } = require('./telegram')

const apikey = process.env.API_KEY
const apiSecret = process.env.SECRET_KEY
const apiUrl = process.env.API_URL

async function privateCall (path, data = {}, method = 'GET') {
  const timestamp = Date.now()
  const signature = crypto.createHmac('sha256', apiSecret)
    .update(`${querystring.stringify({ ...data, timestamp })}`).digest('hex')

  const newData = { ...data, timestamp, signature }

  const qs = `?${querystring.stringify(newData)}`

  try {
    const result = await axios({
      method,
      url: `${apiUrl}${path}${qs}`,
      headers: { 'X-MBX-APIKEY': apikey }
    })

    return result.data
  } catch (error) {
    if (error.response?.data?.code) {
      // sendMessage(`code: ${error.response?.data?.code}, mensagem: ${error.response?.data?.msg}`, true)
      console.error(`code: ${error.response?.data?.code}, mensagem: ${error.response?.data?.msg}`)
    } else {
      console.log(error)
    }

    return false
  }
}

async function newOrder (symbol, quantity, side = 'BUY', type = 'MARKET', closePosition = false, stopPrice = null) {
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

async function cancelAllOrders (symbol) {
  return privateCall('/fapi/v1/allOpenOrders', { symbol }, 'DELETE')
}

async function cancelOrder (symbol, orderId, origClientOrderId) {
  const data = { symbol }
  if (orderId) data.orderId = orderId
  if (origClientOrderId) data.origClientOrderId = origClientOrderId
  if (data.orderId || data.origClientOrderId) {
    return privateCall('/fapi/v1/order', data, 'DELETE')
  } else {
    console.error('orderId or origClientOrderId is Require!')
    return false
  }
}

async function publicCall (path, data, method = 'GET') {
  try {
    const qs = data ? `?${querystring.stringify(data)}` : ''
    const result = await axios({
      method,
      url: `${apiUrl}${path}${qs}`
    })
    return result.data
  } catch (error) {
    console.error(error)
  }
}

async function time () {
  return publicCall('/fapi/v1/time')
}

async function candles (pair, interval = '1m', limit = 300) {
  return publicCall('/fapi/v1/continuousKlines',
    { pair, contractType: 'PERPETUAL', interval, limit })
}

async function depth (symbol, limit = 5) {
  return publicCall('/fapi/v1/depth', { symbol, limit })
}

async function listenKey () {
  return privateCall('/fapi/v1/listenKey', false, 'POST')
}

async function changeLeverage (leverage, symbol) {
  return privateCall('/fapi/v1/leverage', { symbol, leverage }, 'POST')
}

async function getBalance () {
  return privateCall('/fapi/v2/balance')
}

async function getAccountInfo () {
  return privateCall('/fapi/v2/account')
}

async function exchangeInfo () {
  return publicCall('/fapi/v1/exchangeInfo')
}

async function getAllOpenOrders (symbol) {
  const data = { symbol }
  return privateCall('/fapi/v1/openOrders', data)
}

module.exports = {
  time,
  depth,
  exchangeInfo,
  candles,
  listenKey,
  getBalance,
  changeLeverage,
  newOrder,
  cancelAllOrders,
  cancelOrder,
  getAllOpenOrders,
  getAccountInfo
}

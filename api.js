const axios = require('axios')
const querystring = require('querystring')
const crypto = require('crypto')
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
    console.log(error)
  }
}

// async function newOrder (symbol, quantity, price, side = 'BUY', type = 'MARKET') {

// }

async function accountInfo () {
  return privateCall('/fapi/v1/account')
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
    console.log(error)
  }
}

async function time () {
  return publicCall('/fapi/v1/time')
}

async function candles (pair = 'btcusdt', limit = 200) {
  return publicCall('/fapi/v1/continuousKlines',
    { pair, contractType: 'PERPETUAL', interval: '1m', limit })
}

async function depth (symbol = 'BTCUSDT', limit = 5) {
  return publicCall('/fapi/v1/depth', { symbol, limit })
}

async function exchangeInfo () {
  return publicCall('/fapi/v1/exchangeInfo')
}

module.exports = { time, depth, exchangeInfo, accountInfo, candles }

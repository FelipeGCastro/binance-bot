const axios = require('axios')
const querystring = require('querystring')
const crypto = require('crypto')
const symbolDefault = process.env.SYMBOL
// const apikey = process.env.API_TEST_KEY
// const apiSecret = process.env.SECRET_TEST_KEY
const apikey = process.env.API_KEY
const apiSecret = process.env.SECRET_KEY
const apiUrl = process.env.API_URL
// const apiTestUrl = process.env.API_TEST_URL

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
// MARKET
// STOP_MARKET
// TAKE_PROFIT_MARKET
// symbol, side, positionSide, type, quantity
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
  return privateCall('/fapi/v1/allOpenOrders', { symbol }, 'DELETE')
}
async function cancelOrder (symbol = symbolDefault, orderId, origClientOrderId) {
  const data = { symbol }
  if (orderId) data.orderId = orderId
  if (origClientOrderId) data.origClientOrderId = origClientOrderId
  if (data.orderId || data.origClientOrderId) {
    return privateCall('/fapi/v1/order', { symbol }, 'DELETE')
  } else {
    console.log('orderId or origClientOrderId is Require!')
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
    console.log(error)
  }
}

async function time () {
  return publicCall('/fapi/v1/time')
}

async function candles (pair = symbolDefault.toLowerCase(), interval = '1m', limit = 200) {
  return publicCall('/fapi/v1/continuousKlines',
    { pair, contractType: 'PERPETUAL', interval, limit })
}
async function candlesTemp (pair = symbolDefault.toLowerCase(), interval = '1m') {
  return publicCall('/fapi/v1/continuousKlines',
    {
      pair,
      contractType: 'PERPETUAL',
      interval,
      // sexta-feira, 6 de agosto de 2021 às 13:39:00 GMT+01:00 DST
      // sexta-feira, 6 de agosto de 2021 às 16:58:00 GMT+01:00 DST
      // startTime: 1628253540000, //NOT USING EMA
      // endTime: 1628265480000 // LONG TEST
      // ---------- TEST 2 NOT USING EMA
      // startTime: 1628253540000,
      // endTime: 1628264340000 // LONG TEST
      // ---------- TEST 3 NOT USING EMA
      // startTime: 1628253540000, // TRUE 'Hora: 16 e 51 minutos'
      // endTime: 1628265060000 // LONG TEST
      // ---------- TEST 4 NOT USING EMA
      // startTime: 1628261880000, // sexta-feira, 6 de agosto de 2021 às 15:58:00 GMT+01:00 DST
      // endTime: 1628273280000 // SHORT TEST sexta-feira, 6 de agosto de 2021 às 15:58:00 GMT+01:00
      // // ---------- TEST 5
      // startTime: 1628283720000, // sexta-feira, 6 de agosto de 2021 às 22:02:00 GMT+01:00
      // endTime: 1628295720000 // sábado, 7 de agosto de 2021 às 01:22:00 GMT+01:00
      // ---------- TEST 5
      // startTime: 1628283720000, // sexta-feira, 6 de agosto de 2021 às 22:02:00 GMT+01:00
      // endTime: 1628297340000 //  sábado, 7 de agosto de 2021 às 02:49:00 GMT+01:00
      // ---------- TEST 6
      // startTime: 1628293740000, // sábado, 7 de agosto de 2021 às 00:49:00 GMT+01:00 DST
      // endTime: 1628305740000 //  sábado, 7 de agosto de 2021 às 04:09:00 GMT+01:00
      // ---------- TEST 7 SHORT ABOVE EMA
      // startTime: 1628355780000, // sábado, 7 de agosto de 2021 às 18:03:00 GMT+01:00
      // endTime: 1628367780000 //  sábado, 7 de agosto de 2021 às 21:23:00 GMT+01:00
      // ---------- TEST 8
      // startTime: 1628355780000, // sábado, 7 de agosto de 2021 às 18:03:00 GMT+01:00
      // endTime: 1628370660000 //  sábado, 7 de agosto de 2021 às 22:11:00 GMT+01:00
      // ---------- TEST 9 LONG
      // startTime: 1628355780000, // sábado, 7 de agosto de 2021 às 18:03:00 GMT+01:00
      // endTime: 1628371080000 //  sábado, 7 de agosto de 2021 às 22:18:00 GMT+01:00
      // // ---------- TEST 10 LONG
      // startTime: 1628355780000, // sábado, 7 de agosto de 2021 às 18:03:00 GMT+01:00
      // endTime: 1628371500000 //  sábado, 7 de agosto de 2021 às 22:25:00 GMT+01:00
      // // ---------- TEST 11 ERROR DELETE AFTER TEST
      startTime: 1628373360000, //
      endTime: 1628389020000 // domingo, 8 de agosto de 2021 às 03:18:00 GMT+01:00

    })
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
  return privateCall('/fapi/v1/leverage', { symbol, leverage }, 'POST')
}

async function getBalance () {
  return privateCall('/fapi/v2/balance')
}

async function exchangeInfo () {
  return publicCall('/fapi/v1/exchangeInfo')
}

async function getAllOpenOrders (symbol = symbolDefault) {
  const data = { symbol }
  return privateCall('/fapi/v1/openOrders', data)
}

module.exports = {
  time,
  depth,
  exchangeInfo,
  accountInfo,
  candles,
  candlesTemp,
  listenKey,
  getBalance,
  changeLeverage,
  newOrder,
  cancelAllOrders,
  cancelOrder,
  getAllOpenOrders
}

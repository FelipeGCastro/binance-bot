const api = require('./api.js')
const ema = require('./indicators/ema.js')
const rsi = require('./indicators/rsi.js')
const stoch = require('./indicators/stoch.js')
const operations = require('./operations/tpsl')
const ws = require('./lib/ws.js')
const tools = require('./tools/index.js')
const symbol = process.env.SYMBOL

async function execute () {
  const candles = await api.candles(symbol, 200)
  getListenKey()
  const balance = await api.getBalance()
  if (balance) console.log(balance.filter((coin) => (coin.asset === 'USDT'))[0].availableBalance)
  // const leverage = await api.changeLeverage(18)
  // if (leverage) console.log(leverage)
  // const order = await api.newOrder(symbol, 1, 'BUY', 'MARKET', false)
  // if (order) console.log(order)

  ws.onKline(symbol, '1m', (data) => {
    if (data.k.x) {
      const newCandle = [data.k.t, data.k.o, data.k.h, data.k.l, data.k.c, data.k.v, data.k.T, data.k.q, data.k.n, data.k.V, data.k.Q]
      if (data.k.t === candles[candles.length - 1][0]) {
        candles.pop()
        candles.push(newCandle)
      } else {
        candles.shift()
        candles.push(newCandle)
      }
      console.log(ema.checkingTranding(candles), 'EMA')
      console.log(rsi.checkingRsi(candles), 'RSI')
      console.log(stoch.checkingStoch(candles)[2], 'STOCH')
    }
  })
  async function getListenKey () {
    const data = await api.listenKey()
    setWsListen(data.listenKey)
  }

  async function setWsListen (listenKey) {
    ws.listenKey(listenKey, async (data) => {
      if (data.e === 'listenKeyExpired') {
        getListenKey()
        console.log('listenKeyExpired')
      } else if (data.e === 'ACCOUNT_UPDATE') {
        console.log('ACCOUNT_UPDATE')
      } else if (data.e === 'ORDER_TRADE_UPDATE') {
        console.log('ORDER_TRADE_UPDATE')
        operations.handleOrderUpdate(data, tools.getLasts(candles, 3))
      }
    })
  }
}

execute()
// listenKeyExpired
// ACCOUNT_UPDATE
//     - DEPOSIT, WITHDRAW, ORDER, FUNDING_FEE, WITHDRAW_REJECT, ADJUSTMENT,
//     - INSURANCE_CLEAR, ADMIN_DEPOSIT, ADMIN_WITHDRAW, MARGIN_TRANSFER,
//     - MARGIN_TYPE_CHANGE, ASSET_TRANSFER, OPTIONS_PREMIUM_FEE, OPTIONS_SETTLE_PROFIT,
//     - AUTO_EXCHANGE
// ORDER_TRADE_UPDATE
//     data.o.X
//     - NEW
//     - PARTIALLY_FILLED
//     - FILLED
//     - CANCELED
//     - EXPIRED
//     - NEW_INSURANCE - Liquidation with Insurance Fund
//     - NEW_ADL - Counterparty Liquidation`

// The signal of entry is when detected a hidden bearish for SHORT or a
//   Hidden Bullish  for LONG.

//   STEPS:
//   1 - Only SHORT if EMA 50 is Below EMA 200, OR Only LONG if EMA 50 is Over EMA 200
//   2 - Detected Divergence in RSI, Hidden Bearish(SHORT) or Hidden Bullish (LONG)
//       -Max 25 candles before for divergence.
//   3 - Wait For K cross D on the Stoch Indicator when Candle Close.
//       -Close Price has to be Below EMA 50 for SHORT or Over EMA50 for LONG

//     I think that if work with trailing stop the gains will incriase

// [
//   data.k.t,
//   data.k.o,
//   data.k.h,
//   data.k.l,
//   data.k.c,
//   data.k.v,
//   data.k.T,
//   data.k.q,
//   data.k.n,
//   data.k.V,
//   data.k.Q
// ]

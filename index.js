const api = require('./api.js')
const ema = require('./indicators/ema.js')
const rsi = require('./indicators/rsi.js')
const stoch = require('./indicators/stoch.js')
// import tools from './tools/index.js'
const ws = require('./lib/ws.js')
const symbol = process.env.SYMBOL

async function execute () {
  const candles = await api.candles(symbol, 200)

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
      console.log(stoch.checkingStoch(candles), 'STOCH')
    }
  })
}

execute()

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


const ACCOUNTS_TYPE = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary'
}
const STRATEGIES = {
  SHARK: 'sharkStrategy',
  HIDDEN_DIVERGENCE: 'hiddenDivergence'
}

const ORDER_TYPE = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET',
  STOP: 'STOP',
  STOP_MARKET: 'STOP_MARKET',
  TAKE_PROFIT: 'TAKE_PROFIT',
  TAKE_PROFIT_MARKET: 'TAKE_PROFIT_MARKET',
  TRAILING_STOP_MARKET: 'TRAILING_STOP_MARKET'
}

const INDICATORS_OBJ = {
  RSI: 'rsi',
  EMA: 'ema',
  STOCH: 'stoch',
  TIME: 'time'
}

const SIDE = {
  BUY: 'BUY',
  SELL: 'SELL'
}
const POSITION_SIDE = {
  SHORT: 'SHORT',
  LONG: 'LONG',
  BOTH: 'BOTH'
}

const CANDLE = {
  OPEN_TIME: 0,
  OPEN: 1,
  HIGH: 2,
  LOW: 3,
  CLOSE: 4,
  VOLUME: 5,
  CLOSE_TIME: 6
}

module.exports = {
  STRATEGIES,
  CANDLE,
  ORDER_TYPE,
  SIDE,
  POSITION_SIDE,
  INDICATORS_OBJ,
  ACCOUNTS_TYPE
}

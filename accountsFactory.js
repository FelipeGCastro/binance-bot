const { STRATEGIES, ACCOUNTS_TYPE } = require('./tools/constants')
const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const { updateAccountData } = require('./services/socket.js')

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}

const ACCOUNTS = {
  [ACCOUNTS_TYPE.PRIMARY]: {
    strategy: STRATEGIES.SHARK,
    symbols: ['ADAUSDT', 'MATICUSDT', 'XRPUSDT'],
    botOn: false,
    leverage: 2,
    entryValue: 100,
    validateEntry: SET_STRATEGY[STRATEGIES.SHARK].validateEntry,
    getStopAndTargetPrice: SET_STRATEGY[STRATEGIES.SHARK].getStopAndTargetPrice,
    maxEntryValue: 100,
    listenKeyIsOn: false,
    interval: '5m',
    limitOrdersSameTime: 2,
    limitReached: false,
    tradesOn: [], // { stopMarketPrice, takeProfitPrice, entryPrice, symbol, stopOrderCreated, profitOrderCreated }
    listeners: [],
    allCandles: []
  },
  [ACCOUNTS_TYPE.SECONDARY]: {
    strategy: STRATEGIES.HIDDEN_DIVERGENCE,
    symbols: ['SANDUSDT'],
    botOn: false,
    leverage: 2,
    entryValue: 100,
    validateEntry: SET_STRATEGY[STRATEGIES.HIDDEN_DIVERGENCE].validateEntry,
    getStopAndTargetPrice: SET_STRATEGY[STRATEGIES.HIDDEN_DIVERGENCE].getStopAndTargetPrice,
    maxEntryValue: 100,
    listenKeyIsOn: false,
    interval: '1m',
    limitOrdersSameTime: 2,
    limitReached: false,
    tradesOn: [], // { stopMarketPrice, takeProfitPrice, entryPrice, symbol, stopOrderCreated, profitOrderCreated }
    listeners: [],
    allCandles: []
  }
}

function getAccountData (account) {
  return { ...ACCOUNTS[account], listeners: [], allCandles: [] }
}

function getTradesDelayed (account) {
  return new Promise(resolve => {
    setTimeout(() => resolve(ACCOUNTS[account].tradesOn), 2000)
  })
}

function setTradesOn (account, trade) {
  ACCOUNTS[account].tradesOn.push(trade)

  updateOnlyNecessary(account)
}
function updateOnlyNecessary (account) {
  updateAccountData(account, { ...ACCOUNTS[account], listeners: [], allCandles: [], validateEntry: null, getStopAndTargetPrice: null })
}
function updateTradesOn (account, symbol, key, value) {
  const oldObject = ACCOUNTS[account].tradesOn.find(trade => trade.symbol === symbol)
  if (!oldObject) return
  removeFromTradesOn(account, symbol)
  const newObject = { ...oldObject, [key]: value }
  setTradesOn(account, newObject)
}
function removeFromTradesOn (account, symb) {
  ACCOUNTS[account].tradesOn = ACCOUNTS[account].tradesOn.filter(trade => trade.symbol !== symb)
  ACCOUNTS[account].limitReached = ACCOUNTS[account].tradesOn.length >= ACCOUNTS[account].limitOrdersSameTime
  updateOnlyNecessary(account)
}
// SETTTERS

function setGetStopAndTargetPrice (account, value) { ACCOUNTS[account].getStopAndTargetPrice = value }
function setBotOn (account, bool) { ACCOUNTS[account].botOn = bool }
function setLeverage (account, value) { ACCOUNTS[account].leverage = value }
function setLimitOrdersSameTime (account, limite) { ACCOUNTS[account].limitOrdersSameTime = limite }
function setLimitReached (account, value) { ACCOUNTS[account].limitReached = value }
function setValidate (account, func) { ACCOUNTS[account].validateEntry = func }
function setPeriodInterval (account, int) { ACCOUNTS[account].interval = int }
function setStrategy (account, value) { ACCOUNTS[account].strategy = value }
function updateAllCandles (account, arrayWithValues) { ACCOUNTS[account].allCandles = arrayWithValues }

function setEntryValue (account, value) {
  ACCOUNTS[account].entryValue = value
  ACCOUNTS[account].maxEntryValue = ACCOUNTS[account].entryValue + (0.2 * ACCOUNTS[account].entryValue)
}

function updateListenKeyIsOn (account, value) {
  ACCOUNTS[account].listenKeyIsOn = value
  updateOnlyNecessary(account)
}

module.exports = {
  getAccountData,
  getTradesDelayed,
  updateTradesOn,
  setGetStopAndTargetPrice,
  setBotOn,
  setLeverage,
  setLimitOrdersSameTime,
  setLimitReached,
  setValidate,
  setPeriodInterval,
  setStrategy,
  updateAllCandles,
  setEntryValue,
  updateListenKeyIsOn
}

const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const { STRATEGIES, TRADES_ON, CANDLE } = require('./tools/constants')
// const { verifyRiseStop } = require('./operations/changeStopLoss.js')
const MATIC = require('./temp/MATIC.js')
const { getFirsts, getLasts } = require('./tools/index.js')

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}
console.log(SET_STRATEGY)
let botOn = false
let tradesOn = true

function setBotOn (bool) { botOn = bool }

function setTradesOn (value) { tradesOn = value }
const winTrades = []
const losesTrades = []

const allCandles = getFirsts(MATIC, 300)
const lastsCandels = getLasts(MATIC, 900)
function getAccountData () { return { winTrades, losesTrades } }

// START MAIN FUNCTION
async function execute () {
  lastsCandels.forEach(async (data) => {
    if (!tradesOn) await handleCloseCandle(data)
    else await verifyTrade(data)
    // analysingCandle(data, symbol)
  })

  // async function analysingCandle (data, symbol) {
  //   const hasTradeOn = ACCOUNTS[account].tradesOn.find(trade => trade.symbol === symbol)
  //   if (hasTradeOn && !hasTradeOn[TRADES_ON.RISE_STOP_CREATED]) {
  //     await verifyRiseStop(account, data, hasTradeOn, updateTradesOn)
  //   }
  // }

  async function handleCloseCandle (data) {
    const newCandles = handleAddCandle(data)
    const valid = await sharkStrategy.validateEntry(newCandles) // corrigir os candles que virão
    if (valid) {
      setTradesOn({
        [TRADES_ON.STOP_PRICE]: valid.stopPrice,
        [TRADES_ON.PROFIT_PRICE]: valid.targetPrice,
        [TRADES_ON.ENTRY_PRICE]: valid.closePrice,
        [TRADES_ON.SIDE]: valid.side === 'SHORT' ? 'SELL' : 'BUY',
        [TRADES_ON.STRATEGY]: valid.strategy
      })
    }
    console.log('Entry is Valid')
  }

  function verifyTrade (data) {
    if (tradesOn[TRADES_ON.SIDE] === 'SELL') {
      if (data[CANDLE.HIGH] > tradesOn[TRADES_ON.STOP_PRICE]) {
        losesTrades.push(tradesOn)
        setTradesOn(false)
      } else if (data[CANDLE.LOW] < tradesOn[TRADES_ON.PROFIT_PRICE]) {
        winTrades.push(tradesOn)
        setTradesOn(false)
      }
    } else if (tradesOn[TRADES_ON.SIDE] === 'BUY') {
      if (data[CANDLE.HIGH] > tradesOn[TRADES_ON.PROFIT_PRICE]) {
        winTrades.push(tradesOn)
        setTradesOn(false)
      } else if (data[CANDLE.LOW] < tradesOn[TRADES_ON.STOP_PRICE]) {
        losesTrades.push(tradesOn)
        setTradesOn(false)
      }
    } else {
      console.log('ERRO TO VERIFY CANDLE')
    }
  }

  function handleAddCandle (data) {
    allCandles.shift()

    allCandles.push(data)
    return allCandles
  }

  // function handleGetStopAndTarget (account, entryPrice, stopPrice, side) {
  //   if (ACCOUNTS[account].strategy === STRATEGIES.HIDDEN_DIVERGENCE) {
  //     return ACCOUNTS[account].getStopAndTargetPrice(stopPrice, entryPrice)
  //   } else if (ACCOUNTS[account].strategy === STRATEGIES.SHARK) {
  //     return ACCOUNTS[account].getStopAndTargetPrice(entryPrice, side)
  //   } else return false
  // }
}

function turnBotOn (account, bool) {
  if (bool) {
    if (!botOn) {
      setBotOn(bool)
      execute()
    }
  } else {
    setBotOn(bool)
  }
}

module.exports = {
  execute,
  turnBotOn,
  getAccountData
}

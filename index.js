const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const { STRATEGIES, TRADES_ON, CANDLE } = require('./tools/constants')
// const { verifyRiseStop } = require('./operations/changeStopLoss.js')
const MATIC = require('./temp/MATIC.js')
const { getFirsts, getLasts, getPercentage } = require('./tools/index.js')
// const SAND1M = require('./temp/SAND1M')
const { sendMessage } = require('./services/telegram')
// const MATIC1M = require('./temp/MATIC1M.js')
// const ADA1M = require('./temp/ADA1M.js')

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}
console.log(SET_STRATEGY)
let botOn = false
let tradesOn = false

function setBotOn (bool) { botOn = bool }

function setTradesOn (value) { tradesOn = value }
const winTrades = []
const losesTrades = []
const breakevenTrades = []

const allCandles = getFirsts(MATIC, 300)
const lastsCandles = getLasts(MATIC, 1200)

function sumPercentage (data, typePercentage) {
  let finalPercentage = 0
  data.forEach(trade => {
    finalPercentage += Number(trade[typePercentage])
  })
  return finalPercentage
}
function getAccountData () {
  return {
    winTradesCount: winTrades.length,
    losesTradesCount: losesTrades.length,
    breakevenCount: breakevenTrades.length,
    winPerc: sumPercentage(winTrades, 'winPercentage'),
    lossPerc: sumPercentage(losesTrades, 'lossPercentage'),
    winTrades,
    losesTrades,
    breakevenTrades
  }
}

// START MAIN FUNCTION
async function execute () {
  const totalValue = lastsCandles.length
  let index = 0
  const mainInterval = setInterval(() => {
    if (index < totalValue) {
      if (!tradesOn) handleCloseCandle(lastsCandles[index])
      else verifyTrade(lastsCandles[index])
      index++
    } else {
      console.log('FINISH')
      sendMessage(`Finish
      wins: ${winTrades.length},
      loses: ${losesTrades.length},
      win %: ${sumPercentage(winTrades, 'winPercentage')},
      loss %: ${sumPercentage(losesTrades, 'lossPercentage')}
      `) // winPercentage  lossPercentage
      clearInterval(mainInterval)
    }
  }, 200)

  // lastsCandles.forEach((candle, i) => {
  //   if (!tradesOn) handleCloseCandle(candle)
  //   else verifyTrade(candle)
  //   if (i === lastsCandles.length - 1) {
  //     console.log('FINISH')
  //     sendMessage(`Finish
  //     wins: ${winTrades.length},
  //     loses: ${losesTrades.length},
  //     win %: ${sumPercentage(winTrades, 'winPercentage')},
  //     loss %: ${sumPercentage(losesTrades, 'lossPercentage')}
  //     `) // winPercentage  lossPercentage
  //   }
  // })
  // lastsCandles.forEach(async (data) => {
  //   if (!tradesOn) await handleCloseCandle(data)
  //   else await verifyTrade(data)
  //   // analysingCandle(data, symbol)
  // })

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
        timestamp: new Date(data[CANDLE.OPEN_TIME]),
        [TRADES_ON.STOP_PRICE]: valid.stopPrice,
        [TRADES_ON.PROFIT_PRICE]: valid.targetPrice,
        [TRADES_ON.ENTRY_PRICE]: valid.closePrice,
        [TRADES_ON.SIDE]: valid.side === 'SHORT' ? 'SELL' : 'BUY',
        [TRADES_ON.STRATEGY]: valid.strategy,
        breakevenTriggerPrice: valid.breakevenTriggerPrice,
        riseStopTriggerPrice: valid.riseStopTriggerPrice,
        winPercentage: getPercentage(valid.targetPrice, valid.closePrice),
        lossPercentage: getPercentage(valid.closePrice, valid.stopPrice)
      })

      console.log('Entry is Valid', data[CANDLE.CLOSE])
    }
  }

  function verifyTrade (data) {
    handleAddCandle(data)
    if (tradesOn[TRADES_ON.SIDE] === 'SELL') {
      if (data[CANDLE.HIGH] > tradesOn[TRADES_ON.STOP_PRICE]) {
        if (tradesOn.isBreakeven) breakevenTrades.push(tradesOn)
        else losesTrades.push(tradesOn)

        setTradesOn(false)
      } else if (data[CANDLE.LOW] < tradesOn[TRADES_ON.PROFIT_PRICE]) {
        winTrades.push(tradesOn)
        setTradesOn(false)
      } else if (data[CANDLE.LOW] < tradesOn.breakevenTriggerPrice) {
        tradesOn.isBreakeven = true
      }
    } else if (tradesOn[TRADES_ON.SIDE] === 'BUY') {
      if (data[CANDLE.HIGH] > tradesOn[TRADES_ON.PROFIT_PRICE]) {
        winTrades.push(tradesOn)
        setTradesOn(false)
      } else if (data[CANDLE.LOW] < tradesOn[TRADES_ON.STOP_PRICE]) {
        if (tradesOn.isBreakeven) breakevenTrades.push(tradesOn)
        else losesTrades.push(tradesOn)
        setTradesOn(false)
      } else if (data[CANDLE.HIGH] > tradesOn.breakevenTriggerPrice) {
        tradesOn.isBreakeven = true
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
}
execute()
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

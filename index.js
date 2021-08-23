const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const { STRATEGIES, TRADES_ON, CANDLE } = require('./tools/constants')
// const { verifyRiseStop } = require('./operations/changeStopLoss.js')
const { sendMessage } = require('./services/telegram')
const { getFirsts, getLasts, getPercentage } = require('./tools/index.js')
const ETH5M = require('./temp/ETH5M')
const ADA5M = require('./temp/ADA5M')
const BTC5M = require('./temp/BTC5M')
// const SAND1M = require('./temp/SAND1M')
const MATIC5M = require('./temp/MATIC5M.js')
const DOGE5M = require('./temp/DOGE5M')
// const MATIC1M = require('./temp/MATIC1M.js')
// const ADA1M = require('./temp/ADA1M.js')

const symbolsData = {
  ETH5M: {
    name: 'ETH5M',
    data: ETH5M,
    winTrades: [],
    losesTrades: [],
    breakevenTrades: [],
    tradesOn: false
  },
  ADA5M: {
    name: 'ADA5M',
    data: ADA5M,
    winTrades: [],
    losesTrades: [],
    breakevenTrades: [],
    tradesOn: false
  },
  BTC5M: {
    name: 'BTC5M',
    data: BTC5M,
    winTrades: [],
    losesTrades: [],
    breakevenTrades: [],
    tradesOn: false
  },
  MATIC5M: {
    name: 'MATIC5M',
    data: MATIC5M,
    winTrades: [],
    losesTrades: [],
    breakevenTrades: [],
    tradesOn: false
  },
  DOGE5M: {
    name: 'DOGE5M',
    data: DOGE5M,
    winTrades: [],
    losesTrades: [],
    breakevenTrades: [],
    tradesOn: false
  }
}

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
}
console.log(SET_STRATEGY)
let botOn = false

const BREAKEVEN_ON = false

function setBotOn (bool) { botOn = bool }

function setTradesOn (symbol, value) { symbolsData[symbol].tradesOn = value }

// const allCandles = getFirsts(ETH5M, 300)
// const lastsCandles = getLasts(ETH5M, 1200)

function sumPercentage (data, typePercentage) {
  let finalPercentage = 0
  data.forEach(trade => {
    finalPercentage += Number(trade[typePercentage])
  })
  return finalPercentage.toFixed(2)
}
function getAccountData () {
  const results = Object.keys(symbolsData).map(key => ({
    wins: symbolsData[key].winTrades.length,
    loss: symbolsData[key].losesTrades.length,
    breakeven: symbolsData[key].breakevenTrades.length,
    winPerc: sumPercentage(symbolsData[key].winTrades, 'winPercentage'),
    lossPerc: sumPercentage(symbolsData[key].losesTrades, 'lossPercentage'),
    ...symbolsData[key],
    data: []
  }))
  return results
}

// START MAIN FUNCTION
async function execute () {
  const dataArray = Object.keys(symbolsData)
  for (const key of dataArray) {
    const allCandles = getFirsts(symbolsData[key].data, 300)
    const lastsCandles = getLasts(symbolsData[key].data, 1200)
    const totalValue = lastsCandles.length
    let index = 0
    const mainInterval = setInterval(() => {
      if (index < totalValue) {
        if (!symbolsData[key].tradesOn) handleCloseCandle(lastsCandles[index])
        else verifyTrade(lastsCandles[index])
        index++
      } else {
        setTradesOn(key, false)
        console.log('FINISH')
        sendMessage(`Finish
          symbol: ${key},
          wins: ${symbolsData[key].winTrades.length},
          loses: ${symbolsData[key].losesTrades.length},
          breakeven: ${symbolsData[key].breakevenTrades.length},
          win %: ${sumPercentage(symbolsData[key].winTrades, 'winPercentage')},
          loss %: ${sumPercentage(symbolsData[key].losesTrades, 'lossPercentage')}
          `) // winPercentage  lossPercentage
        clearInterval(mainInterval)
      }
    }, 200)

    async function handleCloseCandle (data) {
      const newCandles = handleAddCandle(data)
      const valid = await sharkStrategy.validateEntry(newCandles)
      if (valid) {
        setTradesOn(key, {
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
      if (symbolsData[key].tradesOn[TRADES_ON.SIDE] === 'SELL') {
        if (data[CANDLE.HIGH] > symbolsData[key].tradesOn[TRADES_ON.STOP_PRICE]) {
          if (symbolsData[key].tradesOn.isBreakeven) symbolsData[key].breakevenTrades.push(symbolsData[key].tradesOn)
          else symbolsData[key].losesTrades.push(symbolsData[key].tradesOn)

          setTradesOn(key, false)
        } else if (data[CANDLE.LOW] < symbolsData[key].tradesOn[TRADES_ON.PROFIT_PRICE]) {
          symbolsData[key].winTrades.push(symbolsData[key].tradesOn)
          setTradesOn(key, false)
        } else if (data[CANDLE.LOW] < symbolsData[key].tradesOn.breakevenTriggerPrice) {
          if (BREAKEVEN_ON) {
            symbolsData[key].tradesOn[TRADES_ON.STOP_PRICE] = symbolsData[key].tradesOn[TRADES_ON.ENTRY_PRICE]
            symbolsData[key].tradesOn.isBreakeven = true
          }
        }
      } else if (symbolsData[key].tradesOn[TRADES_ON.SIDE] === 'BUY') {
        if (data[CANDLE.HIGH] > symbolsData[key].tradesOn[TRADES_ON.PROFIT_PRICE]) {
          symbolsData[key].winTrades.push(symbolsData[key].tradesOn)
          setTradesOn(key, false)
        } else if (data[CANDLE.LOW] < symbolsData[key].tradesOn[TRADES_ON.STOP_PRICE]) {
          if (symbolsData[key].tradesOn.isBreakeven) symbolsData[key].breakevenTrades.push(symbolsData[key].tradesOn)
          else symbolsData[key].losesTrades.push(symbolsData[key].tradesOn)
          setTradesOn(key, false)
        } else if (data[CANDLE.HIGH] > symbolsData[key].tradesOn.breakevenTriggerPrice) {
          if (BREAKEVEN_ON) {
            symbolsData[key].tradesOn[TRADES_ON.STOP_PRICE] = symbolsData[key].tradesOn[TRADES_ON.ENTRY_PRICE]
            symbolsData[key].tradesOn.isBreakeven = true
          }
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

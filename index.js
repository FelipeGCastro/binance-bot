
const hiddenDivergence = require('./strategies/hiddenDivergence')
const sharkStrategy = require('./strategies/shark')
const sharkDivergence = require('./strategies/sharkWithDivergence')
const sharkWithBB = require('./strategies/sharkWithBB')
const sharkDivergenceBB = require('./strategies/sharkDivergenceBB')
const divergenceWithBB = require('./strategies/divergenceWithBB')

const { STRATEGIES, TRADES_ON, CANDLE } = require('./tools/constants')
// const { verifyRiseStop } = require('./operations/changeStopLoss.js')
const { sendMessage } = require('./services/telegram')
const { getFirsts, getLasts, getPercentage } = require('./tools/index.js')

const ETH5M = require('./temp/5M/part8/ETH5M')
const ADA5M = require('./temp/5M/part8/ADA5M')
const MATIC5M = require('./temp/5M/part8/MATIC5M.js')
const DOGE5M = require('./temp/5M/part8/DOGE5M')
const DENT5M = require('./temp/5M/part8/DENT5M')

// const SAND1M = require('./temp/1M/part3/SAND1M')
// const MATIC1M = require('./temp/1M/part3/MATIC1M')
// const ADA1M = require('./temp/1M/part3/ADA1M')
// const XRP1M = require('./temp/1M/part3/XRP1M')
// const ETH1M = require('./temp/1M/part3/ETH1M')

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
  },
  DENT5M: {
    name: 'DENT5M',
    data: DENT5M,
    winTrades: [],
    losesTrades: [],
    breakevenTrades: [],
    tradesOn: false
  }
}

// const symbolsData = {
//   SAND1M: {
//     name: 'SAND1M',
//     data: SAND1M,
//     winTrades: [],
//     losesTrades: [],
//     breakevenTrades: [],
//     tradesOn: false
//   },
//   MATIC1M: {
//     name: 'MATIC1M',
//     data: MATIC1M,
//     winTrades: [],
//     losesTrades: [],
//     breakevenTrades: [],
//     tradesOn: false
//   },
//   ADA1M: {
//     name: 'ADA1M',
//     data: ADA1M,
//     winTrades: [],
//     losesTrades: [],
//     breakevenTrades: [],
//     tradesOn: false
//   },
//   XRP1M: {
//     name: 'XRP1M',
//     data: XRP1M,
//     winTrades: [],
//     losesTrades: [],
//     breakevenTrades: [],
//     tradesOn: false
//   },
//   ETH1M: {
//     name: 'ETH1M',
//     data: ETH1M,
//     winTrades: [],
//     losesTrades: [],
//     breakevenTrades: [],
//     tradesOn: false
//   }
// }

const SET_STRATEGY = {
  [STRATEGIES.SHARK]: sharkStrategy,
  [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence,
  [STRATEGIES.SHARK_DIVERGENCE]: sharkDivergence,
  [STRATEGIES.SHARK_BB]: sharkWithBB,
  [STRATEGIES.SHARK_DIVERGENCE_BB]: sharkDivergenceBB,
  [STRATEGIES.DIVERGENCE_BB]: divergenceWithBB
}

let botOn = false

const strategy = STRATEGIES.DIVERGENCE_BB

const BREAKEVEN_ON = true

function setBotOn (bool) { botOn = bool }

function setTradesOn (symbol, value) { symbolsData[symbol].tradesOn = value }

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
    if (symbolsData[key].data.length !== 1500) {
      console.log(key, 'não tem 1500 candles')
      return false
    }
    console.log('quantidade de candles:', symbolsData[key].data.length)

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
        sendMessage(`symbol: ${key},
          wins: ${symbolsData[key].winTrades.length}, loses: ${symbolsData[key].losesTrades.length},
          breakeven: ${symbolsData[key].breakevenTrades.length},
          win %: ${sumPercentage(symbolsData[key].winTrades, 'winPercentage')}, loss %: ${sumPercentage(symbolsData[key].losesTrades, 'lossPercentage')}
          `) // winPercentage  lossPercentage
        clearInterval(mainInterval)
      }
    }, 100)

    async function handleCloseCandle (data) {
      const newCandles = handleAddCandle(data)
      const valid = await SET_STRATEGY[strategy].validateEntry(newCandles)
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

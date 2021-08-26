const api = require('./services/api.js')
const operations = require('./operations/userDataUpdate')
const ws = require('./services/ws.js')
const telegram = require('./services/telegram')
const newOrder = require('./operations/newOrder')
const { STRATEGIES, SIDE, TRADES_ON, ACCOUNT_PROP } = require('./tools/constants')
const { handleVerifyAndCreateTpSl } = require('./operations/tpsl')
const { verifyRiseStop } = require('./operations/changeStopLoss.js')
const accountState = require('./states/account')
const getExecuteState = require('./states/execute.js')

// let allCandles = []

// START MAIN FUNCTION
async function execute (account) {
  const { getState, setState, addToStateArray, updateAllCandles } = await getExecuteState(account)
  const { getAccountData, getTradesOn, setAccountData, setTradesOn, updateListenKeyIsOn } = await accountState(account)
  const accountdata = getAccountData()
  telegram.sendMessage('Bot Foi Iniciado ou Reiniciado')
  const isLeverageChanged = await changeLeverage(account)
  if (!isLeverageChanged) return false

  accountdata.symbols.forEach((symbol) => {
    if (!symbol) return
    addAllCandles(symbol)
    setWsListeners(symbol)
  })

  async function addAllCandles (symbol) {
    const candles = await api.candles(symbol, getState('interval'))
    if (candles) addToStateArray('allCandles', { candles, symbol })
    else console.log('error on get Candles')
  }

  async function setWsListeners (symbol) {
    let lastEventAt = 0
    // LISTEN CANDLES AND UPDTATE CANDLES WHEN CANDLE CLOSE
    const listener = await ws.onKlineContinuos(symbol, getState('interval'), async (data) => {
      if (data.k.x && data.E > lastEventAt) {
        lastEventAt = data.E
        await handleCloseCandle(data, symbol)
      }
      analysingCandle(data, symbol)
    })
    addToStateArray('candlesListeners', { listener, symbol })
  }

  async function analysingCandle (data, symbol) {
    const tradesOn = getTradesOn()
    const hasTradeOn = tradesOn.find(trade => trade.symbol === symbol)
    if (hasTradeOn && hasTradeOn[TRADES_ON.BREAKEVEN_PRICE] && !hasTradeOn[TRADES_ON.RISE_STOP_CREATED]) {
      await verifyRiseStop(account, data, hasTradeOn)
    }
  }

  async function handleCloseCandle (data, symbol) {
    const accountData = getAccountData()
    const allCandles = getState('allCandles')
    const validateEntry = getState('validateEntry')
    const candlesObj = allCandles.find(cand => cand.symbol === symbol)
    const tradesOn = getTradesOn()

    if (!candlesObj) return
    const hasTradeOn = tradesOn.find(trade => trade.symbol === candlesObj.symbol)
    const newCandles = await handleAddCandle(data, candlesObj)
    if (!hasTradeOn &&
        !accountData.limitReached &&
        accountData.listenKeyIsOn &&
        accountData.botOn) {
      const valid = await validateEntry(newCandles, symbol)
      console.log('Fechou!', candlesObj.symbol, new Date().getMinutes())

      if (valid && valid.symbol === candlesObj.symbol) {
        const ordered = await newOrder.handleNewOrder({
          ...valid,
          entryValue: accountData.entryValue,
          maxEntryValue: accountData.maxEntryValue,
          symbol,
          account
        })
        if (ordered) {
          setAccountData(ACCOUNT_PROP.LIMIT_REACHED, (tradesOn.length + 1) >= accountData.limitOrdersSameTime)
          setTradesOn({
            [TRADES_ON.SYMBOL]: symbol,
            [TRADES_ON.STOP_PRICE]: valid.stopPrice,
            [TRADES_ON.PROFIT_PRICE]: valid.targetPrice,
            [TRADES_ON.ENTRY_PRICE]: ordered.avgPrice,
            [TRADES_ON.SIDE]: ordered.side,
            [TRADES_ON.STRATEGY]: valid.strategy
          })
          telegram.sendMessage(`Entrou: ${symbol}PERP, Side: ${valid.side}, Strategy: ${accountData.strategy}, account: ${account}`)
          verifyAfterFewSeconds()
        }
        console.log('Entry is Valid')
      }
    }
  }

  function handleAddCandle (data, candlesObj) {
    const allCandles = getState('allCandles')
    const candles = candlesObj.candles
    const newCandle = [data.k.t, data.k.o, data.k.h, data.k.l, data.k.c, data.k.v, data.k.T, data.k.q, data.k.n, data.k.V, data.k.Q]
    if (newCandle[0] === candles[candles.length - 1][0]) {
      candles.pop()
    } else {
      candles.shift()
    }
    candles.push(newCandle)
    const candlesFiltered = allCandles.filter(candlesObjItem => candlesObjItem.symbol !== candlesObj.symbol)
    candlesFiltered.push({ candles, symbol: candlesObj.symbol })
    updateAllCandles(candlesFiltered)
    return candles
  }

  getListenKey()

  async function getListenKey () {
    const data = await api.listenKey(account)
    if (data) {
      setWsListen(data.listenKey)
      updateListenKeyIsOn(true)
    } else {
      console.log('Error getting listenKey, try again e 10 seconds')
      const keyInterval = setInterval(async () => {
        const data = await api.listenKey(account)
        if (data) {
          setWsListen(data.listenKey)
          updateListenKeyIsOn(true)
          clearInterval(keyInterval)
        } else {
          telegram.sendMessage('Problemas ao buscar uma ListenKey, nova tentativa em 10 segundos')
          console.log('Problemas ao buscar uma ListenKey, nova tentativa em 10 segundos')
        }
      }, 10000)
    }
  }

  async function setWsListen (listenKey) {
    const accountData = getAccountData()
    const wsListenKey = ws.listenKey(listenKey, async (data) => {
      if (data.e === 'listenKeyExpired' && accountData.listenKeyIsOn) {
        updateListenKeyIsOn(false)
        wsListenKey.close()
        await getListenKey()
      } else {
        let newData
        if (data.o) {
          const dataOrder = {
            ...data.o,
            getStopAndTargetPrice: handleGetStopAndTarget,
            account
          }
          newData = { ...data, o: dataOrder }
        } else { newData = { ...data, account } }
        await operations.handleUserDataUpdate(newData)
      }
    })
    setState('userDataListeners', wsListenKey)
  }

  function handleGetStopAndTarget (account, entryPrice, stopPrice, side) {
    const accountData = getAccountData()
    const getStopAndTargetPrice = getState('getStopAndTargetPrice')
    if (accountData.strategy === STRATEGIES.HIDDEN_DIVERGENCE) {
      return getStopAndTargetPrice(stopPrice, entryPrice)
    } else if (accountData.strategy === STRATEGIES.SHARK) {
      return false
    } else return false
  }

  function verifyAfterFewSeconds () {
    const tradesOn = getTradesOn()
    setTimeout(() => {
      tradesOn.forEach(trade => {
        const tpslSide = trade.side && trade.side === SIDE.SELL ? SIDE.BUY : SIDE.SELL
        if (!trade.symbol && !trade.stopMarketPrice && !trade.takeProfitPrice) return
        handleVerifyAndCreateTpSl(trade.symbol, tpslSide, trade.stopMarketPrice, trade.takeProfitPrice, account)
      })
    }, 15000)
  }
}

async function changeLeverage (account) {
  const { getAccountData } = await accountState(account)
  const accountData = getAccountData()
  accountData.symbols.forEach(async (symbol) => {
    const changedLeverage = await api.changeLeverage(account, accountData.leverage, symbol)
    if (!changedLeverage) {
      console.log('Error when change Leverage')
      return false
    }
    console.log('Leverage Changed Successfully: ', symbol)
  })
  return true
}
// END OF EXECUTE FUCTION

module.exports = {
  execute,
  changeLeverage
}

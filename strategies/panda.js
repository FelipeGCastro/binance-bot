const { validateEma200And50 } = require('../indicators/ema.js')
const validateHiddenDivergence = require('../operations/hiddenDivergence.js')
const validateRegularDivergence = require('../operations/regularDivergence.js')
const { verifyOpenOrders, handleAddCandle, handleTrendingValidation, getStopAndTargetPrice } = require('../operations/index.js')
const api = require('../services/api.js')
const ws = require('../services/ws.js')
const { hasCrossStoch } = require('../tools/validations.js')
const { handleNewOrder } = require('../operations/newOrder.js')
const { handleListenKey } = require('../operations/listenKey.js')
const { createTpandSLOrder } = require('../operations/tpsl.js')
const { ORDER_TYPE } = require('../tools/constants.js')
const { tpslOrderFilled } = require('../operations/userDataUpdate.js')
const { sendMessage } = require('../services/telegram.js')
const { exec } = require('child_process')
const moment = require('moment')

const account = {
  stepOne: { validated: false, timeframe: '', candlesToReset: 0 },
  trending: { ema200: false, ema50: false, position: false },
  tradeCandles: null
}
// open /Applications/Binance.app
async function executePanda (symbol, test) {
  // const id = 1
  sendMessage('PANDA Initiated Succefully')
  const defaultAccount = account
  const lowerListeners = { '5m': null, '15m': null }

  const higherTimeframes = [
    { timeframe: '1h', closeHandler: handleCloseStepOne },
    { timeframe: '30m', closeHandler: handleCloseStepOne }
  ]
  const lowerTimeframes = [
    { timeframe: '15m', closeHandler: handleCloseStepTwo },
    { timeframe: '5m', closeHandler: handleCloseStepTwo }
  ]
  await api.changeLeverage(1, symbol)
  if (!test && await verifyOpenOrders()) {
    return console.log('Already Has Opened Orders')
  } else console.log('No Opened Orders')

  handleListenKey(symbol, handleMarketFilled)

  for (const candlesHandler of higherTimeframes) {
    let candles = await api.candles(symbol, candlesHandler.timeframe)

    if (!candles) {
      return console.log('ERROR FETCHING CANDLES')
    } else console.log('First Candles Fetched', candlesHandler.timeframe, moment().format('LT'))

    let lastEventAt = 0
    await ws.onKlineContinuos(symbol, candlesHandler.timeframe, async (data) => {
      if (data.k.x && data.E > lastEventAt) {
        lastEventAt = data.E
        console.log('Candle Closed -- timeframe: ', candlesHandler.timeframe)
        candles = handleAddCandle(data, candles)
        candlesHandler.closeHandler(candles, candlesHandler.timeframe)
      }
    })
  }

  async function handleLowerTimeframes () {
    for (const candlesHandler of lowerTimeframes) {
      let candles = await api.candles(symbol, candlesHandler.timeframe)

      if (!candles) {
        return console.log('ERROR FETCHING CANDLES')
      } else console.log('First Candles Fetched', candles.length, candlesHandler.timeframe)

      let lastEventAt = 0
      lowerListeners[candlesHandler.timeframe] = await ws.onKlineContinuos(symbol, candlesHandler.timeframe, async (data) => {
        if (data.k.x && data.E > lastEventAt) {
          lastEventAt = data.E
          console.log('Candle Closed -- timeframe: ', candlesHandler.timeframe)
          candles = handleAddCandle(data, candles)
          candlesHandler.closeHandler(candles, candlesHandler.timeframe)
        }
      })
    }
  }

  async function handleCloseStepOne (candles, timeframe) {
    if (account.stepOne.validated) {
      if (account.stepOne.timeframe === timeframe) {
        if (account.stepOne.candlesToReset === 5) {
          account.stepOne = { validated: false, timeframe: '', candlesToReset: 0 }
          lowerListeners['5m'].close(1000)
          lowerListeners['15m'].close(1000)
          lowerListeners['5m'] = null
          lowerListeners['15m'] = null
          return
        }
        account.stepOne = { ...account.stepOne, candlesToReset: account.stepOne.candlesToReset + 1 }
      }
      return console.log('stepOne.validated')
    }

    if (!test && await verifyOpenOrders(symbol)) {
      return console.log('Already Has Open Orders')
    }

    const trendingEma = validateEma200And50(candles)
    account.trending = trendingEma

    const trending = handleTrendingValidation(trendingEma, candles)

    if (!trending) {
      return
    }

    const hasDivergence = validateHiddenDivergence(candles, trendingEma.position)

    if (hasDivergence) {
      account.stepOne = { validated: true, timeframe, candlesToReset: 0 }
      console.log('Step one Validated')
      handleLowerTimeframes()
      return true
    }
  }

  async function handleCloseStepTwo (candles, timeframe) {
    if (!account.stepOne.validated) {
      return false
    }

    if (!account.trending.position) {
      return false
    }

    if (!account.tradeCandles) {
      return false
    }

    const trending = handleTrendingValidation(account.trending, candles)

    if (!trending) {
      return false
    }
    const sidePosition = account.trending?.position
    const crossStoch = hasCrossStoch()
    const divergence = validateRegularDivergence(candles, sidePosition)

    if (!divergence || !crossStoch || crossStoch !== sidePosition) {
      return false
    }

    account.stepOne = { validated: false, timeframe: '', candlesToReset: 0 }
    account.tradeCandles = candles
    const orderData = {
      side: sidePosition,
      closePrice: divergence.lastClosePrice,
      symbol,
      sidePosition,
      entryValue: 50,
      maxEntryValue: 70
    }
    console.log('Valid !!! orderData:', orderData)
    if (!test) {
      lowerListeners[timeframe] = null
      await handleNewOrder(orderData)
      exec('open /Applications/Binance.app', (error) => {
        console.log('Erro ao abrir binance', error)
      })
    }

    return true
  }

  async function handleMarketFilled (order) {
    const { stopPrice, targetPrice } = getStopAndTargetPrice({
      candles: account.tradeCandles,
      entryPrice: order.ap,
      positionSideOrSide: account.trending.position
    })

    const isTPSL = order.o === ORDER_TYPE.STOP_MARKET || order.o === ORDER_TYPE.TAKE_PROFIT_MARKET

    if (order.X === 'FILLED' && order.o === ORDER_TYPE.MARKET) {
      createTpandSLOrder({
        orderSide: order.S, stopPrice, targetPrice, symbol, quantity: order.q
      })
    } else if (order.X === 'FILLED' && isTPSL) {
      await api.cancelAllOrders(order.s)
      tpslOrderFilled()
      account.stepOne = defaultAccount.stepOne
      account.trending = defaultAccount.trending
      account.tradeCandles = null
    }
  }

// END
// END
}

module.exports = executePanda

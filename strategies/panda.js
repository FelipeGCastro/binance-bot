const { validateEma200And50 } = require('../indicators/ema.js')
const validateHiddenDivergence = require('../operations/hiddenDivergence.js')
const validateRegularDivergence = require('../operations/regularDivergence.js')
const { verifyOpenOrders, handleAddCandle, handleTrendingValidation } = require('../operations/index.js')
// const Account = require('../src/models/account')
const api = require('../services/api.js')
const ws = require('../services/ws.js')
const { hasCrossStoch } = require('../tools/validations.js')
const { handleNewOrder } = require('../operations/newOrder.js')
const { handleListenKey } = require('../operations/listenKey.js')

const account = {
  stepOne: { validated: false, timeframe: '' },
  stepTwo: { validated: false, timeframe: '' },
  stepThree: { validated: false, timeframe: '' },
  stepFour: { validated: false, timeframe: '' },
  trending: { ema200: false, ema50: false, position: false }
}

async function executePanda (symbol) {
  // const id = 1
  const candlesHandlerArray = [
    { timeframe: '1h', closeHandler: handleCloseStepOne },
    { timeframe: '30m', closeHandler: handleCloseStepOne },
    { timeframe: '15m', closeHandler: handleCloseStepTwo },
    { timeframe: '5m', closeHandler: handleCloseStepTwo }
  ]

  handleListenKey(symbol, (order) => {
    // CONTINUE!!
  })

  for (const candlesHandler of candlesHandlerArray) {
    let candles = await api.candles(symbol, candlesHandler.timeframe)
    if (!candles) {
      console.log('ERROR FETCHING CANDLES')
      return
    }
    let lastEventAt = 0
    await ws.onKlineContinuos(symbol, candlesHandler.timeframe, async (data) => {
      if (data.k.x && data.E > lastEventAt) {
        lastEventAt = data.E
        candles = handleAddCandle(data, candles)
        candlesHandler.closeHandler(data, candles, candlesHandler.timeframe)
      }
    })
  }

  async function handleCloseStepOne (data, candles, timeframe) {
    if (account.stepOne.validated) {
      console.log('STEP ONE VALIDATED')
      return
    }

    if (await verifyOpenOrders(symbol)) {
      console.log('Already Has Open Orders')
      return
    }

    const trendingEma = validateEma200And50(candles)
    account.trending = trendingEma

    const trending = handleTrendingValidation(trendingEma, candles)

    if (!trending) {
      return
    }

    const hasDivergence = validateHiddenDivergence(candles, trendingEma.position)

    if (hasDivergence) {
      account.stepOne = { validated: true, timeframe }
    }
  }

  async function handleCloseStepTwo (data, candles, timeframe) {
    if (!account.stepTwo.validated || !account.trending.position) {
      console.log('STEP ONE NOT VALIDATED')
      return
    }
    if (await verifyOpenOrders()) {
      console.log('Already Has Open Orders')
      return
    }

    const trending = handleTrendingValidation(account.trending, candles)

    if (!trending) {
      return
    }
    const sidePosition = account.trending?.position
    const crossStoch = hasCrossStoch()
    const divergence = validateRegularDivergence(candles, sidePosition)

    if (!divergence || !crossStoch || crossStoch !== sidePosition) {
      return
    } else {
      account.stepTwo = { validated: true, timeframe }
    }
    const orderData = {
      side: sidePosition,
      closePrice: divergence.lastClosePrice,
      symbol,
      sidePosition,
      entryValue: 50,
      maxEntryValue: 70
    }

    await handleNewOrder(orderData)
  }

// END
// END
}

module.exports = executePanda

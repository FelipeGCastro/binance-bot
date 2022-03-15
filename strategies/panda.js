const { validateEma200And50 } = require('../indicators/ema.js')
const validateDivergence = require('../operations/hiddenDivergence.js')
const { verifyOpenOrders, handleAddCandle, handleTrendingValidation } = require('../operations/index.js')
const Account = require('../src/models/account')
const api = require('../services/api.js')
const ws = require('../services/ws.js')

async function executePanda (symbol) {
  const id = 1
  let lastEventAt = 0
  let candlesOne = await api.candles(symbol, '1h')
  let candlesTwo = await api.candles(symbol, '30m')
  let candlesThree = await api.candles(symbol, '5m')

  if (!candlesOne) {
    console.log('Problems with get Candles')
    return
  }

  await ws.onKlineContinuos(symbol, '1h', async (data) => {
    if (data.k.x && data.E > lastEventAt) {
      lastEventAt = data.E
      candlesOne = handleAddCandle(data, candlesOne)
      handleCloseCandleOne(data)
    }
  })

  await ws.onKlineContinuos(symbol, '30m', async (data) => {
    if (data.k.x && data.E > lastEventAt) {
      lastEventAt = data.E
      candlesTwo = handleAddCandle(data, candlesTwo)
      handleCloseCandleTwo(data)
    }
  })

  await ws.onKlineContinuos(symbol, '5m', async (data) => {
    if (data.k.x && data.E > lastEventAt) {
      lastEventAt = data.E
      candlesThree = handleAddCandle(data, candlesThree)
      handleCloseCandleThree(data)
    }
  })

  async function handleCloseCandleOne (data) {
    const account = await Account.findOne({ id }).exec()

    if (account.stepOne) {
      console.log('STEP ONE VALIDATED')
      return
    }

    if (await verifyOpenOrders(symbol)) {
      console.log('Already Has Open Orders')
      return
    }

    const trendingEma = validateEma200And50(candlesOne)

    const trending = handleTrendingValidation(trendingEma, candlesOne)

    if (!trending) {
      return
    }

    const hasDivergence = validateDivergence(candlesOne, trendingEma.position)

    if (hasDivergence) {
      Account.findByIdAndUpdate(id, { $set: { id, stepOne: true } }, { upsert: true })
    }
  }

  async function handleCloseCandleTwo (data) {
    const account = await Account.findOne({ id }).exec()

    if (account.stepOne) {
      console.log('STEP ONE VALIDATED')
      return
    }

    if (await verifyOpenOrders()) {
      console.log('Already Has Open Orders')
      return
    }

    const trendingEma = validateEma200And50(candlesTwo)

    const trending = handleTrendingValidation(trendingEma, candlesTwo)

    if (!trending) {
      return
    }

    const hasDivergence = validateDivergence(candlesTwo, trendingEma.position)

    if (hasDivergence) {
      Account.findByIdAndUpdate(id, { $set: { id, stepOne: true } }, { upsert: true })
    }
  }

  async function handleCloseCandleThree (data) {
    if (await verifyOpenOrders()) {
      console.log('Already Has Open Orders')
      return
    }
    console.log('Already Has Open Orders')
    // const trendingEma = validateEma200And50(candlesOne)
  }

// END
// END
}

module.exports = executePanda

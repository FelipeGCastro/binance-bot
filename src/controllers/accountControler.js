const express = require('express')
const home = require('../../index')
const STRATEGIES = require('../../tools/constants').STRATEGIES
const api = require('../../services/api')

const accountRoutes = express.Router()

accountRoutes.get('/', async (req, res) => {
  const accountdata = await home.getAccountData()
  res.send(accountdata)
})

accountRoutes.get('/strategies', async (req, res) => {
  res.send(STRATEGIES)
})

accountRoutes.get('/symbols', async (req, res) => {
  const exchangeInfo = await api.exchangeInfo()
  const allSymbols = exchangeInfo.symbols.map(data => data.symbol)
  return res.send(allSymbols)
})

accountRoutes.post('/symbol', async (req, res) => {
  const { symbol } = req.body
  if (typeof symbol !== 'string') return res.status(400).send({ error: 'Bad type' })
  if (!home.setSymbols(symbol)) return res.status(400).send({ error: 'Error to add Symbol' })
  const accountdata = await home.getAccountData()

  return res.send(accountdata)
})
accountRoutes.put('/symbol', async (req, res) => {
  const { symbol, removeSymbol } = req.body
  if (typeof symbol !== 'string') return res.status(400).send({ error: 'Bad type' })
  if (typeof removeSymbol !== 'string') return res.status(400).send({ error: 'Bad type' })
  if (!home.updateSymbols(removeSymbol, symbol)) return res.status(400).send({ error: 'Cannot remove updatesymbol' })
  const accountdata = await home.getAccountData()
  return res.send(accountdata)
})

accountRoutes.put('/boton', async (req, res) => {
  const { botOn } = req.body
  if (typeof botOn !== 'boolean') return res.status(400).send({ error: 'Bad type' })
  home.turnBotOn(botOn)
  console.log('bot its tooggled')
  const accountdata = await home.getAccountData()
  res.send(accountdata)
})

accountRoutes.put('/leverage', async (req, res) => {
  const { leverage } = req.body

  if (typeof leverage !== 'number') return res.status(400).send({ error: 'Bad type' })

  home.setLeverage(leverage)
  console.log('changed leverage')

  const accountdata = await home.getAccountData()
  res.send(accountdata)
})

accountRoutes.put('/entryValue', async (req, res) => {
  const { entryValue } = req.body

  if (typeof entryValue !== 'number') return res.status(400).send({ error: 'Bad type' })
  home.setEntryValue(entryValue)
  console.log('changed entryValue')

  const accountdata = await home.getAccountData()
  res.send(accountdata)
})

accountRoutes.put('/strategy', async (req, res) => {
  const { strategy } = req.body

  if (strategy === STRATEGIES.HIDDEN_DIVERGENCE ||
    strategy === STRATEGIES.SHARK
  ) {
    const setStrategy = await home.handleChangeStrategy(strategy)

    if (!setStrategy) return res.status(400).send({ error: 'During Trading, try later' })
    console.log('changed strategy')
  } else return res.status(400).send({ error: 'Bad request' })

  const accountdata = await home.getAccountData()
  res.send(accountdata)
})

module.exports = accountRoutes

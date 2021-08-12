const express = require('express')
const home = require('../../index')
const STRATEGIES = require('../../tools/constants').STRATEGIES

const accountRoutes = express.Router()

accountRoutes.get('/', async (req, res) => {
  const accountdata = await home.getAccountData()
  res.send(accountdata)
})

accountRoutes.put('/symbol', async (req, res) => {
  const { symbol } = req.body

  if (typeof symbol !== 'string') return res.status(400).send({ error: 'Bad type' })

  home.setSymbol(symbol)
  const accountdata = await home.getAccountData()

  return res.send(accountdata)
})

accountRoutes.put('/botOn', async (req, res) => {
  const { botOn } = req.body
  if (typeof botOn !== 'boolean') return res.status(400).send({ error: 'Bad type' })
  home.turnBotOn(botOn)

  const accountdata = await home.getAccountData()
  res.send(accountdata)
})

accountRoutes.put('/leverage', async (req, res) => {
  const { leverage } = req.body

  if (typeof leverage !== 'number') return res.status(400).send({ error: 'Bad type' })

  home.setLeverage(leverage)

  const accountdata = await home.getAccountData()
  res.send(accountdata)
})

accountRoutes.put('/entryValue', async (req, res) => {
  const { entryValue } = req.body

  if (typeof entryValue !== 'number') return res.status(400).send({ error: 'Bad type' })
  home.setEntryValue(entryValue)

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
  } else return res.status(400).send({ error: 'Bad request' })

  const accountdata = await home.getAccountData()
  res.send(accountdata)
})

module.exports = accountRoutes

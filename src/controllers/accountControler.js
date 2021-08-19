const express = require('express')
const home = require('../../index')
const { STRATEGIES, ACCOUNTS_TYPE } = require('../../tools/constants')
const api = require('../../services/api')
const helpers = require('../../helpers/index')

const accountRoutes = express.Router()

accountRoutes.get('/:account', async (req, res) => {
  const { account } = req.params
  const accountdata = await home.getAccountData(account)
  res.send(accountdata)
})

accountRoutes.get('/strategies', async (req, res) => {
  console.log('requested strategies')
  res.send(STRATEGIES)
})

accountRoutes.get('/symbols', async (req, res) => {
  const exchangeInfo = await api.exchangeInfo()
  const allSymbols = exchangeInfo.symbols.map(data => data.symbol)
  return res.send(allSymbols)
})

accountRoutes.put('/:account/symbols', async (req, res) => {
  const { account } = req.params
  const { symbols } = req.body
  if (account !== ACCOUNTS_TYPE.PRIMARY || account !== ACCOUNTS_TYPE.SECONDARY) { return res.status(400).send({ error: 'Bad type' }) }
  if (!Array.isArray(symbols)) return res.status(400).send({ error: 'Bad type' })
  if (symbols.length > 5) return res.status(400).send({ error: 'Max symbols is 5' })
  const allSymbols = await helpers.getAllSymbols()
  let notValid = false
  if (allSymbols) {
    symbols.forEach(symbol => {
      if (!allSymbols.includes(symbol)) notValid = true
    })
  }
  if (notValid) return res.status(400).send({ error: 'One or More symbol does not exist' })
  if (!home.updateSymbols(account, symbols)) return res.status(400).send({ error: 'Cannot remove updatesymbol' })
  const accountdata = await home.getAccountData(account)
  return res.send(accountdata)
})

accountRoutes.put('/:account/boton', async (req, res) => {
  const { account } = req.params
  console.log(account, 'account')
  const { botOn } = req.body
  if (account !== ACCOUNTS_TYPE.PRIMARY && account !== ACCOUNTS_TYPE.SECONDARY) { return res.status(400).send({ error: 'Bad type' }) }
  if (typeof botOn !== 'boolean') return res.status(400).send({ error: 'Bad type' })
  home.turnBotOn(account, botOn)
  console.log('bot its tooggled')
  const accountdata = await home.getAccountData(account)
  res.send(accountdata)
})

accountRoutes.put('/:account/leverage', async (req, res) => {
  const { account } = req.params
  const { leverage } = req.body
  if (account !== ACCOUNTS_TYPE.PRIMARY || account !== ACCOUNTS_TYPE.SECONDARY) { return res.status(400).send({ error: 'Bad type' }) }
  if (typeof leverage !== 'number') return res.status(400).send({ error: 'Bad type' })

  if (!home.changeLeverage(account, leverage)) return res.status(400).send({ error: 'Problems with change leverage' })
  console.log('changed leverage')
  const accountdata = await home.getAccountData(account)
  res.send(accountdata)
})

accountRoutes.put('/:account/entryValue', async (req, res) => {
  const { account } = req.params
  const { entryValue } = req.body
  if (account !== ACCOUNTS_TYPE.PRIMARY || account !== ACCOUNTS_TYPE.SECONDARY) { return res.status(400).send({ error: 'Bad type' }) }
  if (typeof entryValue !== 'number') return res.status(400).send({ error: 'Bad type' })
  home.setEntryValue(account, entryValue)
  console.log('changed entryValue')

  const accountdata = await home.getAccountData(account)
  res.send(accountdata)
})

accountRoutes.put('/:account/strategy', async (req, res) => {
  const { account } = req.params
  const { strategy } = req.body
  if (account !== ACCOUNTS_TYPE.PRIMARY || account !== ACCOUNTS_TYPE.SECONDARY) { return res.status(400).send({ error: 'Bad type' }) }
  if (strategy === STRATEGIES.HIDDEN_DIVERGENCE ||
    strategy === STRATEGIES.SHARK
  ) {
    const setStrategy = await home.handleChangeStrategy(account, strategy)

    if (!setStrategy) return res.status(400).send({ error: 'During Trading, try later' })
    console.log('changed strategy')
  } else return res.status(400).send({ error: 'Bad request' })

  const accountdata = await home.getAccountData(account)
  res.send(accountdata)
})

module.exports = accountRoutes

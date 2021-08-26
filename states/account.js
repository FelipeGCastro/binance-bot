const Account = require('../src/models/account')
const { updateAccountData } = require('../services/socket.js')
const { ACCOUNT_PROP } = require('../tools/constants')

async function getAccountState (account) {
  let ACCOUNT

  if (!ACCOUNT) ACCOUNT = await Account.findOne({ type: account })

  async function setAccountData (key, value) {
    ACCOUNT[key] = value
    const updated = await Account.findOneAndUpdate({ type: account }, { [key]: value }, { new: true })
    return updated
  }

  function getAccountData (key = null) { return key ? ACCOUNT[key] : ACCOUNT }

  function getTradesDelayed () {
    return new Promise(resolve => {
      setTimeout(() => resolve(ACCOUNT.tradesOn), 2000)
    })
  }

  async function setTradesOn (trade) {
    ACCOUNT.tradesOn.push(trade)
    await Account.findOneAndUpdate({ type: account }, { tradesOn: ACCOUNT.tradesOn })
    updateAccountData(account, ACCOUNT)
  }

  async function clearTradesOn () {
    ACCOUNT.tradesOn = []
    await Account.findOneAndUpdate({ type: account }, { tradesOn: ACCOUNT.tradesOn })
  }

  function updateTradesOn (symbol, key, value) {
    const oldObject = ACCOUNT.tradesOn.find(trade => trade.symbol === symbol)
    if (!oldObject) return
    removeFromTradesOn(symbol)
    const newObject = { ...oldObject, [key]: value }
    setTradesOn(account, newObject)
  }

  async function removeFromTradesOn (symb) {
    ACCOUNT.tradesOn = ACCOUNT.tradesOn.filter(trade => trade.symbol !== symb)
    await Account.findOneAndUpdate({ type: account }, { tradesOn: ACCOUNT.tradesOn })
    updateAccountData(account, ACCOUNT)
  }

  async function updateListenKeyIsOn (value) {
    ACCOUNT.listenKeyIsOn = value
    await Account.findOneAndUpdate({ type: account }, { listenKeyIsOn: value })
    updateAccountData(account, ACCOUNT)
  }

  function getTradesOn () { return ACCOUNT.tradesOn }

  async function turnBotOn (bool) {
    console.log('turnBotOn', bool)
    if (bool) {
      if (!ACCOUNT.botOn) {
        clearTradesOn()
        return await setAccountData(ACCOUNT_PROP.BOT_ON, bool)
      }
    } else {
      clearTradesOn()
      updateListenKeyIsOn(false)
      return await setAccountData(ACCOUNT_PROP.BOT_ON, bool)
    }
  }

  return {
    ACCOUNT,
    getTradesOn,
    setTradesOn,
    setAccountData,
    getAccountData,
    getTradesDelayed,
    updateTradesOn,
    removeFromTradesOn,
    updateListenKeyIsOn,
    turnBotOn
  }
}

module.exports = getAccountState

const Account = require('../src/models/account')
const { updateAccountData } = require('../services/socket.js')
const { ACCOUNT_PROP, ACCOUNTS_TYPE } = require('../tools/constants')

let ACCOUNT = {
  [ACCOUNTS_TYPE.PRIMARY]: false,
  [ACCOUNTS_TYPE.SECONDARY]: false
}
async function getAccountState () {
  if (!ACCOUNT) ACCOUNT = await Account.findOne({ type: 'primary' })

  async function setAccountData (key, value) {
    ACCOUNT[key] = value
    const updated = await Account.findOneAndUpdate({ type: 'primary' }, { $set: { [key]: value } }, { new: true })
    return updated
  }

  function getAccountData (key = null) { return key ? ACCOUNT[key] : ACCOUNT }

  function getTradesDelayed () {
    return new Promise(resolve => {
      setTimeout(() => resolve(ACCOUNT.tradesOn), 1000)
    })
  }

  async function tradesOnUpdadeDB () {
    Account.findOneAndUpdate({ type: 'primary' }, { $set: { tradesOn: ACCOUNT.tradesOn } })
  }

  async function setTradesOn (trade) {
    ACCOUNT.tradesOn.push(trade)
    tradesOnUpdadeDB()
    updateAccountData(ACCOUNT)
  }

  async function clearTradesOn () {
    ACCOUNT.tradesOn = []
    tradesOnUpdadeDB()
  }

  async function updateTradesOn (symbol, key, value) {
    const tradeIndex = ACCOUNT.tradesOn.findIndex(trade => trade.symbol === symbol)
    if (tradeIndex < 0) return
    ACCOUNT.tradesOn[tradeIndex][key] = value
    tradesOnUpdadeDB()
  }

  async function removeFromTradesOn (symb) {
    ACCOUNT.tradesOn = ACCOUNT.tradesOn.filter(trade => trade.symbol !== symb)
    tradesOnUpdadeDB()
    updateAccountData(ACCOUNT)
  }

  async function updateListenKeyIsOn (value) {
    ACCOUNT.listenKeyIsOn = value
    await Account.findOneAndUpdate({ type: 'primary' }, { $set: { listenKeyIsOn: value } })
    updateAccountData(ACCOUNT)
  }

  function getTradesOn () { return ACCOUNT.tradesOn }

  async function turnBotOn (bool) {
    if (bool) {
      console.log('ACCOUNT.botOn', ACCOUNT.botOn)
      if (!ACCOUNT.botOn) {
        clearTradesOn()
        return await setAccountData(ACCOUNT_PROP.BOT_ON, bool)
      }
    } else {
      clearTradesOn()
      updateListenKeyIsOn(false)
      await setAccountData(ACCOUNT_PROP.LIMIT_REACHED, false)
      return await setAccountData(ACCOUNT_PROP.BOT_ON, bool)
    }
  }

  return {
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

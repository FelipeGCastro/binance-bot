const Account = require('../src/models/account')
const { updateAccountData } = require('../services/socket.js')
const { ACCOUNT_PROP } = require('../tools/constants')

async function getAccountState (account) {
  const ACCOUNT = await Account.findOne({ type: account })

  function setAccountData (key, value) {
    ACCOUNT[key] = value
    return true
  }

  function getAccountData (key = false) { return key ? ACCOUNT[key] : ACCOUNT }

  function getTradesDelayed () {
    return new Promise(resolve => {
      setTimeout(() => resolve(ACCOUNT.tradesOn), 2000)
    })
  }

  function setTradesOn (trade) {
    ACCOUNT.tradesOn.push(trade)
    updateAccountData(account, ACCOUNT)
  }

  function updateTradesOn (symbol, key, value) {
    const oldObject = ACCOUNT.tradesOn.find(trade => trade.symbol === symbol)
    if (!oldObject) return
    removeFromTradesOn(symbol)
    const newObject = { ...oldObject, [key]: value }
    setTradesOn(account, newObject)
  }

  function removeFromTradesOn (symb) {
    ACCOUNT.tradesOn = ACCOUNT.tradesOn.filter(trade => trade.symbol !== symb)
    ACCOUNT.limitReached = ACCOUNT.tradesOn.length >= ACCOUNT.limitOrdersSameTime
    updateAccountData(account, ACCOUNT)
  }

  function updateListenKeyIsOn (value) {
    ACCOUNT.listenKeyIsOn = value
    updateAccountData(account, ACCOUNT)
  }

  function getTradesOn () { return ACCOUNT.tradesOn }

  function handleChangeStrategy (stratName) {
    setAccountData(ACCOUNT_PROP.STRATEGY, stratName)
    return true
  }

  async function updateSymbols (newSymbols) {
    ACCOUNT.symbols = newSymbols
    return true
  }

  async function turnBotOn (bool) {
    if (bool) {
      if (!ACCOUNT.botOn) {
        ACCOUNT.tradesOn = []
        setAccountData(ACCOUNT_PROP.BOT_ON, bool)
        return true
      }
    } else {
      ACCOUNT.tradesOn = []
      updateListenKeyIsOn(false)
      setAccountData(ACCOUNT_PROP.BOT_ON, bool)
      return false
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
    handleChangeStrategy,
    updateSymbols,
    turnBotOn
  }
}

module.exports = getAccountState

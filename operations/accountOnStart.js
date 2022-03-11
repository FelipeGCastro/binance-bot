const api = require('../services/api.js')
const getAccountState = require('../states/account')
const Account = require('../src/models/account')
const { ACCOUNT_PROP } = require('../tools/constants.js')

async function checkAccountOnStart (execute) {
  const { updateListenKeyIsOn, setAccountData, removeFromTradesOn } = await getAccountState()
  const accountData = await Account.findOne({ type: 'primary' })
  if (accountData.limitReached) setAccountData(ACCOUNT_PROP.LIMIT_REACHED, false)
  if (accountData.listenKeyIsOn) updateListenKeyIsOn(false)
  if (accountData.currentTrades.length > 0) {
    const accountInfo = await api.getAccountInfo()
    accountData.currentTrades.forEach(trade => {
      const hasTrade = accountInfo.positions.find(pos => pos.symbol === trade.symbol)
      if (!hasTrade) removeFromTradesOn(trade.symbol)
    })
  }
  if (accountData.botOn) execute()
}

module.exports = checkAccountOnStart

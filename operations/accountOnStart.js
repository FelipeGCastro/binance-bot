const api = require('../services/api.js')
const accountState = require('../states/account')
const Account = require('../src/models/account')

async function checkAccountOnStart (account, execute) {
  const { updateListenKeyIsOn, removeFromTradesOn } = await accountState(account)
  const accountData = await Account.findOne({ type: account })
  if (accountData.listenKeyIsOn) updateListenKeyIsOn(false)
  if (accountData.tradesOn.length > 0) {
    const accountInfo = await api.getAccountInfo(account)
    accountData.tradesOn.forEach(trade => {
      const hasTrade = accountInfo.positions.find(pos => pos.symbol === trade.symbol)
      if (!hasTrade) removeFromTradesOn(trade.symbol)
    })
  }
  if (accountData.botOn) execute(account)
}

module.exports = checkAccountOnStart

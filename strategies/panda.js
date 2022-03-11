const getAccountState = require('../states/account')
const getExecuteState = require('../states/execute')

async function executePanda () {
  const { getState, setState, addToStateArray, updateAllCandles } = await getExecuteState()
  const { getAccountData, getTradesOn, updateListenKeyIsOn } = await getAccountState()
}

module.exports = executePanda

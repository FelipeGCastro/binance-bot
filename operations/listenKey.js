const api = require('../services/api.js')
const ws = require('../services/ws.js')
const telegram = require('../services/telegram')

async function handleListenKey (symbol, updateHandler) {
  async function getListenKey () {
    const data = await api.listenKey()
    if (data) {
      return setWsListen(data.listenKey)
    } else {
      console.log('Error getting listenKey')
      telegram.sendMessage('Error getting listenKey')
      return false
    }
  }

  async function setWsListen (listenKey) {
    const wsListenKey = ws.listenKey(listenKey, async (data) => {
      if (data.e === 'listenKeyExpired') {
        wsListenKey?.close()
        await getListenKey()
      } else if (data.e === 'ORDER_TRADE_UPDATE' && data.o.s === symbol) {
        if (data.o) {
          await updateHandler(data.o)
        }
      }
    })
  }

  return getListenKey()
}

module.exports = {
  handleListenKey
}

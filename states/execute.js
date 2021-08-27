const getAccountState = require('./account')
const hiddenDivergence = require('../strategies/hiddenDivergence')
const sharkStrategy = require('../strategies/shark')
const { STRATEGIES } = require('../tools/constants')

async function getExecuteState (account) {
  try {
    const { ACCOUNT } = await getAccountState(account)
    const SET_STRATEGY = {
      [STRATEGIES.SHARK]: sharkStrategy,
      [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
    }

    const state = {
      candlesListeners: [],
      userDataListeners: null,
      validateEntry: SET_STRATEGY[ACCOUNT.strategy].validateEntry,
      getStopAndTargetPrice: SET_STRATEGY[ACCOUNT.strategy].getStopAndTargetPrice,
      interval: SET_STRATEGY[ACCOUNT.strategy].getInterval(),
      allCandles: []
    }

    function setState (key, values) { state[key] = values }
    function getState (key) { return key ? state[key] : state }
    function addToStateArray (key, value) { state[key].push(value) }
    function updateAllCandles (arrayWithValues) { state.allCandles = arrayWithValues }
    function resetListenersAndCandles () {
      console.log('candles Listerners:', state.candlesListeners.length, 'userDataListerners: ', state.userDataListeners)
      state.candlesListeners.forEach(list => { list.listener.close(1000) })
      if (state.userDataListeners) state.userDataListeners.close(1000)
      state.candlesListeners = []
      state.allCandles = []
    }
    return { updateAllCandles, setState, getState, addToStateArray, resetListenersAndCandles }
  } catch (error) {
    console.log(error)
  }
}

module.exports = getExecuteState

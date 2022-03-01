const getAccountState = require('./account')
const hiddenDivergence = require('../strategies/hiddenDivergence')
const sharkStrategy = require('../strategies/shark')
const { STRATEGIES, ACCOUNT_PROP } = require('../tools/constants')

const state = {
  candlesListeners: [],
  userDataListeners: null,
  validateEntry: () => {},
  getStopAndTargetPrice: () => {},
  interval: null,
  allCandles: []
}

async function getExecuteState () {
  try {
    const { getAccountData } = await getAccountState()
    const strategy = getAccountData(ACCOUNT_PROP.STRATEGY)
    const SET_STRATEGY = {
      [STRATEGIES.SHARK]: sharkStrategy,
      [STRATEGIES.HIDDEN_DIVERGENCE]: hiddenDivergence
    }

    state.validateEntry = SET_STRATEGY[strategy].validateEntry
    state.getStopAndTargetPrice = SET_STRATEGY[strategy].getStopAndTargetPrice
    state.interval = SET_STRATEGY[strategy].getInterval()

    function setState (key, values) { state[key] = values }
    function getState (key) { return key ? state[key] : state }
    function addToStateArray (key, value) {
      state[key].push(value)
    }
    function updateAllCandles (arrayWithValues) { state.allCandles = arrayWithValues }
    function resetListenersAndCandles () {
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

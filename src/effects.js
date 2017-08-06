const {
  initialState,
  changed,
} = require('./state')

function effects(state, actions) {
  console.log(state)
}

function subscribeEffects(store, actions) {
  let prev_state = initialState
  store.subscribe(() => {
    const state = store.getState()
    if (changed(prev_state, state)) {
      effects(state, actions)
      prev_state = state
    }
  })
}

module.exports = {subscribeEffects}

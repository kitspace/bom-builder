const immutableDiff = require('immutable-diff').default

const {findSuggestions} = require('./suggestions')
const {
  initialState,
  changed,
} = require('./state')

function effects(diff, state, actions) {
  diff.forEach(d => {
    const op = d.get('op')
    const path = d.get('path')
    const value = d.get('value')
    //disabled as this seems to cause stack overflows
    //if (path.get(0) === 'lines' && typeof path.get(1) === 'number') {
    //  const line = state.data.present.getIn(path.slice(0, 2))
    //  const suggestions = state.suggestions.get(line.get('id'))
    //  findSuggestions(line, suggestions, actions)
    //}
  })
}

function subscribeEffects(store, actions) {
  let prev_state = initialState
  store.subscribe(() => {
    const state = store.getState()
    if (changed(prev_state, state)) {
      effects(immutableDiff(prev_state.data.present, state.data.present), state, actions)
      prev_state = state
    }
  })
}

module.exports = {subscribeEffects}

const immutableDiff = require('immutable-diff').default
const immutable = require('immutable')

const {findSuggestions} = require('./suggestions')
const {
  initialState,
  changed,
} = require('./state')

function effects(diff, state, actions) {
  diff.forEach(d => {
    const path = d.get('path')
    const lineId = path.get(1)
    if (path.get(0) === 'lines' && typeof lineId === 'number') {
      const line = state.data.present.getIn(path.slice(0, 2))
      const suggestions = state.suggestions.getIn([lineId, 'data'])
        .filter(p => !p.get('from').equals(path.slice(2)))
      findSuggestions(lineId, line, suggestions, actions)
    }
  })
}

function subscribeEffects(store, actions) {
  let past = initialState.data
  store.subscribe(() => {
    const state = store.getState()
    const present = state.data.present
    if (present !== past) {
      const diff = immutableDiff(present, past)
      past = present
      effects(diff, state, actions)
    }
  })
}

module.exports = {subscribeEffects}

import immutableDiff from 'immutable-diff'
import immutable from 'immutable'

import {findSuggestions} from './find_suggestions'
import {initialState, emptyPartNumber} from './state'

const suggestionFields = immutable.List([
  'description',
  'partNumbers',
  'retailers'
])

function needsSuggestions(path) {
  const lineId = path.get(1)
  return (
    path.get(0) === 'lines' &&
    typeof lineId === 'number' &&
    suggestionFields.some(f => path.includes(f))
  )
}

function effects(diff, state, actions) {
  Promise.all(
    diff.toArray().map(d => {
      const path = d.get('path')
      const lineId = path.get(1)
      if (needsSuggestions(path)) {
        const line = state.data.present.getIn(path.take(2))
        if (state.suggestions.getIn([lineId, 'status']) !== 'loading') {
          let suggestions =
            state.suggestions.getIn([lineId, 'data']) || immutable.List()
          suggestions = suggestions.filter(
            p => !p.get('from').equals(path.slice(2, 4))
          )
          return findSuggestions(lineId, line, suggestions, actions)
        }
      }
      return Promise.resolve()
    })
  )
}

export function subscribeEffects(store, actions) {
  let past = initialState.data
  store.subscribe(() => {
    const state = store.getState()
    const present = state.data.present
    if (present !== past) {
      const diff = immutableDiff(past, present).filter(d => {
        //ignore additions and removals of empty part numbers
        const path = d.get('path').take(4)
        if (path.get(2) === 'partNumbers') {
          const op = d.get('op')
          const value = d.get('value')
          if (op === 'remove' && past.getIn(path).equals(emptyPartNumber)) {
            return false
          } else if (op === 'add' && value.equals(emptyPartNumber)) {
            return false
          }
        }
        return true
      })
      past = present
      effects(diff, state, actions)
    }
  })
}

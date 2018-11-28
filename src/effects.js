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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function effects(diff, store, actions) {
  return Promise.all(
    diff.toArray().map(async d => {
      const path = d.get('path')
      const lineId = path.get(1)
      if (needsSuggestions(path)) {
        let state = store.getState()
        while (state.suggestions.getIn([lineId, 'status']) === 'loading') {
          await sleep(100)
          state = store.getState()
        }
        const line = state.data.present.getIn(path.take(2))
        let suggestions =
          state.suggestions.getIn([lineId, 'data']) || immutable.List()
        suggestions = suggestions.filter(
          p => !p.get('from').equals(path.slice(2, 4))
        )
        return findSuggestions(lineId, line, suggestions, actions)
      }
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
      effects(diff, store, actions)
    }
  })
}

import immutableDiff from 'immutable-diff'
import immutable from 'immutable'
import oneClickBom from '1-click-bom'

import {findSuggestions, searchDescription} from './find_suggestions'
import {initialState, emptyPartNumber} from './state'

const suggestionFields = immutable.List.of('partNumbers', 'retailers')

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
        const suggestionsToRemove = suggestions.filter(p =>
          p.get('from').equals(path.slice(2, 4))
        )
        suggestions = suggestions.filter(
          p => !p.get('from').equals(path.slice(2, 4))
        )
        actions.removeSuggestions({lineId, suggestionsToRemove})
        return findSuggestions(lineId, line, suggestions, actions)
      }
      if (path.last() === 'description') {
        actions.setSuggestionsSearch({lineId, status: 'start'})
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

    if (state.view.get('addingParts') === 'start') {
      actions.setAddingParts('adding')
      window.postMessage(
        {
          from: 'page',
          message: 'bomBuilderAddToCart',
          value: {tsv: getTsv(state)}
        },
        '*'
      )
    }

    state.suggestions.forEach(async (s, lineId) => {
      if (s.get('search') === 'start') {
        actions.setSuggestionsSearch({lineId, status: 'searching'})
        const suggestionsToRemove = (s.get('data') || immutable.List()).filter(
          x => x.getIn(['from', 0]) === 'description'
        )
        actions.removeSuggestions({lineId, suggestionsToRemove})
        const description = state.data.present.getIn([
          'lines',
          lineId,
          'description'
        ])
        await searchDescription(lineId, description, actions)
        actions.setSuggestionsSearch({lineId, status: 'done'})
      }
    })
  })
}

function getLines(state) {
  const linesMap = state.data.present
    .get('lines')
    .map(line => line.update('partNumbers', ps => ps.slice(0, -1)))
    .map(line => line.set('reference', line.get('reference') || ''))
  const order = state.data.present.get('order')
  return order.map(lineId => linesMap.get(lineId)).toJS()
}

function getTsv(state) {
  const lines = getLines(state)
  return oneClickBom.writeTSV(lines)
}

import immutableDiff from 'immutable-diff'
import immutable from 'immutable'
import oneClickBom from '1-click-bom'
import shortid from 'shortid'

import {findSuggestions, searchDescription} from './find_suggestions'
import {initialState, emptyPartNumber} from './state'
import {getPurchaseLines, getInStockLines, getAllOffers} from './bom'

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
    diff.map(async d => {
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
        actions.setSuggestionsStatus({lineId, status: 'loading'})
        suggestions = await findSuggestions(line, suggestions)
        actions.addSuggestions({lineId, suggestions})
        actions.setSuggestionsStatus({lineId, status: 'done'})
      }
      if (path.last() === 'description') {
        actions.setSuggestionsSearch({lineId, status: 'start'})
      }
    })
  )
}

export function subscribeEffects(store, actions) {
  let past = initialState.data
  store.subscribe(async () => {
    const state = store.getState()
    const present = state.data.present
    if (present !== past) {
      const diff = immutableDiff(past, present)
        .filter(d => {
          // ignore additions and removals of empty part numbers
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
        .reduce((prev, d) => {
          // de duplicate by line number
          const lineNumber = d.getIn(['path', 1])
          if (prev.find(x => x.getIn(['path', 1]) === lineNumber)) {
            return prev
          }
          return prev.push(d)
        }, immutable.List())
      past = present
      effects(diff, store, actions)
    }

    if (state.view.get('addingParts') === 'start') {
      const id = shortid()
      actions.setAddingParts('adding')
      window.postMessage(
        {
          from: 'page',
          message: 'bomBuilderAddToCart',
          value: {tsv: getPurchaseTsv(state), id}
        },
        '*'
      )
      window.addEventListener(
        'message',
        event => {
          if (
            event.data.message === 'bomBuilderResult' &&
            event.data.value.id === id
          ) {
            const {retailer, result} = event.data.value
            actions.addBuyPartsResult({retailer, result})
          }
        },
        false
      )
    }

    if (state.view.get('clearingCarts') === 'start') {
      const id = shortid()
      actions.setClearingCarts('clearing')
      window.postMessage(
        {
          from: 'page',
          message: 'bomBuilderClearCarts',
          value: {tsv: getPurchaseTsv(state), id}
        },
        '*'
      )
    }

    state.suggestions.forEach(async (s, lineId) => {
      const state = store.getState()
      if (state.suggestions.getIn([lineId, 'search']) === 'start') {
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

function getPurchaseTsv(state) {
  const offers = getAllOffers(state.suggestions)
  let lines = state.data.present.get('lines')
  const buyMultiplier = state.view.get('buyMultiplier')
  lines = getInStockLines(lines, offers, buyMultiplier)
  const preferred = state.view.get('preferredRetailer')
  lines = getPurchaseLines(preferred, lines)
  const order = state.data.present.get('order')
  const linesMap = lines
    .map(line => line.set('partNumbers', immutable.List()))
    .map(line => line.set('reference', line.get('reference') || ''))
    .map(line =>
      line.update('quantity', qty => {
        qty = Math.ceil(qty * buyMultiplier)
        const sku = line
          .get('retailers')
          .filter(p => p)
          .map((part, vendor) => immutable.Map({part, vendor}))
          .first()
        if (sku == null) {
          return qty
        }
        const offer = offers.get(sku)
        if (offer == null) {
          return qty
        }
        // adjust quantity if items are supplied in a multi pack
        const multi = offer.get('multipack_quantity')
        if (multi != null) {
          qty = Math.ceil(qty / multi)
        }
        // raise to minimum order quantity
        const moq = offer.get('moq')
        qty = Math.max(moq, qty)

        return qty
      })
    )
  lines = order.map(lineId => linesMap.get(lineId).set('id', lineId)).toJS()
  return oneClickBom.writeTSV(lines)
}

import immutableDiff from 'immutable-diff'
import immutable from 'immutable'
import shortid from 'shortid'

import {findSuggestions, searchDescription} from './find_suggestions'
import {initialState, emptyPartNumber} from './state'
import {getPurchaseLines, getInStockLines, getAllOffers} from './process_bom'
import {emptyRetailers} from './state'

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
          value: {purchase: getPurchase(state), id}
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
          value: {purchase: getPurchase(state), id}
        },
        '*'
      )
    }
    const p = Promise.all(
      state.suggestions.map(async (s, lineId) => {
        const state = store.getState()
        if (state.suggestions.getIn([lineId, 'search']) === 'start') {
          actions.setSuggestionsSearch({lineId, status: 'searching'})
          const suggestionsToRemove = (
            s.get('data') || immutable.List()
          ).filter(x => x.getIn(['from', 0]) === 'description')
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
    )
    if (state.view.get('autoFilling') === 'start') {
      actions.setAutoFilling('filling')
      actions.autoFillSuggestions()
      p.then(() => actions.setAutoFilling('done'))
    }
  })
}

function getPurchase(state) {
  const offers = getAllOffers(state.suggestions)
  let lines = state.data.present.get('lines')
  const buyMultiplier = state.view.get('buyMultiplier')
  const alwaysBuySkus = state.view.get('alwaysBuySkus')
  lines = getInStockLines(lines, offers, buyMultiplier, alwaysBuySkus)
  const preferred = state.view.get('preferredRetailer')
  lines = getPurchaseLines(preferred, lines, alwaysBuySkus, buyMultiplier)
  const order = state.data.present.get('order')
  const linesMap = lines.map(line =>
    line
      .update('retailers', r =>
        r.map((buy, vendor) => {
          const sku = immutable.Map({part: buy.get('part'), vendor})
          let quantity = buy.get('quantity')
          if (quantity === 0) {
            return buy
          }
          const offer = offers.get(sku)
          if (offer != null) {
            // adjust quantity if items are supplied in a multi pack
            const multi = offer.get('multipack_quantity')
            if (multi != null) {
              quantity = Math.ceil(quantity / multi)
            }
            // raise to minimum order quantity
            const moq = offer.get('moq')
            quantity = Math.max(moq, quantity)
          }
          return buy.set('quantity', quantity)
        })
      )
      .remove('partNumbers')
      .remove('fitted')
      .remove('quantity')
      .remove('description')
      .update('reference', r => r || '')
  )
  lines = order.map(lineId => linesMap.get(lineId).set('id', lineId))
  let purchase = lines.reduce((prev, line) => {
    line.get('retailers').forEach((buy, vendor) => {
      if (buy.get('part') && buy.get('quantity') > 0) {
        prev = prev.update(vendor, l =>
          l.push(buy.set('reference', line.get('reference')))
        )
      }
    })
    return prev
  }, emptyRetailers.map(v => immutable.List()))
  purchase = purchase.filter(parts => parts.size > 0)
  return purchase.toJS()
}

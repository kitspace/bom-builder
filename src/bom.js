import * as immutable from 'immutable'
import * as reselect from 'reselect'

import {emptyRetailers} from './state'

import * as selectors from './selectors'

export function getLines(state) {
  const linesMap = state
    .get('lines')
    .map(line => line.update('partNumbers', ps => ps.slice(0, -1)))
    .map(line => line.set('reference', line.get('reference') || ''))
  const order = state.get('order')
  return order.map(lineId => linesMap.get(lineId))
}

export function retailerSelectionNumbers(lines) {
  return lines.reduce((prev, line) => {
    line.get('retailers').forEach((sku, retailer) => {
      if (sku) {
        prev = prev.update(retailer, x => x + 1)
      }
    })
    return prev
  }, emptyRetailers.map(x => 0))
}

export function priorityOfRetailers(lines) {
  return retailerSelectionNumbers(lines)
    .sort((v1, v2) => v2 - v1)
    .keySeq()
    .toList()
}

export function reduceBom(lines, preferred, done = immutable.List()) {
  return lines.map(line => {
    const part = line.getIn(['retailers', preferred])
    if (part) {
      return line.update('retailers', retailers => {
        return retailers.map((v, k) => {
          if (k === preferred || done.includes(k)) {
            return v
          }
          return ''
        })
      })
    }
    return line
  })
}

export function makeAllOffersSelector(suggestionsSelector) {
  const loadingSelector = selectors.makeSuggestionsLoading()
  return reselect.createSelector(
    [suggestionsSelector, loadingSelector],
    (suggestions, loading) => {
      if (loading) {
        return immutable.Map()
      }
      return suggestions
        .map(x => x.get('data'))
        .reduce((offers, suggestions) => {
          suggestions = suggestions || immutable.List()
          return suggestions.reduce(
            (offers, part) =>
              part
                .get('offers')
                .reduce(
                  (offers, offer) => offers.set(offer.get('sku'), offer),
                  offers
                ),
            offers
          )
        }, immutable.Map())
    }
  )
}

export function makeInStockLinesSelector(linesSelector, allOffersSelector) {
  return reselect.createSelector(
    [linesSelector, allOffersSelector],
    (lines, offers) => {
      return lines.map(line =>
        line.update('retailers', retailers =>
          retailers.map((part, vendor) => {
            if (part) {
              const sku = immutable.Map({part, vendor})
              const offer = offers.get(sku)
              let in_stock, stock_location
              if (offer) {
                in_stock = offer.get('in_stock_quantity')
                stock_location = offer.get('stock_location')
              }
              if (
                in_stock &&
                in_stock >= line.get('quantity') &&
                stock_location !== 'US'
              ) {
                return part
              }
            }
            return ''
          })
        )
      )
    }
  )
}

export function makePurchaseLinesSelector(
  preferredSelector,
  linesSelector,
  previewBuySelector,
  suggestionsSelector
) {
  const allOffersSelector = makeAllOffersSelector(suggestionsSelector)
  const inStockLinesSelector = makeInStockLinesSelector(
    linesSelector,
    allOffersSelector
  )
  return reselect.createSelector(
    [preferredSelector, inStockLinesSelector, previewBuySelector],
    (preferred, lines, previewBuy) => {
      if (previewBuy) {
        lines = reduceBom(lines, preferred)
        const priority = priorityOfRetailers(lines).filter(r => r !== preferred)
        const {reducedLines} = priority.reduce(
          ({reducedLines, done}, retailer) => {
            reducedLines = reduceBom(reducedLines, retailer, done)
            done = done.push(retailer)
            return {reducedLines, done}
          },
          {reducedLines: lines, done: immutable.List.of(preferred)}
        )
        return reducedLines
      }
    }
  )
  return immutable.Map()
}

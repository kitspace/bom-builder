import * as immutable from 'immutable'
import * as reselect from 'reselect'
import memoizeOne from 'memoize-one'

import {emptyRetailers, fitPartNumbers} from './state'
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
  return lines.reduce((prev, line, lineId) => {
    line.get('retailers').forEach((sku, retailer) => {
      if (typeof sku === 'string') {
        if (sku) {
          prev = prev.update(retailer, x => x + 1)
        }
      } else if (sku.get('quantity') > 0) {
        prev = prev.update(retailer, x => x + 1)
      }
    })
    return prev
  }, emptyRetailers.map(x => 0))
}

export function autoFillSuggestions(state) {
  const present = state.data.present.update('lines', lines =>
    fitPartNumbers(
      lines.map((line, lineId) => {
        const retailerSuggestions =
          state.suggestions.getIn([lineId, 'retailers']) || immutable.Map()
        line = line.update('retailers', retailers => {
          return retailers.map((part, vendor) => {
            const vendorSuggestions =
              retailerSuggestions.get(vendor) || immutable.List()
            if (part) {
              const existing = vendorSuggestions.find(
                s => s.getIn(['sku', 'part']) === part
              )
              if (existing && existing.checkColor === 'green') {
                return part
              }
            }
            const s = vendorSuggestions.first()
            if (s && /match/.test(s.get('type'))) {
              return s.getIn(['sku', 'part'])
            }
            return part
          })
        })
        return line.update('partNumbers', ps => {
          const suggestions = (
            state.suggestions.getIn([lineId, 'data']) || immutable.List()
          ).filter(s => !ps.find(p => p.equals(s.get('mpn'))))
          return ps
            .slice(0, -1)
            .concat(
              suggestions
                .filter(
                  s =>
                    s.get('type') === 'match' || s.get('type') === 'cpl_match'
                )
                .map(s => s.get('mpn'))
            )
        })
      })
    )
  )
  if (!present.equals(state.data.present)) {
    const past = state.data.past.concat([state.data.present])
    const data = Object.assign({}, state.data, {present, past, future: []})
    return Object.assign({}, state, {data})
  }
  return state
}

export function priorityOfRetailers(lines, alwaysBuySkus) {
  const fromSelection = retailerSelectionNumbers(lines)
    .sort((v1, v2) => v2 - v1)
    .keySeq()
    .toList()
  const numberOfAlwaysBuy = alwaysBuySkus.reduce((prev, skus) => {
    if (skus != null) {
      skus.forEach((_, sku) => {
        prev = prev.update(sku.get('vendor'), x => (x || 0) + 1)
      })
    }
    return prev
  }, immutable.Map())
  return fromSelection.sort(
    (r1, r2) =>
      (numberOfAlwaysBuy.get(r2) || 0) - (numberOfAlwaysBuy.get(r1) || 0)
  )
}

export function reduceBom(
  lines,
  preferred,
  alwaysBuySkus,
  buyExtraLines,
  buyExtraPercent,
  buyMultiplier,
  done = immutable.List()
) {
  return lines.map((line, lineId) => {
    const partAndQty = line.getIn(['retailers', preferred])
    const alwaysBuyThisLine =
      alwaysBuySkus.get(lineId) != null && alwaysBuySkus.get(lineId).size > 0
    const buyExtra = buyExtraLines.get(lineId) ? buyExtraPercent / 100 : 0
    const desiredQuantity = Math.ceil(
      line.get('quantity') * buyMultiplier +
        line.get('quantity') * buyMultiplier * buyExtra
    )
    if (partAndQty != null && partAndQty.get('quantity') > 0) {
      return line.update('retailers', retailers => {
        return retailers.map((v, k) => {
          if (v == null) {
            return immutable.Map({part: '', quantity: 0})
          }
          if (alwaysBuyThisLine) {
            const sku = immutable.Map({vendor: k, part: v.get('part')})
            return alwaysBuySkus.getIn([lineId, sku])
              ? v.set('quantity', desiredQuantity)
              : v.set('quantity', 0)
          }
          if (k === preferred || done.includes(k)) {
            return v
          }
          // spread the quantity out over several parts if we need to
          const total = done.reduce(
            (prev, name) => prev + retailers.getIn([name, 'quantity']),
            retailers.getIn([preferred, 'quantity'])
          )
          if (total >= desiredQuantity) {
            return v.set('quantity', 0)
          }
          return v.update('quantity', quantity =>
            Math.min(quantity, desiredQuantity - total)
          )
        })
      })
    }
    return line
  })
}

let prevAllOffers
export function getAllOffers(suggestions) {
  const allOffers = suggestions
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
  if (prevAllOffers && allOffers.equals(prevAllOffers)) {
    return prevAllOffers
  }
  prevAllOffers = allOffers
  return allOffers
}

export function makeAllOffersSelector(suggestionsSelector) {
  return reselect.createSelector(
    [suggestionsSelector],
    getAllOffers
  )
}

export const getInStockLines = memoizeOne(
  (
    lines,
    offers,
    buyExtraLines,
    buyExtraPercent,
    buyMultiplier,
    alwaysBuySkus
  ) => {
    return lines.map((line, lineId) => {
      const buyExtra = buyExtraLines.get(lineId) ? buyExtraPercent / 100 : 0
      return line.update('retailers', retailers =>
        retailers.map((part, vendor) => {
          const sku = immutable.Map({part, vendor})
          const desiredQuantity = Math.ceil(
            line.get('quantity') * buyMultiplier +
              line.get('quantity') * buyMultiplier * buyExtra
          )
          if (alwaysBuySkus.getIn([lineId, sku])) {
            return immutable.Map({part: part || '', quantity: desiredQuantity})
          }
          const offer = offers.get(sku)
          let in_stock = 0
          if (offer) {
            in_stock = offer.get('in_stock_quantity')
            if (offer.get('multipack_quantity') != null) {
              in_stock *= offer.get('multipack_quantity')
            }
            if (offer.get('stock_location') === 'US') {
              in_stock = 0
            }
          }
          const quantity = Math.min(desiredQuantity, in_stock)
          return immutable.Map({part: part || '', quantity})
        })
      )
    })
  }
)

export function makeInStockLinesSelector(linesSelector, allOffersSelector) {
  return reselect.createSelector(
    [
      linesSelector,
      allOffersSelector,
      selectors.buyExtraLines,
      selectors.buyExtraPercent,
      selectors.buyMultiplier,
      selectors.alwaysBuySkus
    ],
    getInStockLines
  )
}

export const getPurchaseLines = memoizeOne(
  (
    preferred,
    lines,
    alwaysBuySkus,
    buyExtraLines,
    buyExtraPercent,
    buyMultiplier
  ) => {
    lines = reduceBom(
      lines,
      preferred,
      alwaysBuySkus,
      buyExtraLines,
      buyExtraPercent,
      buyMultiplier
    )
    const priority = priorityOfRetailers(lines, alwaysBuySkus).filter(
      r => r !== preferred
    )
    const {reducedLines} = priority.reduce(
      ({reducedLines, done}, retailer) => {
        reducedLines = reduceBom(
          reducedLines,
          retailer,
          alwaysBuySkus,
          buyExtraLines,
          buyExtraPercent,
          buyMultiplier,
          done
        )
        done = done.push(retailer)
        return {reducedLines, done}
      },
      {reducedLines: lines, done: immutable.List.of(preferred)}
    )
    return reducedLines
  }
)

export function makePurchaseLinesSelector(
  preferredSelector,
  linesSelector,
  suggestionsSelector
) {
  const allOffersSelector = makeAllOffersSelector(suggestionsSelector)
  const inStockLinesSelector = makeInStockLinesSelector(
    linesSelector,
    allOffersSelector
  )
  return reselect.createSelector(
    [
      preferredSelector,
      inStockLinesSelector,
      selectors.alwaysBuySkus,
      selectors.buyExtraLines,
      selectors.buyExtraPercent,
      selectors.buyMultiplier
    ],
    getPurchaseLines
  )
}

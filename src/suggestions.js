import * as immutable from 'immutable'

function getCheckColor(desiredQuantity, s) {
  let inStock = s.get('in_stock_quantity')
  if (s.get('multipack_quantity') != null) {
    inStock *= s.get('multipack_quantity')
  }
  if (desiredQuantity <= inStock) {
    if (!s.get('stock_location') || s.get('stock_location') === 'UK') {
      return 'green'
    }
    return 'orange'
  }
  return inStock === 0 ? 'red' : 'orange'
}

export function computeSuggestionsForRetailer(suggestions, retailer, line, buyMultiplier) {
  const desiredQuantity = Math.ceil(line.get('quantity') * buyMultiplier)
  return (suggestions || immutable.List())
    .flatMap(s => {
      const type = s.get('type')
      const mpn = s.get('mpn')
      const offers = s
        .get('offers')
        .filter(o => o.getIn(['sku', 'vendor']) === retailer)
      return offers.map(o =>
        o.merge({
          partData: s,
          type,
          mpn,
          checkColor: getCheckColor(desiredQuantity, o)
        })
      )
    })
    .sort((a, b) => {
      const [aType, bType] = [a.get('type'), b.get('type')]
      const [aCheck, bCheck] = [a.get('checkColor'), b.get('checkColor')]
      const [aQty, bQty] = [
        a.get('in_stock_quantity'),
        b.get('in_stock_quantity')
      ]
      if (
        /match/.test(aType) &&
        /match/.test(bType) &&
        aCheck === 'green' &&
        bCheck === 'green'
      ) {
        const [aMoq, bMoq] = [a.get('moq'), b.get('moq')]
        const [aDiff, bDiff] = [
          Math.abs(aMoq - desiredQuantity),
          Math.abs(bMoq - desiredQuantity)
        ]
        if (aDiff < bDiff) {
          return -1
        }
        if (aDiff > bDiff) {
          return 1
        }
      }
      if (/match/.test(aType) && /match/.test(bType) && bCheck !== 'green') {
        return -1
      }
      if (/match/.test(aType) && /match/.test(bType) && aCheck !== 'green') {
        return 1
      }
      if (/match/.test(aType) && bType === 'search' && aCheck === 'green') {
        return -1
      }
      if (aType === 'search' && /match/.test(bType) && bCheck === 'green') {
        return 1
      }
      if (aCheck === 'green' && bCheck !== 'green') {
        return -1
      }
      if (aCheck !== 'green' && bCheck === 'green') {
        return 1
      }
      if (aQty > bQty) {
        return -1
      }
      if (aQty < bQty) {
        return 1
      }
      return 0
    })
}

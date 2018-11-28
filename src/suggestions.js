function getCheckColor(desiredQuantity, s) {
  if (desiredQuantity <= s.get('in_stock_quantity')) {
    if (!s.get('stock_location') || s.get('stock_location') === 'UK') {
      return 'green'
    } else {
      return 'orange'
    }
  } else {
    return s.get('in_stock_quantity') === 0 ? 'red' : 'orange'
  }
}

export function computeSuggestionsForRetailer(suggestions, retailer, line) {
  const desiredQuantity = line.get('quantity')
  return suggestions
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
        aType === 'match' &&
        bType === 'match' &&
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
      if (aType === 'match' && bType === 'match' && bCheck !== 'green') {
        return -1
      }
      if (aType === 'match' && bType === 'match' && aCheck !== 'green') {
        return 1
      }
      if (aType === 'match' && bType !== 'match' && aCheck === 'green') {
        return -1
      }
      if (aType !== 'match' && bType === 'match' && bCheck === 'green') {
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

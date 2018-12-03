import immutable from 'immutable'

import {emptyRetailers} from './state'

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

export function reduceBom(lines, preferred, stock, done = immutable.List()) {
  return lines.map(line => {
    const part = line.getIn(['retailers', preferred])
    if (part) {
      const sku = immutable.Map({part, vendor: preferred})
      const in_stock = stock.get(sku)
      const desired = line.get('quantity')
      if (in_stock >= desired) {
        return line.update('retailers', retailers => {
          return retailers.map((v, k) => {
            if (done.includes(k)) {
              return v
            }
            if (k === preferred) {
              if (in_stock >= desired) {
                return v
              }
            }
            return ''
          })
        })
      }
    }
    return line
  })
}

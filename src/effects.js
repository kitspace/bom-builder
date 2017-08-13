const immutableDiff = require('immutable-diff').default
const getPartinfo = require('./get_partinfo')
const {
  initialState,
  changed,
} = require('./state')

function effects(diff, state, actions) {
  diff.forEach(d => {
    const op = d.get('op')
    const path = d.get('path')
    const value = d.get('value')
    if (path.size === 2 && op === 'add' && path.get(0) === 'lines') {
      findSuggestions(value, actions)
    } else if (path.size === 5 && path.includes('partNumbers')
      && typeof path.get(3) === 'number') {
      const line = state.data.present.getIn(path.slice(0, 2))
      findSuggestions(line, actions)
    }
  })
}

function subscribeEffects(store, actions) {
  let prev_state = initialState
  store.subscribe(() => {
    const state = store.getState()
    if (changed(prev_state, state)) {
      effects(immutableDiff(prev_state.data.present, state.data.present), state, actions)
      prev_state = state
    }
  })
}

function findSuggestions(line, actions) {
  const partNumbers = line.get('partNumbers')
  const id = line.get('id')

  const needsSuggestions = partNumbers.some(p => {
    return p.get('part') === ''
  })

  if (needsSuggestions) {
    const suggestionSkus = line.get('suggestions').flatMap(s => {
      return s.get('offers').map(o => o.get('sku'))
    })
    const skus = line.get('retailers').entrySeq().map(([vendor, part]) => {
      if (vendor === 'Digikey') {
        vendor = 'Digi-Key'
      }
      if (part !== '') {
        return {vendor, part}
      }
      return null
    })
      .filter(x => x != null)
      .filter(part => !suggestionSkus.includes(part))
    const ps = skus.map(sku => {
      return getPartinfo(sku)
    }).map(p => {
      return p.then(part => {
        return actions.addSuggestion({id, part})
      })
    })
    return Promise.all(ps)
  }
}

module.exports = {subscribeEffects}

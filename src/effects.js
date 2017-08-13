const immutableDiff = require('immutable-diff').default
const getPartinfo = require('./get_partinfo')
const {
  initialState,
  changed,
} = require('./state')

function effects(diff, state) {
  diff.forEach(d => {
    const op = d.get('op')
    const path = d.get('path')
    const value = d.get('value')
    if (path.size === 2 && op === 'add' && path.get(0) === 'lines') {
      findSuggestions(value)
    } else if (path.size === 6 && path.includes('partNumbers')
      && path.includes('selected') && typeof path.get(3) === 'number') {
      const line = state.data.present.getIn(path.slice(0, 4))
      findSuggestions(line)
    }
  })
}

function subscribeEffects(store, actions) {
  let prev_state = initialState
  store.subscribe(() => {
    const state = store.getState()
    if (changed(prev_state, state)) {
      effects(immutableDiff(prev_state.data.present, state.data.present), state)
      prev_state = state
    }
  })
}

function findSuggestions(line) {
  const partNumbers = line.get('partNumbers')

  const needsSuggestions = partNumbers.some(p => {
    return p.get('selected').get('part') === ''
  })

  if (needsSuggestions) {
    const skus = line.get('retailers').entrySeq().map(([vendor, part]) => {
      if (part !== '') {
        return {vendor, part}
      }
    }).filter(x => x)
    const ps = skus.map(sku => getPartinfo.post(sku))
    Promise.all(ps).then(ps => console.log(ps))
  }
}

module.exports = {subscribeEffects}

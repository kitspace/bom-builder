const immutable = require('immutable')
const getPartinfo = require('./get_partinfo')

function findSuggestions(line, suggestions, actions) {
  const partNumbers = line.get('partNumbers')
  const id = line.get('id')


  let suggestionSkus = immutable.List()
  if (suggestions) {
    suggestionSkus = suggestions.flatMap(s => {
      return s.get('offers').map(offer => offer.get('sku'))
    })
  }


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

module.exports = {findSuggestions}

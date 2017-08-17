const immutable = require('immutable')
const getPartinfo = require('./get_partinfo')

function fromRetailers(retailers, suggestions) {
  let suggestionSkus = immutable.List()
  if (suggestions) {
    suggestionSkus = suggestions.flatMap(s => {
      return s.get('offers').map(offer => offer.get('sku'))
    })
  }

  const skus = retailers.entrySeq().map(([vendor, part]) => {
    if (vendor === 'Digikey') {
      vendor = 'Digi-Key'
    } else if (vendor === 'RS') {
      vendor = 'RS Components'
    }
    if (part !== '') {
      return {vendor, part}
    }
    return null
  })
    .filter(x => x != null)
    .filter(part => !suggestionSkus.includes(part))

  return Promise.all(skus.map(getPartinfo))
}

function fromDescription(description, suggestions) {
  return getPartinfo(description)
}

async function findSuggestions(line, suggestions, actions) {
  const id = line.get('id')
  let parts = await fromRetailers(line.get('retailers'), suggestions)
  if (parts.length === 0) {
    parts = await fromDescription(line.get('description'), suggestions)
  }
  parts.map(part => actions.addSuggestion({id, part}))
}

export {findSuggestions}

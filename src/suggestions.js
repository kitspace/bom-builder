const immutable = require('immutable')
const getPartinfo = require('./get_partinfo')

function fromRetailer(sku, suggestions) {
  const suggestionSkus = suggestions.flatMap(s => {
    return s.get('offers').map(offer => offer.get('sku'))
  })

  if (suggestionSkus.includes(sku)) {
    return Promise.resolve(null)
  }
  return getPartinfo(sku.toJS())
}

function fromPartNumber(partNumber, suggestions) {
  const suggestionMpns = suggestions.flatMap(s => s.get('partNumbers'))
  if (suggestionMpns.includes(partNumber)) {
    return Promise.resolve(null)
  }
  return getPartinfo(partNumber.toJS())
}

function fromDescription(description) {
  return getPartinfo(description)
    .then(ps => ps || [])
    .then(ps => ps.filter(x => x != null))
    .then(ps => immutable.fromJS(ps))
    .then(ps => ps.map(p => p.set('from', immutable.List.of('description'))))
}

async function findSuggestions(lineId, line, suggestions=immutable.List(), actions) {
  if (line == null) {
    return
  }
  await Promise.all(line.get('partNumbers').map(async (partNumber, i) => {
    const part = await fromPartNumber(partNumber, suggestions)
    if (part != null) {
      part.from = ['partNumbers', i, 'part']
      suggestions = suggestions.push(immutable.fromJS(part))
    }
  }))
  await Promise.all(line.get('retailers').entrySeq().map(async ([vendor, part]) => {
    if (part == null) {
      return
    }
    const result = await fromRetailer(immutable.Map({vendor, part}), suggestions)
    if (result != null) {
      result.from = ['retailers', vendor]
      suggestions = suggestions.push(immutable.fromJS(result))
    }
  }))

  const ds = await fromDescription(line.get('description'))
  if (ds) {
    suggestions = suggestions.concat(ds)
  }
  //make unique
  suggestions = suggestions.reduce((prev, p) => {
    if (prev.map(s => s.get('mpn')).includes(p.get('mpn'))) {
      if (p.get('type') === 'match') {
        prev = prev.filter(s => !s.get('mpn').equals(p.get('mpn')))
        return prev.push(p)
      }
      return prev
    }
    return prev.push(p)
  }, immutable.List())

  //put all matches at the start and searches at the end
  suggestions = suggestions.sort(s => {
    if (s.get('type') === 'match') {
      return -1
    }
    return 1
  })

  actions.setSuggestions({lineId, suggestions})
}

export {findSuggestions}

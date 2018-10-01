import immutable from 'immutable'
import getPartinfo from './get_partinfo'

function fromRetailer(sku, suggestions) {
  const existing = suggestions.find(s =>
    s.get('offers').some(offer => offer.get('sku').equals(sku))
  )

  if (existing) {
    if (existing.get('type') === 'match') {
      return Promise.resolve(existing)
    } else {
      return Promise.resolve(
        existing
          .set('type', 'match')
          .set('from', immutable.List.of('retailers', sku.get('vendor')))
      )
    }
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

async function findSuggestions(
  lineId,
  line,
  suggestions = immutable.List(),
  actions
) {
  if (line == null) {
    return
  }
  actions.setSuggestionsStatus({lineId, status: 'loading'})
  await Promise.all(
    line.get('partNumbers').map(async (partNumber, i) => {
      const part = await fromPartNumber(partNumber, suggestions)
      if (part != null) {
        part.from = ['partNumbers', i]
        suggestions = suggestions.push(immutable.fromJS(part))
      }
    })
  )
  await Promise.all(
    line
      .get('retailers')
      .entrySeq()
      .map(async ([vendor, part]) => {
        if (part == null) {
          return
        }
        const result = await fromRetailer(
          immutable.Map({vendor, part}),
          suggestions
        )
        if (result != null) {
          result.from = ['retailers', vendor]
          suggestions = suggestions.push(immutable.fromJS(result))
        }
      })
  )

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

  //try and and minimize changes in the order by sorting according to part
  suggestions = suggestions.sort((a, b) => {
    const [p1, p2] = [a.getIn(['mpn', 'part']), b.getIn(['mpn', 'part'])]
    if (p1 > p2) {
      return 1
    }
    if (p1 < p2) {
      return -1
    }
    return 0
  })

  //put all matches at the start and searches at the end
  suggestions = suggestions.sort((a, b) => {
    const [t1, t2] = [a.get('type'), b.get('type')]
    if (t1 === 'match' && t2 === 'match') {
      return 0
    }
    if (t1 === 'match') {
      return -1
    }
    if (t2 === 'match') {
      return 1
    }
    return 0
  })

  actions.setSuggestions({lineId, suggestions})
}

export {findSuggestions}

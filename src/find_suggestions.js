import immutable from 'immutable'
import getPartinfo from './get_partinfo'

function fromRetailer(sku, suggestions) {
  const existing = suggestions.find(s =>
    s.get('offers').some(offer => offer.get('sku').equals(sku))
  )

  if (existing) {
    return Promise.resolve(
      existing
        .set('type', 'match')
        .set('from', immutable.List.of('retailers', sku.get('vendor')))
    )
  }

  return getPartinfo(sku.toJS())
}

async function fromPartNumber(partNumber, suggestions) {
  const existing = suggestions.find(s => s.get('mpn').equals(partNumber))
  if (existing) {
    return existing.set('type', 'match')
  }
  return immutable.fromJS(await getPartinfo(partNumber.toJS()))
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
      let part = await fromPartNumber(partNumber, suggestions)
      if (part != null) {
        part = part
          .set('from', immutable.List.of('partNumbers', i))
          .set('type', 'match')
        suggestions = suggestions.push(part)
      }
    })
  )

  suggestions = makeUniform(suggestions)
  actions.setSuggestions({lineId, suggestions})

  await Promise.all(
    line
      .get('retailers')
      .entrySeq()
      .map(async ([vendor, part]) => {
        if (!part) {
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

  suggestions = makeUniform(suggestions)
  actions.setSuggestions({lineId, suggestions})

  const ds = await fromDescription(line.get('description'))
  if (ds) {
    suggestions = suggestions.concat(ds)
  }

  suggestions = makeUniform(suggestions)
  actions.setSuggestions({lineId, suggestions})
  actions.setSuggestionsStatus({lineId, status: 'done'})
}

function makeUniform(suggestions) {
  suggestions = suggestions.filter(x => x)
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

  return suggestions
}

export {findSuggestions}

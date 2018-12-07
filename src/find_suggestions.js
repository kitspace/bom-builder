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

  actions.addSuggestions({lineId, suggestions})

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

  actions.addSuggestions({lineId, suggestions})
  actions.setSuggestionsStatus({lineId, status: 'done'})
}

export async function searchDescription(lineId, description, actions) {
  actions.setSuggestionsSearch({lineId, status: 'searching'})

  let suggestions = immutable.List()
  const ds = await fromDescription(description)
  if (ds) {
    suggestions = suggestions.concat(ds)
  }

  actions.addSuggestions({lineId, suggestions})
  actions.setSuggestionsSearch({lineId, status: 'done'})
}

export {findSuggestions}

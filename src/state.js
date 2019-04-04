import immutable from 'immutable'
import oneClickBom from '1-click-bom'
import * as redux from 'redux'
import * as reduxUndo from 'redux-undo-immutable-js'
import {computeSuggestionsForRetailer} from './suggestions'

const retailer_list = oneClickBom
  .getRetailers()
  .filter(r => r !== 'Rapid' && r !== 'Newark')

function IdMaker() {
  this.id = 0
  return () => this.id++
}

const makeId = new IdMaker()

export const emptyPartNumber = immutable.Map({
  part: '',
  manufacturer: ''
})

export const emptyRetailers = immutable.Map(retailer_list.map(r => [r, '']))

export const emptyLine = immutable.Map({
  reference: '',
  quantity: 1,
  description: '',
  partNumbers: immutable.List.of(emptyPartNumber),
  retailers: emptyRetailers
})

export const initialState = {
  data: immutable.fromJS({
    lines: {},
    order: [],
    sortedBy: [null, null]
  }),
  view: immutable.fromJS({
    partNumbersExpanded: [],
    focus: [null, null],
    editable: true,
    mpnPopupExpanded: false,
    skuPopupExpanded: false,
    addingParts: false,
    clearingCarts: false,
    autoFilling: false,
    extensionPresent: false,
    preferredRetailer: 'Farnell',
    popupFocus: [null, null],
    buyPartsMessages: [],
    suggestionsStatus: {},
    buyMultiplier: 1,
    alwaysBuySkus: {},
    previewBuy: false
  }),
  suggestions: immutable.Map()
}

function fitPartNumbers(lines) {
  lines = lines.map(line =>
    line.update('partNumbers', ps =>
      ps
        .filter(p => !p.equals(emptyPartNumber))
        .concat(immutable.List.of(emptyPartNumber))
    )
  )
  const requiredSize =
    lines
      .map(line => {
        const partNumbers = line.get('partNumbers') || immutable.List()
        return partNumbers.findLastIndex(p => !p.equals(emptyPartNumber))
      })
      .max() + 3
  return lines.map(line => {
    return line.update('partNumbers', ps => {
      ps = ps || immutable.List()
      while (ps.size < requiredSize) {
        ps = ps.push(emptyPartNumber)
      }
      return ps.slice(0, requiredSize)
    })
  })
}

const linesActions = {
  initEmptyLine(state) {
    return this.addEmptyLine(state)
  },
  addEmptyLine(state) {
    const id = makeId()
    const lines = state.get('lines').set(id, emptyLine)
    const order = state.get('order').push(id)
    return state.merge({lines, order})
  },
  removeField(state, focus) {
    const lineId = focus.get(0)
    const field = focus.get(1)
    let empty = field.get(0) === 'quantity' ? 1 : ''
    if (field.get(0) === 'partNumbers' && field.size === 2) {
      empty = emptyPartNumber
    }
    state = state.setIn(immutable.List.of('lines', lineId).concat(field), empty)
    return state.update('lines', fitPartNumbers)
  },
  remove(state, focus) {
    const lineId = focus.get(0)
    const field = focus.get(1)
    if (field == null) {
      return this.removeLine(state, lineId)
    } else {
      return this.removeField(state, focus)
    }
  },
  removeLine(state, lineId) {
    let lines = state.get('lines').remove(lineId)
    const order = state.get('order').filter(x => x !== lineId)
    lines = fitPartNumbers(lines)
    return state.merge({lines, order})
  },
  sortBy(state, header) {
    let lines = immutable.List(
      state
        .get('lines')
        .map((l, k) => l.set('id', k))
        .values()
    )
    if (retailer_list.includes(header)) {
      lines = lines.sortBy(line =>
        line
          .get('retailers')
          .get(header)
          .toLowerCase()
      )
    } else if (typeof header === 'object') {
      //header can be an array meaning we want to sort by mpn or manufacturer
      //e.g. ['manufacturer', 0]
      lines = lines.sortBy(line => {
        const field = line.get('partNumbers').get(header[1])
        if (field) {
          return field.get(header[0]).toLowerCase()
        }
        return ''
      })
      header = `${header[0]}${header[1]}`
    } else if (header === 'quantity') {
      lines = lines.sortBy(line => line.get('quantity')).reverse()
    } else {
      lines = lines.sortBy(line => line.get(header).toLowerCase())
    }
    let sortedBy = state.get('sortedBy')
    if (sortedBy.get(0) === header && sortedBy.get(1) === 'forward') {
      lines = lines.reverse()
      sortedBy = immutable.List.of(header, 'reverse')
    } else {
      sortedBy = immutable.List.of(header, 'forward')
    }
    const order = lines.map(l => l.get('id'))
    return state.merge({order, sortedBy})
  }
}

const viewActions = {
  toggleAlwaysBuyHere(state, {lineId, sku}) {
    return state.updateIn(['alwaysBuySkus', lineId], alwaysBuySkus => {
      if (alwaysBuySkus == null) {
        return immutable.Map([[sku, true]])
      }
      const existing = alwaysBuySkus.get(sku)
      if (existing) {
        alwaysBuySkus = alwaysBuySkus.remove(sku)
        if (alwaysBuySkus.size === 0) {
          return null
        }
        return alwaysBuySkus
      } else {
        return alwaysBuySkus.set(sku, true)
      }
    })
  },
  setFocus(state, location) {
    return state.set('focus', immutable.fromJS(location))
  },
  setPopupFocus(state, location) {
    return state.set('popupFocus', immutable.fromJS(location))
  },
  setPreviewBuy(state, value) {
    return state.set('previewBuy', value)
  },
  setMpnPopupExpanded(state, isExpanded) {
    return state.set('mpnPopupExpanded', isExpanded)
  },
  setSkuPopupExpanded(state, isExpanded) {
    return state.set('skuPopupExpanded', isExpanded)
  },
  setEditable(state, value) {
    return state.set('editable', value)
  },
  togglePartNumbersExpanded(state, n) {
    return state.updateIn(['partNumbersExpanded', n], expanded => !expanded)
  },
  loseFocus(state, focusToLose) {
    focusToLose = immutable.fromJS(focusToLose)
    if (state.get('popupFocus').equals(focusToLose)) {
      return state
    }
    return state.update('focus', focus => {
      if (focus.equals(focusToLose)) {
        return immutable.List.of(null, null)
      }
      return focus
    })
  },
  registerExtension(state) {
    if (state.get('extensionPresent')) {
      return state
    }
    return state.set('extensionPresent', true)
  },
  setAddingParts(state, value) {
    return state.set('addingParts', value)
  },
  setClearingCarts(state, value) {
    return state.set('clearingCarts', value)
  },
  setPreferredRetailer(state, value) {
    return state.set('preferredRetailer', value)
  },
  setSuggestionsStatus(state, {lineId, status}) {
    return state.setIn(['suggestionsStatus', lineId, 'matching'], status)
  },
  addBuyPartsResult(state, {retailer, result}) {
    return state.update('buyPartsMessages', messages => {
      messages = messages.concat(
        result.fails.map(({part, reference, quantity}) => {
          return immutable.fromJS({
            sku: {part, vendor: retailer},
            reference,
            id: makeId(),
            quantity
          })
        })
      )
      if (!result.success && result.fails.length === 0) {
        messages = messages.push(immutable.fromJS({retailer}))
      }
      return messages
    })
  },
  removeBuyPartsMessage(state, id) {
    return state.update('buyPartsMessages', messages => {
      return messages.filter(m => m.get('id') !== id)
    })
  }
}

function makeUniform(suggestions) {
  suggestions = suggestions.filter(x => x)
  //make unique
  suggestions = suggestions.reduce((prev, p) => {
    if (prev.map(s => s.get('mpn')).includes(p.get('mpn'))) {
      if (p.get('type') === 'match' || p.get('type') === 'cpl_match') {
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
    if (/match/.test(t1) && /match/.test(t2)) {
      return 0
    }
    if (/match/.test(t1)) {
      return -1
    }
    if (/match/.test(t2)) {
      return 1
    }
    return 0
  })

  return suggestions
}

const rootActions = {
  setState(_, state) {
    return makeImmutable(state)
  },
  clearAll(state) {
    const id = makeId()
    const lines = immutable.Map().set(id, emptyLine)
    const order = immutable.List.of(id)
    const past = state.data.past.concat([state.data.present])
    const present = state.data.present.merge({lines, order})
    const suggestions = immutable
      .Map()
      .set(id, immutable.Map({status: 'done', data: immutable.List()}))
    return Object.assign({}, state, {
      data: Object.assign({}, state.data, {past, present}),
      suggestions
    })
  },
  initializeLines(state, lines) {
    lines = immutable.Map(lines.map(l => [makeId(), immutable.fromJS(l)]))
    lines = fitPartNumbers(lines)
    if (lines.length < 1) {
      return state
    }
    const order = immutable.List(lines.keys())
    const present = state.data.present.merge({lines, order})
    const suggestions = immutable.Map(
      order.map(lineId => [
        lineId,
        immutable.Map({
          status: 'done',
          data: immutable.List(),
          retailers: immutable.Map()
        })
      ])
    )
    const l = lines.first()
    let view = initialState.view
    if (l != null) {
      view = view.set(
        'partNumbersExpanded',
        l.get('partNumbers').map(x => false)
      )
    }
    return Object.assign({}, state, {
      suggestions,
      data: Object.assign({}, state.data, {present}),
      view
    })
  },
  setAutoFilling(state, value) {
    const view = state.view.set('autoFilling', value)
    return {...state, view}
  },
  autoFillSuggestions(state) {
    const present = state.data.present.update('lines', lines =>
      fitPartNumbers(
        lines.map((line, lineId) => {
          const retailerSuggestions =
            state.suggestions.getIn([lineId, 'retailers']) || immutable.Map()
          line = line.update('retailers', retailers => {
            return retailers.map((part, vendor) => {
              const vendorSuggestions =
                retailerSuggestions.get(vendor) || immutable.List()
              if (part) {
                const existing = vendorSuggestions.find(
                  s => s.getIn(['sku', 'part']) === part
                )
                if (existing && existing.checkColor === 'green') {
                  return part
                }
              }
              const s = vendorSuggestions.first()
              if (s && /match/.test(s.get('type'))) {
                return s.getIn(['sku', 'part'])
              }
              return part
            })
          })
          return line.update('partNumbers', ps => {
            const suggestions = (
              state.suggestions.getIn([lineId, 'data']) || immutable.List()
            ).filter(s => !ps.find(p => p.equals(s.get('mpn'))))
            return ps
              .slice(0, -1)
              .concat(
                suggestions
                  .filter(
                    s =>
                      s.get('type') === 'match' || s.get('type') === 'cpl_match'
                  )
                  .map(s => s.get('mpn'))
              )
          })
        })
      )
    )
    if (!present.equals(state.data.present)) {
      const past = state.data.past.concat([state.data.present])
      const data = Object.assign({}, state.data, {present, past, future: []})
      return Object.assign({}, state, {data})
    }
    return state
  },
  setSuggestions(state, {lineId, suggestions}) {
    const line = state.data.present.getIn(['lines', lineId])
    if (!line) {
      return state
    }
    const existing = state.suggestions.getIn([lineId, 'data'])
    if (existing && existing.equals(suggestions)) {
      return state
    }
    suggestions = makeUniform(suggestions)
    const stateSuggestions = state.suggestions.setIn(
      [lineId, 'data'],
      suggestions
    )
    state = Object.assign({}, state, {suggestions: stateSuggestions})
    return this.computeRetailerSuggestions(state, {lineId})
  },
  setBuyMultiplier(state, n) {
    if (n == null || n < 1 || isNaN(n)) {
      n = 1
    }
    if (n === state.view.get('buyMultiplier')) {
      return state
    }
    const view = state.view.set('buyMultiplier', n)
    state = {...state, view}
    state.data.present.get('order').forEach(lineId => {
      state = this.computeRetailerSuggestions(state, {lineId})
    })
    return state
  },
  computeRetailerSuggestions(state, {lineId}) {
    const suggestions = state.suggestions.getIn([lineId, 'data'])
    const line = state.data.present.getIn(['lines', lineId])
    const buyMultiplier = state.view.get('buyMultiplier')
    const retailers = immutable.Map(
      retailer_list.map(retailer => {
        const s = computeSuggestionsForRetailer(
          suggestions,
          retailer,
          line,
          buyMultiplier
        )
        return [retailer, s]
      })
    )
    const stateSuggestions = state.suggestions.setIn(
      [lineId, 'retailers'],
      retailers
    )
    return Object.assign({}, state, {suggestions: stateSuggestions})
  },
  addSuggestions(state, {lineId, suggestions}) {
    if (suggestions.size < 1) {
      return state
    }
    const existing =
      state.suggestions.getIn([lineId, 'data']) || immutable.List()

    //make unique
    suggestions = suggestions.reduce((prev, p) => {
      if (prev.map(s => s.get('mpn')).includes(p.get('mpn'))) {
        if (p.get('type') === 'match' || p.get('type') === 'cpl_match') {
          prev = prev.filter(s => !s.get('mpn').equals(p.get('mpn')))
          return prev.push(p)
        }
        return prev
      }
      return prev.push(p)
    }, existing)

    if (suggestions.size < 1) {
      return state
    }

    return this.setSuggestions(state, {lineId, suggestions})
  },
  removeSuggestions(state, {lineId, suggestionsToRemove}) {
    const existing =
      state.suggestions.getIn([lineId, 'data']) || immutable.List()

    const suggestions = existing.filter(
      s => !suggestionsToRemove.some(x => x.get('mpn').equals(s.get('mpn')))
    )
    return this.setSuggestions(state, {lineId, suggestions})
  },
  replaceSuggestions(state, suggestions) {
    let status = immutable.Map()
    suggestions.forEach((suggestions, lineId) => {
      lineId = parseInt(lineId, 10)
      state = this.setSuggestions(state, {lineId, suggestions})
      status = status.setIn([lineId, 'matching'], 'done')
    })
    const view = state.view.set('suggestionsStatus', status)
    return Object.assign({}, state, {view})
  },
  setFocusBelow(state) {
    let data = state.data
    let order = data.present.get('order')
    // add a line if needed (in an undoable way)
    if (state.view.get('focus').first() + 1 >= order.size) {
      const past = state.data.past.concat([data.present])
      const present = linesActions.addEmptyLine(data.present)
      data = Object.assign({}, state.data, {present, past})
      order = data.present.get('order')
    }
    const view = state.view.update('focus', focus => {
      if (focus == null) {
        return focus
      }
      const lineId = focus.get(0)
      const index = order.indexOf(lineId)
      const field = focus.get(1)
      if (index < 0 || field == null) {
        return focus
      }
      return immutable.List.of(order.get(index + 1), field)
    })
    return Object.assign({}, state, {view, data})
  },
  setFocusNext(state) {
    const lines = state.data.present.get('lines')
    const order = state.data.present.get('order')
    const view = state.view.update('focus', focus => {
      if (focus == null) {
        return focus
      }
      const lineId = focus.get(0)
      const index = order.indexOf(lineId)
      const field = focus.get(1)
      if (index < 0 || field == null) {
        return focus
      }
      const fieldName = field.get(0)
      const partNumbersExpanded = state.view.get('partNumbersExpanded')
      if (fieldName === 'retailers') {
        const rs = retailer_list
        const i = rs.indexOf(field.get(1))
        if (i + 1 < rs.length) {
          return immutable.fromJS([order.get(index), ['retailers', rs[i + 1]]])
        } else if (index + 1 < order.size) {
          return immutable.fromJS([order.get(index + 1), ['reference']])
        } else {
          return immutable.List.of(null, null)
        }
      } else {
        return focus.update(1, field => {
          if (fieldName === 'reference') {
            return immutable.List.of('quantity')
          } else if (fieldName === 'quantity') {
            return immutable.List.of('description')
          } else if (fieldName === 'description') {
            if (partNumbersExpanded.get(0)) {
              return immutable.List.of('partNumbers', 0, 'manufacturer')
            } else {
              return immutable.List.of('partNumbers', 0, 'part')
            }
          } else if (fieldName === 'partNumbers') {
            const first = retailer_list[0]
            const firstRetailer = immutable.List.of('retailers', first)
            const i = field.get(1)
            if (partNumbersExpanded.get(i)) {
              const type = field.get(2)
              if (type === 'manufacturer') {
                return immutable.List.of('partNumbers', i, 'part')
              } else if (i + 1 < lines.first().get('partNumbers').size) {
                if (partNumbersExpanded.get(i + 1)) {
                  return immutable.List.of('partNumbers', i + 1, 'manufacturer')
                } else {
                  return immutable.List.of('partNumbers', i + 1, 'part')
                }
              } else {
                return firstRetailer
              }
            } else if (i + 1 < lines.first().get('partNumbers').size) {
              if (partNumbersExpanded.get(i + 1)) {
                return immutable.List.of('partNumbers', i + 1, 'manufacturer')
              } else {
                return immutable.List.of('partNumbers', i + 1, 'part')
              }
            } else {
              return firstRetailer
            }
          }
        })
      }
    })
    return Object.assign({}, state, {view})
  },
  setField(state, {lineId, field, value}) {
    if (typeof value === 'string') {
      value = value.trim()
    }
    let present = state.data.present
    const past = state.data.past.concat([present])
    if (field.get(0) === 'quantity' && value < 1) {
      value = 1
    } else if (field.get(0) === 'retailers') {
      value = value.toUpperCase()
      if (field.get(1) !== 'Digikey') {
        value = value.replace(/-/g, '')
      }
    }
    const currentValue = present.getIn(
      immutable.List.of('lines', lineId).concat(field)
    )
    if (currentValue !== value) {
      present = present.setIn(
        immutable.List.of('lines', lineId).concat(field),
        value
      )
    }
    present = present.update('lines', fitPartNumbers)
    const data = Object.assign({}, state.data, {present, past})
    state = Object.assign({}, state, {data})
    if (field.get(0) === 'quantity') {
      // re-compute suggestions as they are ranked according to in-stock information
      state = this.computeRetailerSuggestions(state, {lineId})
    }
    return state
  }
}

const rootReducer = makeReducer(rootActions, initialState)

const ignoreTypes = immutable.List.of(
  'initializeLines',
  'addSuggestion',
  'initEmptyLine'
)
const linesReducer = reduxUndo.default(
  makeReducer(linesActions, initialState['data']),
  {
    filter(action, newState, previousState) {
      if (ignoreTypes.includes(action.type)) {
        return false
      }
      return !newState.equals(previousState)
    }
  }
)

const suggestionsActions = {
  setSuggestionsSearch(state, {lineId, status}) {
    return state.setIn([lineId, 'search'], status)
  },
  searchAll(state) {
    return state.map(line =>
      line.update('search', search => {
        if (search !== 'done' && search !== 'searching') {
          return 'start'
        }
        return search
      })
    )
  }
}

const suggestionsReducer = makeReducer(
  suggestionsActions,
  initialState.suggestions
)

const viewReducer = makeReducer(viewActions, initialState['view'])

const combinedReducer = redux.combineReducers({
  data: linesReducer,
  view: viewReducer,
  suggestions: suggestionsReducer
})

export function mainReducer(state = initialState, action) {
  const state2 = rootReducer(state, action)
  return combinedReducer(state2, action)
}

function makeReducer(reducers, initialState) {
  return function reducer(state = initialState, action) {
    if (Object.keys(reducers).includes(action.type)) {
      const state2 = reducers[action.type](state, action.value)
      return state2
    }
    return state
  }
}

function makeActions(reducers) {
  const actions = {}
  Object.keys(reducers).forEach(name => {
    actions[name] = function createAction(value) {
      return {type: name, value}
    }
  })
  return actions
}

export const actions = Object.assign(
  makeActions(linesActions),
  makeActions(viewActions),
  makeActions(rootActions),
  makeActions(suggestionsActions),
  reduxUndo.ActionCreators
)

function makeDataImmutable(data) {
  if (immutable.Iterable.isIterable(data)) {
    return data
  }
  const {lines, sortedBy} = data
  return immutable.Map({
    lines: immutable.List(lines).map(line => immutable.fromJS(line)),
    sortedBy: immutable.List(sortedBy)
  })
}

function makeImmutable({data, view, suggestions}) {
  return {
    data: {
      present: makeDataImmutable(data.present),
      past: data.past.map(makeDataImmutable),
      future: data.future.map(makeDataImmutable)
    },
    view: immutable.fromJS(view),
    suggestions: immutable.Map(suggestions).map(v => immutable.List(v))
  }
}

export function makeMutable({data, view, parts}) {
  return {
    data: {
      present: data.present.toJS(),
      past: data.past.map(s => s.toJS()),
      future: data.future.map(s => s.toJS())
    },
    view: view.toJS(),
    parts: parts.toJS()
  }
}

export function changed(state1, state2) {
  return !immutable.fromJS(state1).equals(state2)
}

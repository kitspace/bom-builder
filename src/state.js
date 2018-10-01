import immutable from 'immutable'
import oneClickBom from '1-click-bom'
import * as redux from 'redux'
import * as reduxUndo from 'redux-undo-immutable-js'

function IdMaker() {
  this.id = 0
  return () => this.id++
}

const makeId = new IdMaker()

export const emptyLine = immutable.Map({
  reference: '',
  quantity: 1,
  description: '',
  partNumbers: immutable.List(),
  retailers: immutable.Map({
    Digikey: '',
    Mouser: '',
    RS: '',
    Farnell: '',
    Newark: ''
  })
})

export const emptyPartNumber = immutable.Map({
  part: '',
  manufacturer: ''
})

export const initialState = {
  data: immutable.fromJS({
    lines: {},
    order: [],
    sortedBy: [null, null],
    editFocus: [null, null]
  }),
  view: immutable.fromJS({
    partNumbersExpanded: [],
    focus: [null, null],
    editable: true
  }),
  suggestions: immutable.Map()
}

export function fitPartNumbers(lines) {
  const requiredSize =
    lines
      .map(line => {
        const partNumbers = line.get('partNumbers')
        return partNumbers.findLastIndex(p => !p.equals(emptyPartNumber))
      })
      .max() + 2
  return lines.map(line => {
    return line.update('partNumbers', ps => {
      while (ps.size < requiredSize) {
        ps = ps.push(emptyPartNumber)
      }
      return ps.slice(0, requiredSize)
    })
  })
}

export const linesActions = {
  setField(state, {lineId, field, value}) {
    if (field.get(0) === 'quantity' && value < 1) {
      value = 1
    }
    const currentValue = state.getIn(
      immutable.List.of('lines', lineId).concat(field)
    )
    if (currentValue !== value) {
      state = state.setIn(
        immutable.List.of('lines', lineId).concat(field),
        value
      )
      state = state.update('lines', fitPartNumbers)
      return state.set(
        'editFocus',
        immutable.List.of(lineId, immutable.fromJS(field))
      )
    }
    return state.update('lines', fitPartNumbers)
  },
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
    if (oneClickBom.lineData.retailer_list.includes(header)) {
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
      sortedBy = [header, 'reverse']
    } else {
      sortedBy = [header, 'forward']
    }
    const order = lines.map(l => l.get('id'))
    return state.merge({order, sortedBy})
  }
}

export const viewActions = {
  setFocus(state, location) {
    return state.set('focus', immutable.fromJS(location))
  },
  setEditable(state, value) {
    return state.set('editable', value)
  },
  togglePartNumbersExpanded(state, n) {
    return state.updateIn(['partNumbersExpanded', n], expanded => !expanded)
  },
  loseFocus(state, focusToLose) {
    return state.update('focus', focus => {
      if (focus.equals(immutable.fromJS(focusToLose))) {
        return immutable.List.of(null, null)
      }
      return focus
    })
  }
}

export const rootActions = {
  setState(_, state) {
    return makeImmutable(state)
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
          data: immutable.List()
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
  setFocusBelow(state) {
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
      if (index + 1 >= order.size) {
        return immutable.List.of(null, null)
      }
      return immutable.List.of(order.get(index + 1), field)
    })
    return Object.assign({}, state, {view})
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
        const rs = oneClickBom.lineData.retailer_list
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
            const first = oneClickBom.lineData.retailer_list[0]
            const firstRetailer = immutable.List.of('retailers', first)
            const i = field.get(1)
            if (partNumbersExpanded.get(i)) {
              const type = field.get(2)
              if (type === 'manufacturer') {
                return immutable.List.of('partNumbers', i, 'part')
              } else if (i + 1 < lines.get(0).get('partNumbers').size) {
                if (partNumbersExpanded.get(i + 1)) {
                  return immutable.List.of('partNumbers', i + 1, 'manufacturer')
                } else {
                  return immutable.List.of('partNumbers', i + 1, 'part')
                }
              } else {
                return firstRetailer
              }
            } else if (i + 1 < lines.get(0).get('partNumbers').size) {
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
  '@@redux-undo/UNDO'(state) {
    const past = state.data.past
    if (past.length > 0) {
      const editFocus = past[past.length - 1].get('editFocus')
      const view = state.view.set('focus', editFocus)
      return Object.assign({}, state, {view})
    }
    return state
  },
  '@@redux-undo/REDO'(state) {
    const future = state.data.future
    if (future.length > 0) {
      const editFocus = future[0].get('editFocus')
      const view = state.view.set('focus', editFocus)
      return Object.assign({}, state, {view})
    }
    return state
  }
}

export const rootReducer = makeReducer(rootActions, initialState)

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

export const suggestionsActions = {
  setSuggestions(state, {lineId, suggestions}) {
    const s = immutable.Map({status: 'done', data: suggestions})
    return state.set(lineId, s)
  },
  setSuggestionsStatus(state, {lineId, status}) {
    return state.setIn([lineId, 'status'], status)
  },
  addSuggestion(state, {id, part}) {
    return state.update(id, s => {
      s = s || immutable.List()
      if (s.some(x => part.get('mpn').equals(x.get('mpn')))) {
        return s
      }
      return s.push(part)
    })
  }
}

export const suggestionsReducer = makeReducer(
  suggestionsActions,
  initialState.suggestions
)

export const viewReducer = makeReducer(viewActions, initialState['view'])

export const combinedReducer = redux.combineReducers({
  data: linesReducer,
  view: viewReducer,
  suggestions: suggestionsReducer
})

export function mainReducer(state = initialState, action) {
  const state2 = rootReducer(state, action)
  return combinedReducer(state2, action)
}

export function makeReducer(reducers, initialState) {
  return function reducer(state = initialState, action) {
    if (Object.keys(reducers).includes(action.type)) {
      const state2 = reducers[action.type](state, action.value)
      return state2
    }
    return state
  }
}

export function makeActions(reducers) {
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

export function makeDataImmutable(data) {
  if (immutable.Iterable.isIterable(data)) {
    return data
  }
  const {lines, editFocus, sortedBy} = data
  return immutable.Map({
    lines: immutable.List(lines).map(line => immutable.fromJS(line)),
    editFocus: immutable.List(editFocus),
    sortedBy: immutable.List(sortedBy)
  })
}

export function makeImmutable({data, view, suggestions}) {
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

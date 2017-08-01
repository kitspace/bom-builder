const immutable   = require('immutable')
const oneClickBom = require('1-click-bom')
const redux       = require('redux')
const reduxUndo   = require('redux-undo')

function makeId() {
  this.id = this.id || 0
  return this.id++
}

const emptyLine = immutable.Map({
  reference   : '',
  quantity    : '',
  partNumbers : immutable.List(),
  retailers: immutable.Map({
    Digikey : '',
    Mouser  : '',
    RS      : '',
    Farnell : '',
    Newark  : '',
  }),
})

const initialState = {
  data: immutable.fromJS({
    lines: [],
    sortedBy: [null, null],
  }),
  view: immutable.fromJS({
    partNumbersExpanded: false,
    focus: [null, null],
    editable: false,
  }),
}

const linesActions = {
  setField(state, {id, field, value}) {
    let lines = state.get('lines')
    const line = lines.find(line => line.get('id') === id)
    if (field[0] === 'quantity' && value < 1) {
      value = 1
    }
    const newLine = line.setIn(field, value)
    lines = lines.map(line => {
      if (line.get('id') === id) {
        return newLine
      }
      return line
    })
    return state.merge({lines})
  },
  addLine(state, value) {
    const line = immutable.fromJS(value).set('id', makeId())
    const lines = state.get('lines').push(line)
    return state.merge({lines})
  },
  removeLine(state, id) {
    const lines = state.get('lines').filter(line => {
      return line.get('id') !== id
    })
    return state.merge({lines})
  },
  sortBy(state, header) {
    let lines = state.get('lines')
    if (oneClickBom.lineData.retailer_list.includes(header)) {
      lines = lines.sortBy(line => line.get('retailers').get(header).toLowerCase())
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
    return state.merge({lines, sortedBy})
  },
  setFromTsv(state, value) {
    const {lines} = oneClickBom.parseTSV(value)
    return state.set('lines', immutable.fromJS(lines).map(line => {
      return line.merge({id: makeId()})
    }))
  },
}

const viewActions = {
  setFocus(state, location) {
    return state.set('focus', immutable.fromJS(location))
  },
  setEditable(state, value) {
    return state.set('editable', value)
  },
  togglePartNumbersExpanded(state) {
    return state.update('partNumbersExpanded', expanded => !expanded)
  },
  toggleRetailersExpanded(state) {
    return state.update('retailersExpanded', expanded => !expanded)
  },
}

const rootActions = {
  setFocusBelow(state) {
    const lines = state.data.present.get('lines')
    const view  = state.view.update('focus', focus => {
      if (focus == null) {
        return focus
      }
      const id = focus.get(0)
      const field = focus.get(1)
      if (id == null || field == null) {
        return focus
      }
      const index = lines.findIndex(line => line.get('id') === id)
      if ((index + 1) >= lines.size) {
        return immutable.List.of(null, null)
      }
      return immutable.List.of(lines.get(index + 1).get('id'), field)
    })
    return Object.assign({}, {data: state.data, view})
  },
  setFocusNext(state) {
    const lines = state.data.present.get('lines')
    const view  = state.view.update('focus', focus => {
      if (focus == null) {
        return focus
      }
      const id = focus.get(0)
      const field = focus.get(1)
      if (id == null || field == null) {
        return focus
      }
      const index = lines.findIndex(line => line.get('id') === id)
      let fieldName = field.get(0)
      const partNumbersExpanded = state.view.get('partNumbersExpanded')
      if (fieldName === 'retailers') {
        const rs = oneClickBom.lineData.retailer_list
        const i = rs.indexOf(field.get(1))
        if ((i + 1) < rs.length) {
          return immutable.fromJS([lines.get(index).get('id'), ['retailers', rs[i + 1]]])
        } else if ((index + 1) < lines.size) {
          return immutable.fromJS([lines.get(index + 1).get('id'), ['reference']])
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
            if (partNumbersExpanded) {
              return immutable.List.of('partNumbers', 0, 'manufacturer')
            } else {
              return immutable.List.of('partNumbers', 0, 'part')
            }
          } else if (fieldName === 'partNumbers') {
            const next = immutable.List.of('retailers', oneClickBom.lineData.retailer_list[0])
            if (partNumbersExpanded) {
              const i = field.get(1)
              const type = field.get(2)
              if (type === 'manufacturer') {
                return immutable.List.of('partNumbers', i, 'part')
              } else if ((i + 1) < lines.get(0).get('partNumbers').size) {
                return immutable.List.of('partNumbers', i + 1, 'manufacturer')
              } else {
                return next
              }
            } else {
              return next
            }
          }
        })
      }
    })
    return Object.assign({}, {data: state.data, view})
  },
}

const rootReducer = makeReducer(rootActions, initialState)

const linesReducer = reduxUndo.default(
  makeReducer(linesActions, initialState['data']),
  {
    filter(action) {
      if (action.type === 'setFromTsv') {
        return false
      }
      return Object.keys(linesActions).includes(action.type)
    },
  }
)

const viewReducer = makeReducer(viewActions, initialState['view'])

const combinedReducer = redux.combineReducers({
  data: linesReducer,
  view: viewReducer,
})

function mainReducer(state = initialState, action) {
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

const actions = Object.assign(
  makeActions(linesActions),
  makeActions(viewActions),
  makeActions(rootActions),
  reduxUndo.ActionCreators,
)

module.exports = {initialState, mainReducer, makeReducer, linesActions, emptyLine, actions}

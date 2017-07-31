const immutable      = require('immutable')
const oneClickBom    = require('1-click-bom')
const redux          = require('redux')

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

function mainReducer (state = initialState, action) {
  return redux.combineReducers({
    data: makeReducer(linesActions, 'data'),
    view: makeReducer(viewActions, 'view'),
  })(state, action)
}

function makeReducer(reducers, key) {
  return function reducer(state = initialState[key], action) {
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
  makeActions(viewActions)
)

module.exports = {initialState, mainReducer, makeReducer, linesActions, emptyLine, actions}

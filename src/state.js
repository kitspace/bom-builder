const immutable      = require('immutable')
const reduxImmutable = require('redux-immutable')
const oneClickBom = require('1-click-bom')

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

const initialState = immutable.fromJS({
  editable: {
    lines: [],
    sortedBy: [null, null],
  },
  view: {},
})

const linesActions = {
  addLine(state, value) {
    const line = immutable.fromJS(value).set('id', makeId())
    const lines = state.get('lines').push(line)
    return state.merge({lines})
  },
  removeLine(state, value) {
    const lines = state.get('lines')
    return state.set('lines', lines.filter((_,key) => key !== value))
  },
  addPartNumber(state, value) {
    const lines = state.get('lines')
    const {id, partNumber} = value
    const line = lines.get(id).update(
      'partNumbers',
      ps => ps.add(partNumber)
    )
    return state.set('lines', lines.set(id, line))
  },
  addSku(state, value) {
    const lines = state.get('lines')
    const {id, sku} = value
    const line = lines.get(id).setIn(
      ['retailers', sku.get('vendor')],
      sku.get('part')
    )
    return state.set('lines', lines.set(id, line))
  },
  removePartNumber(state, value) {
    const lines = state.get('lines')
    const {id, partNumber} = value
    const line = lines.get(id).update(
      'partNumbers',
      ps => ps.filterNot(p => p.equals(partNumber))
    )
    return state.set('lines', lines.set(id, line))
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

const viewActions = {}

const mainReducer = reduxImmutable.combineReducers({
  editable: makeReducer(linesActions),
  view: makeReducer(viewActions),
})

function makeReducer(reducers) {
  return function reducer(state, action) {
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

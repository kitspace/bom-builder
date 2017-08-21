const immutable = require('immutable')
const reselect = require('reselect')

function suggestions(state) {
  return state.suggestions
}

function line(state, props) {
  return state.data.present.getIn(['lines', props.lineId])
}

function view(state) {
  return state.view
}

function lineId(_, props) {
  return props.lineId
}

function field(_, props) {
  return props.field
}

function editingThis(editing, lineId, field) {
  return editing && editing.equals(immutable.fromJS([lineId, field]))
}

function makeActiveSelector() {
  return reselect.createSelector(
    [editingSelector, lineId, field],
    editingThis
  )
}

function editingSelector(state) {
  return state.view.get('editable') ? state.view.get('focus') : null
}

function makeLineSelector() {
  return reselect.createSelector(
    [line], line => line
  )
}


function makeEditingSelector() {
  return reselect.createSelector(
    [editingSelector],
    editing => editing
  )
}




module.exports = {
  line,
  suggestions,
  view,
  lineId,
  field,
  makeEditingSelector,
  makeLineSelector,
  makeActiveSelector,
}

import * as immutable from 'immutable'
import * as reselect from 'reselect'

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

function makeValueSelector() {
  return reselect.createSelector([line, field], (line, field) =>
    line.getIn(field)
  )
}

function editingThis(editing, lineId, field) {
  return editing && editing.equals(immutable.fromJS([lineId, field]))
}

function makeActiveSelector() {
  return reselect.createSelector([editingSelector, lineId, field], editingThis)
}

function editingSelector(state) {
  return state.view.get('editable') ? state.view.get('focus') : null
}

function makeLineSelector() {
  return reselect.createSelector([line], line => line)
}

function makeEditingSelector() {
  return reselect.createSelector([editingSelector], editing => editing)
}

function makeSuggestionsLoading() {
  return reselect.createSelector(
    [suggestions, lineId],
    (suggestions, lineId) => suggestions.getIn([lineId, 'status']) === 'loading'
  )
}

export default {
  line,
  suggestions,
  view,
  lineId,
  field,
  makeEditingSelector,
  makeLineSelector,
  makeActiveSelector,
  makeValueSelector,
  makeSuggestionsLoading,
}

import * as immutable from 'immutable'
import * as reselect from 'reselect'

export function suggestions(state) {
  return state.suggestions
}

export function makeSuggestionsSelector() {
  return reselect.createSelector(
    [suggestions, lineId],
    (suggestions, lineId) => {
      return suggestions.getIn([lineId, 'data']) || immutable.List()
    }
  )
}

export function lines(state) {
  return state.data.present.get('lines')
}

export function line(state, props) {
  return state.data.present.getIn(['lines', props.lineId])
}

export function view(state) {
  return state.view
}

export function lineId(_, props) {
  return props.lineId
}

export function field(_, props) {
  return props.field
}

export function value(state, props) {
  return state.data.present.getIn(['lines', props.lineId]).getIn(props.field)
}

export function editingThis(editing, lineId, field) {
  return editing && editing.equals(immutable.fromJS([lineId, field]))
}

export function makeActiveSelector() {
  return reselect.createSelector([editingSelector, lineId, field], editingThis)
}

export function editingSelector(state) {
  return state.view.get('editable') ? state.view.get('focus') : null
}

export function makeLineSelector() {
  return reselect.createSelector([line], line => line)
}

export function makeSuggestionsLoading() {
  return reselect.createSelector(
    [suggestions, lineId],
    (suggestions, lineId) => suggestions.getIn([lineId, 'status']) === 'loading'
  )
}

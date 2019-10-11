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

export function previewBuy(state) {
  return state.view.get('previewBuy')
}

export function buyMultiplier(state) {
  return state.view.get('buyMultiplier')
}

export function buyExtraPercent(state) {
  return state.view.get('buyExtraPercent')
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

export function buyExtra(state, props) {
  return state.data.present.getIn(['buyExtraLines', props.lineId])
}

export function buyExtraLines(state, props) {
  return state.data.present.get('buyExtraLines')
}


export function editingSelector(state) {
  return state.view.get('editable') ? state.view.get('focus') : null
}

export function makeLineSelector() {
  return reselect.createSelector([line], line => line)
}

export function suggestionsStatus(state) {
  return state.view.get('suggestionsStatus')
}
export function makeSuggestionsLoadingPercent() {
  return reselect.createSelector(
    [suggestionsStatus],
    suggestionsStatus =>
      ((suggestionsStatus.size -
      suggestionsStatus.reduce(
        (prev, s) => prev + (s.get('matching') === 'loading' ? 1 : 0),
        0
      )) / suggestionsStatus.size) * 100
  )
}

export function makeSuggestionsMatching() {
  return reselect.createSelector([suggestionsStatus, lineId], (suggestions, lineId) =>
    suggestions.getIn([lineId, 'matching'])
  )
}

export function makeSuggestionsSearching() {
  return reselect.createSelector([suggestions, lineId], (suggestions, lineId) =>
    suggestions.getIn([lineId, 'search'])
  )
}

export function alwaysBuySkus(state) {
  return state.view.get('alwaysBuySkus')
}


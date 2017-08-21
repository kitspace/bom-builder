const reactRedux = require('react-redux')
const redux      = require('redux')
const reselect   = require('reselect')
const immutable  = require('immutable')

const {actions}  = require('./state')
const {MpnPopup} = require('./suggestion_popup')
const selectors  = require('./selectors')
const {EditableCell} = require('./editable_cell')

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function parentField(_, props) {
  return props.field.pop()
}

const mpnSelector = reselect.createSelector(
  [selectors.line, parentField],
  (line, field) => line.getIn(field)
)

const partNumbersSelector = reselect.createSelector(
  [selectors.line],
  line => line.get('partNumbers')
)

const otherMpnsSelector = reselect.createSelector(
  [partNumbersSelector, mpnSelector],
  (partNumbers, mpn) => partNumbers.filter(m => !m.equals(mpn))
)

function makeEmptyMpnsSelector() {
  return reselect.createSelector(
    [partNumbersSelector],
    partNumbers => partNumbers.map((m, index) => {
      if(!m.get('part') || !m.get('manufacturer')) {
        return index
      }
      return null
    }).filter(x => x != null)
  )
}

function makeSuggestionNumberSelector() {
  const emptyPartNumbers = makeEmptyMpnsSelector()
  return reselect.createSelector(
    [emptyPartNumbers, partNumberIndexSelector],
    (empty, partIndex) => {
      return empty.indexOf(partIndex)
    }
  )
}

function makeApplicableSuggestions() {
  return reselect.createSelector(
    [selectors.suggestions, otherMpnsSelector, selectors.lineId],
    (suggestions, otherMpns, lineId, suggestionNumber) => {
      suggestions = suggestions.get(lineId) || immutable.List()
      return suggestions.filter(s => !otherMpns.includes(s.get('mpn')))
    }
  )
}

function makeWandSelector(applicableSuggestionsSelector) {
  const suggestionNumber = makeSuggestionNumberSelector()
  return reselect.createSelector(
    [applicableSuggestionsSelector, suggestionNumber],
    (suggestions, suggestionNumber) => {
      if (suggestionNumber < 0) {
        return false
      }
      const suggestion = suggestions.slice(suggestionNumber).first()
      if (suggestion) {
        return suggestion.get('type')
      }
      return false
    }
  )
}

function partNumberIndexSelector(_, props) {
  return props.partNumberIndex
}

function makeSelectedSelector(suggestions) {
  return reselect.createSelector(
    [suggestions, mpnSelector],
    (suggestions, mpn) => suggestions.findIndex(s => s.get('mpn').equals(mpn))
  )
}

function mapStateToProps() {
  const active      = selectors.makeActiveSelector()
  const line        = selectors.makeLineSelector()
  const editing     = selectors.makeEditingSelector()
  const suggestions = makeApplicableSuggestions()
  const wand        = makeWandSelector(suggestions)
  const selected    = makeSelectedSelector(suggestions)
  return reselect.createSelector(
    [line, editing, active, suggestions, wand, selected],
    (line, editing, active, suggestions, wand, selected) => ({
      line, editing, active, suggestions, wand, selected
    })
  )
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(EditableCell)

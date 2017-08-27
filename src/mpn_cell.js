const React       = require('react')
const createClass = require('create-react-class')
const reactRedux  = require('react-redux')
const redux       = require('redux')
const reselect    = require('reselect')
const immutable   = require('immutable')

const {actions}    = require('./state')
const {MpnPopup}   = require('./popup')
const selectors    = require('./selectors')
const EditableCell = require('./editable_cell')

const MpnCell = createClass({
  displayName: 'MpnCell',
  getInitialState() {
    return {triggered: false}
  },
  render() {
    const props = this.props
    const {
      editing,
      value,
      smallValue,
      lineId,
      field,
      setField,
      setFocus,
      active,
    } = props
    const cell = (
      <EditableCell
        field={field}
        value={value}
        lineId={lineId}
        setField={setField}
        setFocus={setFocus}
        loseFocus={props.loseFocus}
        active={active}
        editing={editing}
        wand={props.wand}
        smallField={smallValue}
        setFocusBelow={props.setFocusBelow}
        setFocusNext={props.setFocusNext}
      />
    )
    if (props.wand || props.selected > -1) {
      return (
        <MpnPopup
          on='click'
          trigger={cell}
          field={field.pop()}
          lineId={props.lineId}
          position='bottom center'
          suggestions={props.suggestions}
          selected={props.selected}
          setField={setField}
          remove={props.remove}
        />
      )
    }
    return cell
  }
})

function parentField(_, props) {
  return props.field.pop()
}

function makeMpnSelector() {
  return reselect.createSelector(
    [selectors.line, parentField],
    (line, field) => line.getIn(field)
  )
}

const partNumbersSelector = reselect.createSelector(
  [selectors.line],
  line => line.get('partNumbers')
)

function makeOtherMpnsSelector(mpn)  {
  return reselect.createSelector(
    [partNumbersSelector, mpn],
    (partNumbers, mpn) => partNumbers.filter(m => !m.equals(mpn))
  )
}

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

function makeApplicableSuggestions(mpn) {
  const otherMpns = makeOtherMpnsSelector(mpn)
  return reselect.createSelector(
    [selectors.suggestions, otherMpns, selectors.lineId],
    (suggestions, otherMpns, lineId, suggestionNumber) => {
      suggestions = suggestions.getIn([lineId, 'data']) || immutable.List()
      return suggestions.filter(s => !otherMpns.includes(s.get('mpn')))
    }
  )
}

function makeWandSelector(applicableSuggestionsSelector, mpn) {
  const suggestionNumber = makeSuggestionNumberSelector()
  const loading = selectors.makeSuggestionsLoading()
  return reselect.createSelector(
    [applicableSuggestionsSelector, suggestionNumber, loading, mpn],
    (suggestions, suggestionNumber, loading, mpn) => {
      if (mpn.get('part') && mpn.get('manufacturer')) {
        return false
      }
      if (loading) {
        return 'loading'
      }
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

function isManufacturer(_, props) {
  return props.field.last() === 'manufacturer'
}

function makeSelectedSelector(suggestions, mpn) {
  return reselect.createSelector(
    [suggestions, mpn],
    (suggestions, mpn) => suggestions.findIndex(s => s.get('mpn').equals(mpn))
  )
}

function makeSmallValueSelector(mpn) {
  return reselect.createSelector(
    [mpn, isManufacturer],
    (mpn, isManufacturer) => !isManufacturer && mpn.get('manufacturer')
  )
}

function mapStateToProps() {
  const active      = selectors.makeActiveSelector()
  const value       = selectors.makeValueSelector()
  const editing     = selectors.makeEditingSelector()
  const mpn         = makeMpnSelector()
  const suggestions = makeApplicableSuggestions(mpn)
  const wand        = makeWandSelector(suggestions, mpn)
  const selected    = makeSelectedSelector(suggestions, mpn)
  const smallValue  = makeSmallValueSelector(mpn)
  return reselect.createSelector(
    [value, editing, active, suggestions, wand, selected, smallValue],
    (value, editing, active, suggestions, wand, selected, smallValue) => ({
      value, editing, active, suggestions, wand, selected, smallValue
    })
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(MpnCell)

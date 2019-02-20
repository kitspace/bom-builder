import React from 'react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import * as reselect from 'reselect'

import {actions} from './state'
import {MpnPopup} from './popup'
import * as selectors from './selectors'
import EditableCell from './editable_cell'

class MpnCell extends React.Component {
  shouldComponentUpdate(newProps) {
    return Object.keys(newProps).reduce((prev, k) => {
      return prev || (k !== 'field' && newProps[k] !== this.props[k])
    }, false)
  }
  handlePopupOpen = () => {
    this.props.setPopupFocus([this.props.lineId, this.props.field])
  }
  handlePopupClose = () => {
    this.props.setPopupFocus([null, null])
  }
  render() {
    const props = this.props
    const {value, smallValue, lineId, field, setField, setFocus, active} = props
    const cell = (
      <EditableCell
        field={field}
        value={value}
        lineId={lineId}
        setField={setField}
        setFocus={setFocus}
        loseFocus={props.loseFocus}
        active={active}
        match={props.match}
        check={props.check}
        smallField={smallValue}
        setFocusBelow={props.setFocusBelow}
        setFocusNext={props.setFocusNext}
      />
    )
    if (!props.hidden && props.suggestions.size > 0) {
      return (
        <MpnPopup
          on="click"
          trigger={cell}
          field={field.pop()}
          lineId={props.lineId}
          position="bottom center"
          onOpen={this.handlePopupOpen}
          onClose={this.handlePopupClose}
          suggestions={props.suggestions}
          selected={props.selected}
          setField={setField}
          remove={props.remove}
          expanded={props.mpnPopupExpanded}
          setExpanded={props.setMpnPopupExpanded}
        />
      )
    }
    return cell
  }
}

function parentField(_, props) {
  return props.field.pop()
}

function makeMpnSelector() {
  return reselect.createSelector([selectors.line, parentField], (line, field) =>
    line.getIn(field)
  )
}

const partNumbersSelector = reselect.createSelector([selectors.line], line =>
  line.get('partNumbers')
)

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/-/g, '')
    .replace(/ /g, '')
    .replace(/_/g, '')
    .replace(/&/g, 'and')
}

function similarEnoughName(name1, name2) {
  return normalizeName(name1) === normalizeName(name2)
}

function similarEnough(mpnOrSku1, mpnOrSku2) {
  const name1 = mpnOrSku1.get('manufacturer') || mpnOrSku1.get('vendor')
  const name2 = mpnOrSku2.get('manufacturer') || mpnOrSku2.get('vendor')
  const part1 = mpnOrSku1.get('part')
  const part2 = mpnOrSku2.get('part')
  const ret = similarEnoughName(name1, name2) && similarEnoughName(part1, part2)
  return ret
}

function makeOtherMpnsSelector(mpn) {
  return reselect.createSelector(
    [partNumbersSelector, mpn],
    (partNumbers, mpn) => partNumbers.filter(m => !similarEnough(m, mpn))
  )
}

function makeEmptyMpnsSelector() {
  return reselect.createSelector([partNumbersSelector], partNumbers =>
    partNumbers
      .map((m, index) => {
        if (!m.get('part') || !m.get('manufacturer')) {
          return index
        }
        return null
      })
      .filter(x => x != null)
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
  const suggestions = selectors.makeSuggestionsSelector()
  return reselect.createSelector(
    [suggestions, otherMpns, selectors.lineId],
    (suggestions, otherMpns, lineId, suggestionNumber) => {
      return suggestions.filter(
        s => !otherMpns.some(other => similarEnough(other, s.get('mpn')))
      )
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
  return reselect.createSelector([suggestions, mpn], (suggestions, mpn) => {
    const index = suggestions.findIndex(s => similarEnough(s.get('mpn'), mpn))
    return index
  })
}

function isExpanded(_, props) {
  return props.expanded
}

function makeSmallValueSelector(mpn) {
  return reselect.createSelector(
    [mpn, isManufacturer, isExpanded],
    (mpn, isManufacturer, isExpanded) =>
      !isExpanded && !isManufacturer && mpn.get('manufacturer')
  )
}

function mpnPopupExpanded(state) {
  return state.view.get('mpnPopupExpanded')
}

function mapStateToProps(state, props) {
  const active = selectors.makeActiveSelector()
  const mpn = makeMpnSelector()
  const suggestions = makeApplicableSuggestions(mpn)
  const match = makeWandSelector(suggestions, mpn)
  const selected = makeSelectedSelector(suggestions, mpn)
  const smallValue = makeSmallValueSelector(mpn)
  return reselect.createSelector(
    [
      selectors.value,
      active,
      suggestions,
      match,
      selected,
      smallValue,
      mpnPopupExpanded
    ],
    (
      value,
      active,
      suggestions,
      match,
      selected,
      smallValue,
      mpnPopupExpanded
    ) => ({
      value,
      active,
      suggestions,
      match,
      selected,
      smallValue,
      mpnPopupExpanded
    })
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(MpnCell)

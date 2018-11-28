import React from 'react'
import * as createClass from 'create-react-class'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import * as reselect from 'reselect'
import * as immutable from 'immutable'

import {actions} from './state'
import {SkuPopup} from './popup'
import * as selectors from './selectors'
import EditableCell from './editable_cell'
import {computeSuggestionsForRetailer} from './suggestions'

const SkuCell = createClass({
  displayName: 'MpnCell',
  getInitialState() {
    return {triggered: false}
  },
  shouldComponentUpdate(newProps) {
    return Object.keys(newProps).reduce((prev, k) => {
      return prev || (k !== 'field' && newProps[k] !== this.props[k])
    }, false)
  },
  render() {
    const props = this.props
    const {value, lineId, field, setField, setFocus, active} = props
    const cell = (
      <EditableCell
        field={field}
        value={value}
        lineId={lineId}
        setField={setField}
        setFocus={setFocus}
        loseFocus={props.loseFocus}
        active={active}
        wand={props.wand}
        selectedCheck={props.selectedCheck}
        suggestionCheck={props.suggestionCheck}
        setFocusBelow={props.setFocusBelow}
        setFocusNext={props.setFocusNext}
      />
    )
    if (props.suggestions.size > 0) {
      return (
        <SkuPopup
          on="click"
          trigger={cell}
          field={field}
          lineId={props.lineId}
          position="bottom center"
          suggestions={props.suggestions}
          selected={props.selected}
          setField={setField}
          remove={props.remove}
          expanded={props.skuPopupExpanded}
          setExpanded={props.setSkuPopupExpanded}
        />
      )
    }
    return cell
  }
})

function retailerSelector(_, props) {
  return props.field.get(1)
}

function retailerSuggestions(state, props) {
  return state.suggestions.getIn([props.lineId, 'retailers']) || immutable.Map()
}

function makeApplicableSuggestions() {
  return reselect.createSelector(
    [retailerSuggestions, retailerSelector],
    (retailerSuggestions, retailer) =>
      retailerSuggestions.get(retailer) || immutable.List()
  )
}

function makeWandSelector(applicableSuggestionsSelector, valueSelector, suggestionCheckSelector) {
  const loading = selectors.makeSuggestionsLoading()
  return reselect.createSelector(
    [applicableSuggestionsSelector, valueSelector, loading, suggestionCheckSelector],
    (suggestions, value, loading, suggestionCheck) => {
      if (suggestionCheck) {
        return suggestions.getIn([0, 'type'])
      }
      if (value) {
        return false
      }
      if (loading) {
        return 'loading'
      }
      return suggestions.getIn([0, 'type'])
    }
  )
}

function makeSuggestionCheckSelector(
  applicableSuggestionsSelector,
  selectedSelector,
  selectedCheckSelector
) {
  return reselect.createSelector(
    [applicableSuggestionsSelector, selectedSelector, selectedCheckSelector],
    (suggestions, selected, selectedCheck) => {
      if (!suggestions.first()) {
        return null
      }
      if (selected >= 0 && !selectedCheck) {
        return null
      }
      if (selectedCheck === suggestions.first().get('checkColor')) {
        return null
      }
      return suggestions.first().get('checkColor')
    }
  )
}

function makeSelectedCheckSelector(
  applicableSuggestionsSelector,
  selectedSelector
) {
  return reselect.createSelector(
    [applicableSuggestionsSelector, selectedSelector],
    (suggestions, selected, wand) => {
      if (selected >= 0) {
        const checkColor = suggestions.getIn([selected, 'checkColor'])
        if (checkColor === 'green') {
          return null
        }
        return checkColor
      }
    }
  )
}

function makeSkuSelector() {
  const value = selectors.makeValueSelector()
  return reselect.createSelector([retailerSelector, value], (vendor, part) =>
    immutable.Map({vendor, part})
  )
}

function makeSelectedSelector(suggestions) {
  const skuSelector = makeSkuSelector()
  return reselect.createSelector(
    [suggestions, skuSelector],
    (suggestions, sku) => suggestions.findIndex(s => s.get('sku').equals(sku))
  )
}

function skuPopupExpanded(state) {
  return state.view.get('skuPopupExpanded')
}

function mapStateToProps() {
  const active = selectors.makeActiveSelector()
  const value = selectors.makeValueSelector()
  const suggestions = makeApplicableSuggestions()
  const selected = makeSelectedSelector(suggestions)
  const selectedCheck = makeSelectedCheckSelector(suggestions, selected)
  const suggestionCheck = makeSuggestionCheckSelector(suggestions, selected, selectedCheck)
  const wand = makeWandSelector(suggestions, value, suggestionCheck)
  return reselect.createSelector(
    [
      value,
      active,
      suggestions,
      wand,
      suggestionCheck,
      selectedCheck,
      selected,
      skuPopupExpanded
    ],
    (
      value,
      active,
      suggestions,
      wand,
      suggestionCheck,
      selectedCheck,
      selected,
      skuPopupExpanded
    ) => ({
      value,
      active,
      suggestions,
      wand,
      suggestionCheck,
      selectedCheck,
      selected,
      skuPopupExpanded
    })
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(SkuCell)

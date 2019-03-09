import React from 'react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import * as reselect from 'reselect'
import * as immutable from 'immutable'

import {actions} from './state'
import {SkuPopup} from './popup'
import * as selectors from './selectors'
import EditableCell from './editable_cell'
import {makePurchaseLinesSelector} from './bom'

class SkuCell extends React.Component {
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
        match={props.match}
        selectedCheck={props.selectedCheck}
        suggestionCheck={props.suggestionCheck}
        setFocusBelow={props.setFocusBelow}
        setFocusNext={props.setFocusNext}
        previewBuy={props.previewBuy}
        highlightRed={props.previewBuy && props.noneSelected}
      />
    )
    if (value || props.suggestions.size > 0) {
      return (
        <SkuPopup
          on="click"
          value={value}
          trigger={cell}
          field={field}
          lineId={props.lineId}
          onOpen={this.handlePopupOpen}
          onClose={this.handlePopupClose}
          position="bottom right"
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
}

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

function makeMatchSelector(
  applicableSuggestionsSelector,
  valueSelector,
  suggestionCheckSelector
) {
  return reselect.createSelector(
    [applicableSuggestionsSelector, valueSelector, suggestionCheckSelector],
    (suggestions, value, suggestionCheck) => {
      if (suggestionCheck) {
        return suggestions.getIn([0, 'type'])
      }
      if (value) {
        return false
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
      const check = suggestions.first().get('checkColor')
      if (check === 'red') {
        return null
      }
      if (selectedCheck === check) {
        return null
      }
      return suggestions.first().get('checkColor')
    }
  )
}

function makeSelectedCheckSelector(
  applicableSuggestionsSelector,
  selectedSelector,
  matchingSelector
) {
  return reselect.createSelector(
    [
      applicableSuggestionsSelector,
      selectedSelector,
      selectors.value,
      matchingSelector
    ],
    (suggestions, selected, value, matching) => {
      if (matching !== 'done') {
        return null
      }
      if (selected >= 0) {
        const checkColor = suggestions.getIn([selected, 'checkColor'])
        if (checkColor === 'green') {
          return null
        }
        return checkColor
      }
      if (value) {
        return 'red'
      }
    }
  )
}

function makeSkuSelector() {
  return reselect.createSelector(
    [retailerSelector, selectors.value],
    (vendor, part) => immutable.Map({vendor, part})
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

function previewBuySelector(state) {
  return state.view.get('previewBuy')
}

function preferredRetailerSelector(state) {
  return state.view.get('preferredRetailer')
}

function makeRetailersSelector() {
  const purchaseLinesSelector = makePurchaseLinesSelector(
    preferredRetailerSelector,
    selectors.lines,
    previewBuySelector,
    selectors.suggestions
  )
  return reselect.createSelector(
    [selectors.lines, previewBuySelector, purchaseLinesSelector],
    (lines, previewBuy, purchaseLines) => {
      if (previewBuy) {
        return purchaseLines.map(l => l.get('retailers'))
      }
      return lines.map(l => l.get('retailers'))
    }
  )
}

function makeRetailerValueSelector(lineId, field, retailersSelector) {
  const retailer = field.last()
  return reselect.createSelector([retailersSelector], retailers => {
    return retailers.getIn([lineId, retailer])
  })
}

function makeNoneSelectedSelector(lineId, retailersSelector) {
  return reselect.createSelector([retailersSelector], retailers => {
    return !retailers.get(lineId).some(x => x)
  })
}


function mapStateToProps(state, props) {
  const active = selectors.makeActiveSelector()
  const retailers = makeRetailersSelector()
  const value = makeRetailerValueSelector(props.lineId, props.field, retailers)
  const suggestions = makeApplicableSuggestions()
  const selected = makeSelectedSelector(suggestions)
  const matching = selectors.makeSuggestionsMatching()
  const selectedCheck = makeSelectedCheckSelector(suggestions, selected, matching)
  const noneSelected = makeNoneSelectedSelector(props.lineId, retailers)
  const suggestionCheck = makeSuggestionCheckSelector(
    suggestions,
    selected,
    selectedCheck
  )
  const match = makeMatchSelector(suggestions, selectors.value, suggestionCheck)
  return reselect.createSelector(
    [
      value,
      active,
      suggestions,
      match,
      suggestionCheck,
      selectedCheck,
      selected,
      skuPopupExpanded,
      previewBuySelector,
      noneSelected
    ],
    (
      value,
      active,
      suggestions,
      match,
      suggestionCheck,
      selectedCheck,
      selected,
      skuPopupExpanded,
      previewBuy,
      noneSelected
    ) => ({
      value,
      active,
      suggestions,
      match,
      suggestionCheck,
      selectedCheck,
      selected,
      skuPopupExpanded,
      previewBuy,
      noneSelected
    })
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(SkuCell)

import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import immutable from 'immutable'
import oneClickBom from '1-click-bom'

import {actions} from './state'
import {retailerSelectionNumbers, getPurchaseLines} from './bom'

const retailer_list = oneClickBom
  .getRetailers()
  .filter(r => r !== 'Rapid' && r !== 'Newark')

function BuyParts(props) {
  const retailers = props.selectionNumbers
    .sort((a, b) => b - a)
    .map((v, r) => {
      if (v > 0) {
        return (
          <semantic.List.Item key={r}>
            <semantic.List.Header>{r}</semantic.List.Header>
            {v}
          </semantic.List.Item>
        )
      }
    })
    .valueSeq()
    .toJS()
  return (
    <div style={{display: 'flex', alignItems: 'center'}}>
      <div>
        <semantic.Button
          onClick={props.autoFillSuggestions}
          className="buyPartsButton"
          color="green"
          basic
        >
          <semantic.Icon name="magic" />
          Auto Fill
        </semantic.Button>
      </div>
      <div>
        <semantic.Button
          disabled={!props.extensionPresent}
          className="buyPartsButton"
          color={props.extensionPresent ? 'blue' : 'grey'}
          onClick={() => props.setAddingParts('start')}
          basic
        >
          <semantic.Icon name="shopping basket" />
          <semantic.Icon name="plus" />
          Buy Parts
        </semantic.Button>
      </div>
      {props.extensionPresent ? (
        <div
          style={{
            fontWeight: 'normal',
            height: '100%',
            verticalAlign: 'middle',
            color: '#2185D0',
            minWidth: 160
          }}
        >
          Preffered retailer:{'  '}
          <semantic.Dropdown
            inline
            value={props.preferredRetailer}
            options={retailer_list.map(r => ({key: r, text: r, value: r}))}
            onChange={(e, {value}) => props.setPreferredRetailer(value)}
          />{' '}
          <div
            style={{
              fontWeight: 'normal',
              height: '100%',
              verticalAlign: 'middle',
              color: '#2185D0',
              minWidth: 160
            }}
          >
            Preview:
            <semantic.Radio
              toggle
              checked={props.previewBuy}
              onChange={(e, data) => props.setPreviewBuy(data.checked)}
            />
          </div>
        </div>
      ) : (
        <div style={{color: 'lightgrey'}}>
          Install the 1-click BOM exension to use this feature
        </div>
      )}
    </div>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  const extensionPresent = state.view.get('extensionPresent')
  let lines = state.data.present.get('lines')
  const loading = state.suggestions.reduce(
    (prev, s) => prev || s.get('status') === 'loading',
    false
  )
  let selectionNumbers = immutable.Map()
  if (!loading) {
    const purchaseLines = getPurchaseLines(state)
    selectionNumbers = retailerSelectionNumbers(purchaseLines)
  }
  return {
    selectionNumbers,
    extensionPresent,
    preferredRetailer: state.view.get('preferredRetailer'),
    previewBuy: state.view.get('previewBuy')
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(BuyParts)

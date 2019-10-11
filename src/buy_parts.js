import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import oneClickBom from '1-click-bom'
import {useDebouncedCallback} from 'use-debounce'

import {actions} from './state'
import {autoFillSuggestions} from './process_bom'

const retailer_list = oneClickBom
  .getRetailers()
  .filter(r => r !== 'Rapid' && r !== 'Newark')

function BuyParts(props) {
  let [multiplier, setMultiplier] = React.useState(null)
  let [extraPercent, setExtraPercent] = React.useState(null)
  let [autoFilling, setAutoFilling] = React.useState(null)
  const [debouncedSetBuyMultiplier, cancelBuyMultiplierDebounced] = useDebouncedCallback(
    value => {
      props.setBuyMultiplier(parseFloat(value))
    },
    500,
    [1]
  )
  const [debouncedSetBuyExtra, cancelBuyExtraDebounced] = useDebouncedCallback(
    value => {
      props.setBuyExtraPercent(value)
    },
    500,
    [10]
  )
  extraPercent = extraPercent == null ? props.buyExtraPercent : extraPercent
  multiplier = multiplier == null ? props.buyMultiplier : multiplier
  autoFilling =
    autoFilling == null ? props.autoFilling === 'filling' : autoFilling
  return (
    <div style={{display: 'flex', alignItems: 'center', marginRight: 20}}>
      <div>
        <semantic.Popup
          style={{zIndex: 10001}}
          size="mini"
          inverted
          content={
            'Fill in all part suggestions that match an existing selection or' +
            ' match a part from the Common Parts Library'
          }
          trigger={
            <semantic.Button
              loading={autoFilling}
              disabled={!props.canAutoFill}
              color={props.canAutoFill ? 'green' : 'grey'}
              onClick={() => {
                window.nanobar.go(80)
                setAutoFilling(true)
                setTimeout(() => props.setAutoFilling('start'), 10)
                setTimeout(() => setAutoFilling(null), 500)
                window.nanobar.go(100)
              }}
              className="autoFillButton"
              basic
            >
              <div>
                <semantic.Icon name="clone outline" />
                <semantic.Icon name="search" />
                Auto Fill
              </div>
            </semantic.Button>
          }
        />
      </div>
      <div style={{marginLeft: 20, minWidth: 70}}>Buy Parts:</div>
      <div>
        <semantic.Button
          disabled={!(props.previewBuy && props.extensionPresent)}
          loading={props.clearingCarts === 'clearing'}
          className="clearButton"
          color={props.previewBuy && props.extensionPresent ? 'black' : 'grey'}
          onClick={() => props.setClearingCarts('start')}
          basic
        >
          <semantic.Icon name="shopping basket" />
          <semantic.Icon name="delete" />
          Clear
        </semantic.Button>
      </div>
      <div style={{paddingRight: 4}}>
        <semantic.Popup
          style={{zIndex: 10001}}
          size="mini"
          inverted
          content={
            'Fill shopping carts with this BOM using your preferred ' +
            'retailer stock and as few additional retailers as possible.'
          }
          trigger={
            <semantic.Button
              disabled={!props.extensionPresent || !props.previewBuy}
              loading={props.addingParts === 'adding'}
              className="buyPartsButton"
              color={
                props.extensionPresent && props.previewBuy ? 'blue' : 'grey'
              }
              onClick={() => props.setAddingParts('start')}
              basic
            >
              <div>
                <semantic.Icon name="shopping basket" />
                <semantic.Icon name="plus" />
                Add
              </div>
            </semantic.Button>
          }
        />
      </div>
      {props.extensionPresent ? (
        <>
          <div
            style={{
              minWidth: 100,
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                color: props.previewBuy ? '#2185d0' : 'lightgrey'
              }}
            >
              <semantic.Icon name="delete" />
            </div>
            <div>
              <semantic.Input
                className="buyMultiplierInput"
                style={{minWidth: 90}}
                type="number"
                value={multiplier}
                disabled={!props.previewBuy}
                onChange={e => {
                  cancelBuyMultiplierDebounced()
                  setMultiplier(parseFloat(e.target.value))
                  debouncedSetBuyMultiplier(e.target.value)
                }}
                onBlur={e => {
                  cancelBuyMultiplierDebounced()
                  props.setBuyMultiplier(parseFloat(e.target.value))
                  setMultiplier(null)
                }}
                onKeyDown={e => {
                  if (e.which === 13) {
                    // enter key is pressed
                    e.target.blur()
                  }
                }}
              />
            </div>
          </div>
          <div
            style={{
              minWidth: 140,
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                color: props.previewBuy ? '#2185d0' : 'lightgrey'
              }}
            >
              <semantic.Icon name="plus" />
            </div>
            <div>
              <semantic.Input
                className="buyMultiplierInput"
                style={{minWidth: 90}}
                type="number"
                value={extraPercent}
                disabled={!props.previewBuy}
                onChange={e => {
                  cancelBuyExtraDebounced()
                  setExtraPercent(e.target.value)
                  debouncedSetBuyExtra(e.target.value)
                }}
                onBlur={e => {
                  cancelBuyExtraDebounced()
                  props.setBuyExtraPercent(e.target.value)
                  setExtraPercent(null)
                }}
                onKeyDown={e => {
                  if (e.which === 13) {
                    // enter key is pressed
                    e.target.blur()
                  }
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                color: props.previewBuy ? '#2185d0' : 'lightgrey',
                marginLeft: 5,
              }}
            >
              <semantic.Icon name="percent" />
            </div>
          </div>
          <div
            style={{
              color: props.previewBuy ? '#2185d0' : '',
              marginLeft: 10
            }}
          >
            Preferred retailer:
            <semantic.Dropdown
              inline
              style={{marginLeft: 3}}
              disabled={!props.previewBuy}
              value={props.preferredRetailer}
              options={retailer_list.map(r => ({key: r, text: r, value: r}))}
              onChange={(e, {value}) => props.setPreferredRetailer(value)}
            />
          </div>
        </>
      ) : (
        <div style={{color: 'lightgrey', maxHeight: 38}}>
          Please install the{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            style={{color: 'grey'}}
            href="https://1clickBOM.com"
          >
            1-click BOM exension
          </a>{' '}
          to use this feature
        </div>
      )}
    </div>
  )
}

function hasAutoFill(state) {
  const newState = autoFillSuggestions(state)
  return !state.data.present
    .get('lines')
    .equals(newState.data.present.get('lines'))
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  const extensionPresent = state.view.get('extensionPresent')
  return {
    extensionPresent,
    preferredRetailer: state.view.get('preferredRetailer'),
    addingParts: state.view.get('addingParts'),
    clearingCarts: state.view.get('clearingCarts'),
    autoFilling: state.view.get('autoFilling'),
    buyMultiplier: state.view.get('buyMultiplier'),
    buyExtraPercent: state.view.get('buyExtraPercent'),
    canAutoFill: hasAutoFill(state),
    previewBuy: state.view.get('previewBuy')
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(BuyParts)

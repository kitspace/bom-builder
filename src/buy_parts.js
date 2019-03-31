import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import oneClickBom from '1-click-bom'

import {actions} from './state'

const retailer_list = oneClickBom
  .getRetailers()
  .filter(r => r !== 'Rapid' && r !== 'Newark')

function BuyParts(props) {
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
              onClick={() => {
                window.nanobar.go(80)
                setTimeout(props.autoFillSuggestions, 0)
                window.nanobar.go(100)
              }}
              className="buyPartsButton"
              color="green"
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
      <div>
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
              disabled={!props.extensionPresent}
              loading={props.addingParts === 'adding'}
              className="buyPartsButton"
              color={props.extensionPresent ? 'blue' : 'grey'}
              onClick={() => props.setAddingParts('start')}
              basic
            >
              <div style={{width: 100}}>
                <semantic.Icon name="shopping basket" />
                <semantic.Icon name="plus" />
                Buy Parts
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
              justifyContent: 'flex-end',
              marginRight: 20
            }}
          >
            <div
              style={{display: 'flex', alignItems: 'center', color: '#2185d0'}}
            >
              <semantic.Icon name="delete" />
            </div>
            <div>
              <semantic.Input
                className="buyMultiplierInput"
                style={{minWidth: 90}}
                type="number"
                defaultValue={1}
              />
            </div>
          </div>
          <div
            style={{
              fontWeight: 'normal',
              height: '100%',
              verticalAlign: 'middle',
              color: '#2185D0',
              minWidth: 315
            }}
          >
            Preferred retailer:{'  '}
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
                color: '#2185D0 !important',
                minWidth: 160,
                display: 'flex',
                marginTop: 5
              }}
            >
              <div style={{marginRight: 5}}> Preview: </div>
              <semantic.Popup
                style={{zIndex: 10001}}
                size="mini"
                inverted
                content={
                  'Preview which retailer parts will be selected ' +
                  'to fill shopping carts'
                }
                verticalOffset={-20}
                trigger={
                  <semantic.Radio
                    toggle
                    checked={props.previewBuy}
                    onChange={(e, data) => props.setPreviewBuy(data.checked)}
                  />
                }
              />
            </div>
          </div>
        </>
      ) : (
        <div style={{color: 'lightgrey', minWidth: 352}}>
          Please install the{' '}
          <a style={{color: 'grey'}} href="https://1clickBOM.com">
            1-click BOM exension
          </a>{' '}
          to use this feature
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
  return {
    extensionPresent,
    preferredRetailer: state.view.get('preferredRetailer'),
    addingParts: state.view.get('addingParts'),
    previewBuy: state.view.get('previewBuy')
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(BuyParts)

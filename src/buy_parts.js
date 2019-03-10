import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import immutable from 'immutable'
import oneClickBom from '1-click-bom'

import {actions} from './state'

const retailer_list = oneClickBom
  .getRetailers()
  .filter(r => r !== 'Rapid' && r !== 'Newark')

function BuyParts(props) {
  const messages = props.buyPartsMessages.map(message => {
    const vendor = message.getIn(['sku', 'vendor'])
    const title = `Problem with adding part to ${vendor} cart`
    const part = message.getIn(['sku', 'part'])
    if (part == null) {
      return (
        <semantic.Message key={title} negative>
          <semantic.Message.Header>{title}</semantic.Message.Header>
        </semantic.Message>
      )
    }
    let reference = message.get('reference')
    if (reference.length > 20) {
      reference = reference.slice(0, 20) + '...'
    }
    const messageBody = `"${reference}": ${part}`
    return (
      <semantic.Message key={title + messageBody} negative>
        <semantic.Message.Header>{title}</semantic.Message.Header>
        {messageBody}
      </semantic.Message>
    )
  })

  return (
    <div style={{display: 'flex', alignItems: 'center', marginRight: 20}}>
      <div>
        <semantic.Popup
          style={{zIndex: 10001}}
          size="mini"
          inverted
          content={
            'Fill in all retailer part suggestions that match an' +
            ' existing selection or match a part from the Common Parts Library'
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
          content="Fill shopping carts with this BOM using your preferred retailer stock and as few additional retailers as possible."
          trigger={
            <semantic.Button
              disabled={!props.extensionPresent}
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
        <div
          style={{
            fontWeight: 'normal',
            height: '100%',
            verticalAlign: 'middle',
            color: '#2185D0',
            minWidth: 315
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
              content="Preview which retailer parts will be selected to fill shopping carts"
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
      ) : (
        <div style={{color: 'lightgrey', minWidth: 352}}>
          Please install the{' '}
          <a style={{color: 'grey'}} href="https://1clickBOM.com">
            1-click BOM exension
          </a>{' '}
          to use this feature
        </div>
      )}
      {messages}
    </div>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  const extensionPresent = state.view.get('extensionPresent')
  let selectionNumbers = immutable.Map()
  return {
    selectionNumbers,
    extensionPresent,
    preferredRetailer: state.view.get('preferredRetailer'),
    previewBuy: state.view.get('previewBuy'),
    buyPartsMessages: state.view.get('buyPartsMessages')
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(BuyParts)

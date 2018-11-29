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
    <tr style={{height: 40}}>
      <th colSpan={4} />
      <th colSpan={props.partNumberColumns || 1} />
      <th colSpan="100%">
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
                defaultValue="Farnell"
                options={retailer_list.map(r => ({key: r, text: r, value: r}))}
              />{' '}
            </div>
          ) : (
            <div style={{color: 'lightgrey'}}>
              Install the 1-click BOM exension to use this feature
            </div>
          )}
        </div>
      </th>
    </tr>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  const extensionPresent = state.view.get('extensionPresent')
  return {
    extensionPresent
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(BuyParts)

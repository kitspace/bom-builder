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
            <semantic.Button className="buyPartsButton" color="blue" basic>
              <semantic.Icon name="shopping basket" />
              <semantic.Icon name="plus" />
              Buy Parts
            </semantic.Button>
          </div>
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
            />
          </div>
        </div>
      </th>
    </tr>
  )
}

export default BuyParts

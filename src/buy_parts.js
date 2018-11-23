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
      <th colSpan={5} />
      <th colSpan="100%">
        <div style={{display: 'flex', alignItems: 'center'}}>
          <div>
            <semantic.Button className="buyPartsButton" color="green" basic>
              <semantic.Icon name="magic" />
              <semantic.Icon name="check" />
              Auto Fill
            </semantic.Button>
          </div>
          <div>
            <semantic.Button color="blue" basic className="buyPartsButton">
              <semantic.Icon name="shopping basket"/>
              <semantic.Icon name="plus"/>
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
